/**
 * Placeholder resolver.
 *
 * Nothing in VESPER is ever allowed to render an empty box: any series,
 * episode or banner without its own artwork is mapped — deterministically,
 * by id hash — onto one of the shipped assets in /public. The same id always
 * resolves to the same picture, so lists stay visually stable across reloads.
 */

export const COVER_ASSETS: string[] = [
  "/covers/after-dark.jpg",
  "/covers/blood-oath.jpg",
  "/covers/boardroom-queen.jpg",
  "/covers/candlelight-confessions.jpg",
  "/covers/cathedral-vows.jpg",
  "/covers/city-lights-confession.jpg",
  "/covers/code-blue.jpg",
  "/covers/cold-pursuit.jpg",
  "/covers/crown-of-thorns.jpg",
  "/covers/cursed-by-the-moon.jpg",
  "/covers/desert-rose.jpg",
  "/covers/ember-dancer.jpg",
  "/covers/empress-in-exile.jpg",
  "/covers/first-love-second-chance.jpg",
  "/covers/fragments-of-her.jpg",
  "/covers/golden-hour-lies.jpg",
  "/covers/her-silent-revenge.jpg",
  "/covers/midnight-vows.jpg",
  "/covers/mothers-promise.jpg",
  "/covers/neighbor-in-4b.jpg",
  "/covers/one-more-summer.jpg",
  "/covers/rain-on-fifth.jpg",
  "/covers/scar-tissue.jpg",
  "/covers/second-chance-city.jpg",
  "/covers/sisters-of-the-night.jpg",
  "/covers/smoke-and-shadows.jpg",
  "/covers/spotlight.jpg",
  "/covers/steel-and-silk.jpg",
  "/covers/storm-watch.jpg",
  "/covers/swan-song.jpg",
  "/covers/the-dons-daughter.jpg",
  "/covers/the-gilded-cage.jpg",
  "/covers/the-homecoming.jpg",
  "/covers/the-last-heir.jpg",
  "/covers/the-masked-stranger.jpg",
  "/covers/the-quiet-room.jpg",
  "/covers/the-runaway-bride.jpg",
  "/covers/the-sultans-blade.jpg",
  "/covers/written-in-the-stars.jpg"
];

export const HERO_ASSETS: string[] = [
  "/hero/moonlit-forest.jpg",
  "/hero/neon-district.jpg",
  "/hero/night-city.jpg",
  "/hero/penthouse.jpg",
  "/hero/red-carpet.jpg"
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Existing artwork wins; otherwise a stable pick from the shipped covers. */
export function placeholderCover(seed: string): string {
  return COVER_ASSETS[hash("cover:" + seed) % COVER_ASSETS.length];
}

export function placeholderHero(seed: string): string {
  return HERO_ASSETS[hash("hero:" + seed) % HERO_ASSETS.length];
}

export function coverOr(url: string | null | undefined, seed: string): string {
  return url && url.trim() ? url : placeholderCover(seed);
}

export function heroOr(url: string | null | undefined, seed: string): string {
  return url && url.trim() ? url : placeholderHero(seed);
}

/** Poster for an episode: its own, else the series cover, else a placeholder. */
export function posterOr(episodePoster: string | null | undefined, seriesCover: string | null | undefined, seed: string): string {
  return episodePoster?.trim() || seriesCover?.trim() || placeholderCover(seed);
}
