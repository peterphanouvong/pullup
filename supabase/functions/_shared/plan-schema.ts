/**
 * The shape of a proposed programme, shared by the `plan` edge function
 * (which validates what the model returns) and the app (which validates
 * again before applying, and renders the proposal).
 *
 * Deliberately dependency-free and plain TypeScript: Deno imports it with a
 * `.ts` extension, Metro and Jest without one, and neither needs anything
 * else from the other side.
 *
 * Positions aren't part of the plan: order is the array order, and the
 * `apply_program_plan` RPC numbers rows from 1 as it writes them.
 */

export type PlanDayKind = 'lifting' | 'court' | 'rest' | 'comp';

export const PLAN_DAY_KINDS: readonly PlanDayKind[] = ['lifting', 'court', 'rest', 'comp'];

/** How the exercise is logged: KG + REPS, REPS only, or TIME. */
export type PlanLogType = 'weight_reps' | 'reps' | 'duration';

export const PLAN_LOG_TYPES: readonly PlanLogType[] = ['weight_reps', 'reps', 'duration'];

export interface PlanExercise {
  exercise_name: string;
  sets: number | null;
  /** Free text so "3-5", "AMRAP" and "8/side" all fit. */
  reps: string | null;
  load: string | null;
  notes: string | null;
  /** Optional so plans written before it existed still validate. */
  log?: PlanLogType;
}

export interface PlanDay {
  /** Weekday-prefixed, the way the seeded programme names days ("Mon — Lower power"). */
  name: string;
  kind: PlanDayKind;
  notes: string | null;
  exercises: PlanExercise[];
}

export interface PlanWeek {
  name: string;
  phase: string;
  description: string | null;
  /** Exactly seven, Monday to Sunday. */
  days: PlanDay[];
}

export interface ProgramPlan {
  name: string;
  summary: string;
  /** Markdown: the overview a user reads on the programme screen. */
  description: string;
  weeks: PlanWeek[];
}

/** Hard limits: what the week grid can show, and what one model call can
 * reliably write. */
export const PLAN_MAX_WEEKS = 8;
export const PLAN_DAYS_PER_WEEK = 7;
const MAX_EXERCISES_PER_DAY = 14;
const MAX_NAME = 80;
const MAX_TEXT = 400;

/** JSON Schema for the model's structured output. Mirrors the types above;
 * keep the two in step. */
export const PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'summary', 'description', 'weeks'],
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'phase', 'description', 'days'],
        properties: {
          name: { type: 'string' },
          phase: { type: 'string' },
          description: { type: ['string', 'null'] },
          days: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'kind', 'notes', 'exercises'],
              properties: {
                name: { type: 'string' },
                kind: { type: 'string', enum: [...PLAN_DAY_KINDS] },
                notes: { type: ['string', 'null'] },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['exercise_name', 'sets', 'reps', 'load', 'notes', 'log'],
                    properties: {
                      exercise_name: { type: 'string' },
                      log: { type: 'string', enum: [...PLAN_LOG_TYPES] },
                      sets: { type: ['integer', 'null'] },
                      reps: { type: ['string', 'null'] },
                      load: { type: ['string', 'null'] },
                      notes: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type PlanCheck = { ok: true; plan: ProgramPlan } | { ok: false; reason: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

function optionalText(v: unknown, max: number): v is string | null {
  return v === null || (typeof v === 'string' && v.length <= max);
}

/**
 * Checks a plan the way the database will see it, so a bad proposal is
 * caught with a readable reason instead of a constraint error halfway
 * through a transaction. Returns the same object, typed, when it passes.
 */
export function validatePlan(value: unknown): PlanCheck {
  if (!isRecord(value)) return { ok: false, reason: 'plan is not an object' };
  if (!text(value.name, MAX_NAME)) return { ok: false, reason: 'programme needs a name' };
  if (!text(value.summary, MAX_TEXT)) return { ok: false, reason: 'programme needs a summary' };
  if (typeof value.description !== 'string') return { ok: false, reason: 'programme needs a description' };
  if (!Array.isArray(value.weeks) || value.weeks.length === 0) return { ok: false, reason: 'programme has no weeks' };
  if (value.weeks.length > PLAN_MAX_WEEKS) return { ok: false, reason: `more than ${PLAN_MAX_WEEKS} weeks` };

  for (const [wi, week] of value.weeks.entries()) {
    const where = `week ${wi + 1}`;
    if (!isRecord(week)) return { ok: false, reason: `${where} is not an object` };
    if (!text(week.name, MAX_NAME)) return { ok: false, reason: `${where} needs a name` };
    if (!text(week.phase, MAX_NAME)) return { ok: false, reason: `${where} needs a phase` };
    if (!optionalText(week.description, 4000)) return { ok: false, reason: `${where} description is too long` };
    if (!Array.isArray(week.days) || week.days.length !== PLAN_DAYS_PER_WEEK) {
      return { ok: false, reason: `${where} must have exactly ${PLAN_DAYS_PER_WEEK} days` };
    }
    for (const [di, day] of week.days.entries()) {
      const dayWhere = `${where} day ${di + 1}`;
      if (!isRecord(day)) return { ok: false, reason: `${dayWhere} is not an object` };
      if (!text(day.name, MAX_NAME)) return { ok: false, reason: `${dayWhere} needs a name` };
      if (!PLAN_DAY_KINDS.includes(day.kind as PlanDayKind)) return { ok: false, reason: `${dayWhere} has an unknown kind` };
      if (!optionalText(day.notes, MAX_TEXT)) return { ok: false, reason: `${dayWhere} notes are too long` };
      if (!Array.isArray(day.exercises)) return { ok: false, reason: `${dayWhere} has no exercise list` };
      if (day.exercises.length > MAX_EXERCISES_PER_DAY) return { ok: false, reason: `${dayWhere} has too many exercises` };
      if (day.kind === 'lifting' && day.exercises.length === 0) {
        return { ok: false, reason: `${dayWhere} is a lifting day with no exercises` };
      }
      for (const [ei, ex] of day.exercises.entries()) {
        const exWhere = `${dayWhere} exercise ${ei + 1}`;
        if (!isRecord(ex)) return { ok: false, reason: `${exWhere} is not an object` };
        if (!text(ex.exercise_name, MAX_NAME)) return { ok: false, reason: `${exWhere} needs a name` };
        if (!(ex.sets === null || (Number.isInteger(ex.sets) && (ex.sets as number) > 0 && (ex.sets as number) <= 20))) {
          return { ok: false, reason: `${exWhere} has a bad set count` };
        }
        if (!optionalText(ex.reps, MAX_NAME) || !optionalText(ex.load, MAX_NAME) || !optionalText(ex.notes, MAX_TEXT)) {
          return { ok: false, reason: `${exWhere} has a field that is too long` };
        }
        if (ex.log !== undefined && !PLAN_LOG_TYPES.includes(ex.log as PlanLogType)) {
          return { ok: false, reason: `${exWhere} has an unknown log type` };
        }
      }
    }
  }
  return { ok: true, plan: value as unknown as ProgramPlan };
}
