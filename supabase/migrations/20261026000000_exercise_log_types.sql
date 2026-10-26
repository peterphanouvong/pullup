-- How each exercise is logged: KG and REPS, REPS only, or TIME
-- (src/features/workouts/log-type.ts). Sprints were showing KG/REPS because
-- the type was only ever guessed from the prescription text.
--
--   * day_exercises.log_type: set by the coach when it writes a plan, or by
--     "Log as…" in a live workout. Null means the app infers it.
--   * workout_exercises.log_type: what the live set table shows; stamped
--     when a workout starts, changeable mid-workout. Null on older rows,
--     which the app reads the old way.
--
-- apply_program_plan is replaced to write the plan's `log` field.

alter table public.day_exercises
  add column log_type text check (log_type in ('weight_reps', 'reps', 'duration'));

alter table public.workout_exercises
  add column log_type text check (log_type in ('weight_reps', 'reps', 'duration'));

create or replace function public.apply_program_plan(
  p_program_id uuid,
  p_plan jsonb,
  p_start_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_program uuid := p_program_id;
  v_week_count int;
  v_week jsonb;
  v_week_id uuid;
  v_day jsonb;
  v_day_id uuid;
  v_ex jsonb;
  wi int;
  di int;
  ei int;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_plan -> 'weeks') <> 'array' or jsonb_array_length(p_plan -> 'weeks') = 0 then
    raise exception 'plan has no weeks';
  end if;
  if jsonb_array_length(p_plan -> 'weeks') > 8 then
    raise exception 'plan has more than 8 weeks';
  end if;
  v_week_count := jsonb_array_length(p_plan -> 'weeks');

  if v_program is null then
    insert into public.programs (slug, name, summary, description, owner_id, template_id, brief)
    values (
      coalesce(p_plan ->> 'slug', 'custom-' || left(replace(gen_random_uuid()::text, '-', ''), 8)),
      p_plan ->> 'name',
      p_plan ->> 'summary',
      coalesce(p_plan ->> 'description', ''),
      v_uid,
      nullif(p_plan ->> 'template_id', '')::uuid,
      p_plan -> 'brief'
    )
    returning id into v_program;

    insert into public.user_programs (user_id, program_id, selected_at, start_date)
    values (v_uid, v_program, now(), coalesce(p_start_date, date_trunc('week', current_date)::date))
    on conflict (user_id) do update
      set program_id = excluded.program_id, selected_at = excluded.selected_at, start_date = excluded.start_date;
  else
    if not exists (select 1 from public.programs where id = v_program and owner_id = v_uid) then
      raise exception 'not your programme' using errcode = '42501';
    end if;
    update public.programs
    set name = coalesce(p_plan ->> 'name', name),
        summary = coalesce(p_plan ->> 'summary', summary),
        description = coalesce(p_plan ->> 'description', description),
        brief = coalesce(p_plan -> 'brief', brief)
    where id = v_program;
    -- Weeks the plan no longer has, and everything under them.
    delete from public.program_weeks where program_id = v_program and position > v_week_count;
  end if;

  wi := 0;
  for v_week in select * from jsonb_array_elements(p_plan -> 'weeks') loop
    wi := wi + 1;
    if jsonb_typeof(v_week -> 'days') <> 'array' or jsonb_array_length(v_week -> 'days') <> 7 then
      raise exception 'week % must have exactly 7 days', wi;
    end if;

    select id into v_week_id from public.program_weeks where program_id = v_program and position = wi;
    if v_week_id is null then
      insert into public.program_weeks (program_id, position, name, phase, description)
      values (v_program, wi, v_week ->> 'name', v_week ->> 'phase', v_week ->> 'description')
      returning id into v_week_id;
    else
      update public.program_weeks
      set name = v_week ->> 'name', phase = v_week ->> 'phase', description = v_week ->> 'description'
      where id = v_week_id;
    end if;

    di := 0;
    for v_day in select * from jsonb_array_elements(v_week -> 'days') loop
      di := di + 1;
      select id into v_day_id from public.program_days where week_id = v_week_id and position = di;
      if v_day_id is null then
        insert into public.program_days (week_id, position, name, kind, notes)
        values (v_week_id, di, v_day ->> 'name', v_day ->> 'kind', v_day ->> 'notes')
        returning id into v_day_id;
      else
        update public.program_days
        set name = v_day ->> 'name', kind = v_day ->> 'kind', notes = v_day ->> 'notes'
        where id = v_day_id;
      end if;

      -- Exercise rows carry nothing that points at them, so replacing is
      -- simpler than matching.
      delete from public.day_exercises where day_id = v_day_id;
      ei := 0;
      for v_ex in select * from jsonb_array_elements(coalesce(v_day -> 'exercises', '[]'::jsonb)) loop
        ei := ei + 1;
        insert into public.day_exercises (day_id, position, exercise_name, exercise_id, sets, reps, load, notes, log_type)
        values (
          v_day_id,
          ei,
          v_ex ->> 'exercise_name',
          (select e.id from public.exercises e
             where e.owner_id is null and not e.deleted
               and lower(e.name) = lower(v_ex ->> 'exercise_name')
             limit 1),
          (v_ex ->> 'sets')::int,
          v_ex ->> 'reps',
          v_ex ->> 'load',
          v_ex ->> 'notes',
          -- An unknown value is dropped rather than failing the whole plan;
          -- the app infers a type for a null.
          case when v_ex ->> 'log' in ('weight_reps', 'reps', 'duration') then v_ex ->> 'log' end
        );
      end loop;
    end loop;
  end loop;

  return v_program;
end;
$$;

revoke execute on function public.apply_program_plan(uuid, jsonb, date) from public, anon;
grant execute on function public.apply_program_plan(uuid, jsonb, date) to authenticated;
