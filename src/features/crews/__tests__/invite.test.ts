import { LINK_HOST, joinCrewLink } from '@/lib/links';

describe('joinCrewLink', () => {
  it('is an https link, so a messages app will make it tappable', () => {
    // The whole point of the change: `pullup://` arrives as grey text.
    expect(joinCrewLink('K7Q2MX')).toMatch(/^https:\/\//);
  });

  it('points at the associated domain, which is what lets iOS skip the browser', () => {
    expect(joinCrewLink('K7Q2MX')).toBe(`https://${LINK_HOST}/join?c=K7Q2MX`);
  });

  it('escapes anything that would break out of the query param', () => {
    expect(joinCrewLink('A B&c=d')).toBe(`https://${LINK_HOST}/join?c=A%20B%26c%3Dd`);
  });
});
