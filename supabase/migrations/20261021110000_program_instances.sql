-- Templates vs instances.
--
-- Until now every user pointed at the same shared programme rows, so nothing
-- about a programme could be personal. From here a programme is either a
-- template (owner_id null: the catalogue, seeded by migration) or an instance
-- (owner_id set: one user's private copy, made when they select a template).
-- Edits, manual or AI-assisted, happen on instances; templates stay pristine.
-- See docs/ai-programming.md.

alter table public.programs
  add column owner_id uuid references auth.users(id) on delete cascade,
  add column template_id uuid references public.programs(id) on delete set null;

comment on column public.programs.owner_id is
  'Null for a catalogue template; the owning user for a personal instance.';
comment on column public.programs.template_id is
  'For an instance, the template it was copied from (null if made from scratch).';

-- Slugs only need to be unique among templates: every instance keeps its
-- template's slug.
alter table public.programs drop constraint programs_slug_key;
create unique index programs_template_slug on public.programs (slug) where owner_id is null;
create index programs_owner_idx on public.programs (owner_id) where owner_id is not null;

-- ============================================================
-- Visibility: templates to everyone signed in, instances to their owner.
-- Writes: owner only, down the whole tree.
-- ============================================================
create or replace function public.program_readable(p_program_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program_id and (p.owner_id is null or p.owner_id = (select auth.uid()))
  );
$$;

create or replace function public.program_editable(p_program_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program_id and p.owner_id is not null and p.owner_id = (select auth.uid())
  );
$$;

create or replace function public.week_program_id(p_week_id uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select program_id from public.program_weeks where id = p_week_id;
$$;

create or replace function public.day_program_id(p_day_id uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select pw.program_id from public.program_days pd
  join public.program_weeks pw on pw.id = pd.week_id
  where pd.id = p_day_id;
$$;

grant execute on function public.program_readable(uuid), public.program_editable(uuid),
  public.week_program_id(uuid), public.day_program_id(uuid) to authenticated;

drop policy "programs readable by authenticated" on public.programs;
drop policy "weeks readable by authenticated" on public.program_weeks;
drop policy "days readable by authenticated" on public.program_days;
drop policy "exercises readable by authenticated" on public.day_exercises;

create policy "programs: templates and own instances"
  on public.programs for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "programs: own insert"
  on public.programs for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "programs: own update"
  on public.programs for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "programs: own delete"
  on public.programs for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "weeks: readable programmes"
  on public.program_weeks for select to authenticated
  using (public.program_readable(program_id));
create policy "weeks: own programmes"
  on public.program_weeks for all to authenticated
  using (public.program_editable(program_id)) with check (public.program_editable(program_id));

create policy "days: readable programmes"
  on public.program_days for select to authenticated
  using (public.program_readable(public.week_program_id(week_id)));
create policy "days: own programmes"
  on public.program_days for all to authenticated
  using (public.program_editable(public.week_program_id(week_id)))
  with check (public.program_editable(public.week_program_id(week_id)));

create policy "exercises: readable programmes"
  on public.day_exercises for select to authenticated
  using (public.program_readable(public.day_program_id(day_id)));
create policy "exercises: own programmes"
  on public.day_exercises for all to authenticated
  using (public.program_editable(public.day_program_id(day_id)))
  with check (public.program_editable(public.day_program_id(day_id)));

-- ============================================================
-- Copying and selecting
-- ============================================================

-- Deep-copies a programme (weeks, days, exercises) into a new one owned by
-- p_owner. Internal: called by select_program and by backfills, never by
-- clients directly.
create or replace function public.copy_program(p_source_id uuid, p_owner uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_new uuid;
  v_week uuid;
  v_day uuid;
  w record;
  d record;
begin
  insert into public.programs (slug, name, summary, description, owner_id, template_id)
  select slug, name, summary, description, p_owner, coalesce(template_id, id)
  from public.programs where id = p_source_id
  returning id into v_new;
  if v_new is null then
    raise exception 'programme % not found', p_source_id;
  end if;

  for w in select * from public.program_weeks where program_id = p_source_id order by position loop
    insert into public.program_weeks (program_id, position, name, phase, description)
    values (v_new, w.position, w.name, w.phase, w.description)
    returning id into v_week;
    for d in select * from public.program_days where week_id = w.id order by position loop
      insert into public.program_days (week_id, position, name, kind, notes)
      values (v_week, d.position, d.name, d.kind, d.notes)
      returning id into v_day;
      insert into public.day_exercises (day_id, position, exercise_name, exercise_id, sets, reps, load, notes)
      select v_day, position, exercise_name, exercise_id, sets, reps, load, notes
      from public.day_exercises where day_id = d.id;
    end loop;
  end loop;
  return v_new;
end;
$$;
revoke execute on function public.copy_program(uuid, uuid) from public, anon, authenticated;

-- Selecting a template gives the caller a fresh private instance of it and
-- makes that their active programme. Re-selecting makes another fresh copy:
-- "start again" is the intent when you pick a programme twice.
create or replace function public.select_program(p_template_id uuid, p_start_date date)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_instance uuid;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from public.programs where id = p_template_id and owner_id is null) then
    raise exception 'not a template programme';
  end if;
  v_instance := public.copy_program(p_template_id, v_uid);
  insert into public.user_programs (user_id, program_id, selected_at, start_date)
  values (v_uid, v_instance, now(), p_start_date)
  on conflict (user_id) do update
    set program_id = excluded.program_id, selected_at = excluded.selected_at, start_date = excluded.start_date;
  return v_instance;
end;
$$;
grant execute on function public.select_program(uuid, date) to authenticated;

-- ============================================================
-- Backfill: everyone currently on a template gets their own instance of
-- it, and the workouts they've logged against template days move to the
-- matching instance days so week completion carries over.
-- ============================================================
do $$
declare
  r record;
  v_new uuid;
begin
  for r in
    select up.user_id, up.program_id
    from public.user_programs up
    join public.programs p on p.id = up.program_id
    where p.owner_id is null
  loop
    v_new := public.copy_program(r.program_id, r.user_id);
    update public.workouts w
    set program_day_id = nd.id
    from public.program_days od
    join public.program_weeks ow on ow.id = od.week_id
    join public.program_weeks nw on nw.program_id = v_new and nw.position = ow.position
    join public.program_days nd on nd.week_id = nw.id and nd.position = od.position
    where w.user_id = r.user_id
      and w.program_day_id = od.id
      and ow.program_id = r.program_id;
    update public.user_programs set program_id = v_new where user_id = r.user_id;
  end loop;
end $$;
