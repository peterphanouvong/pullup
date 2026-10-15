/** Programme day names lead with their weekday ("Mon — Lower power"). Any
 * surface that stamps the weekday itself strips the prefix, so the day isn't
 * said twice — and can't contradict the stamp, as on a share card dated the
 * day the session was actually finished. */
export function stripWeekdayPrefix(name: string): string {
  return name.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[—–-]\s*/i, '');
}
