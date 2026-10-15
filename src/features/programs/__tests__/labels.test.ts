import { stripWeekdayPrefix } from '../labels';

describe('stripWeekdayPrefix', () => {
  it('strips the weekday and its dash, long or short, any dash', () => {
    expect(stripWeekdayPrefix('Mon — Lower power + sprints')).toBe('Lower power + sprints');
    expect(stripWeekdayPrefix('Thursday – Upper push')).toBe('Upper push');
    expect(stripWeekdayPrefix('sat - Court')).toBe('Court');
  });

  it('leaves names that do not lead with a weekday alone', () => {
    expect(stripWeekdayPrefix('Lower strength')).toBe('Lower strength');
    expect(stripWeekdayPrefix('Monday morning flush')).toBe('Monday morning flush');
  });
});
