/**
 * Outbound links that have to survive leaving the app — a crew invite in a
 * text message, say.
 *
 * `pullup://` works once the app is installed, but Messages, WhatsApp and
 * Instagram won't make a custom scheme tappable: it arrives as plain grey
 * text. An https link is linkified everywhere, and iOS hands it straight to
 * the app (no browser bounce) because the domain below is an associated
 * domain — see `ios.associatedDomains` in app.json and the
 * apple-app-site-association file served from `web/`.
 *
 * Changing this host means re-shipping the app: iOS only re-fetches the
 * association file on install or App Store update.
 */
export const LINK_HOST = 'peterphanouvong-pullup.expo.app';

const BASE = `https://${LINK_HOST}`;

/** A crew invite. The code rides in a query param rather than the path
 * because the landing page is a single static file — one `/join` document
 * answers for every code, with no server to route on. */
export function joinCrewLink(code: string): string {
  return `${BASE}/join?c=${encodeURIComponent(code)}`;
}
