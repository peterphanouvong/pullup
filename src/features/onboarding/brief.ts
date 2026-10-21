/** The interview answers, shared with the `plan` edge function. */
export type {
  BriefKey,
  Equipment,
  Experience,
  Goal,
  Limitation,
  Obstacle,
  Sacrifice,
  Season,
  Sport,
  TrainingBrief,
} from '../../../supabase/functions/_shared/brief';
export { BRIEF_KEYS, BRIEF_NOTE_MAX, briefToProse, isBrief } from '../../../supabase/functions/_shared/brief';
