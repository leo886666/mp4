import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function money(n: number): string {
  return "$" + n.toFixed(2);
}

export const EPISODE_TITLES = [
  "The Encounter", "Cold Water", "The Invitation", "Behind the Door", "Broken Glass",
  "The Offer", "Second Thoughts", "Name Day", "The Gala", "What She Saw",
  "The Photograph", "Old Money", "The Letter", "Intermission", "Black Car",
  "The Test", "Quiet Rooms", "The Fall", "Ashes", "The Return",
  "Long Night", "The Verdict", "Homecoming", "The Truth", "New Dawn",
  "Last Dance", "The Choice", "Silk and Salt", "Undertow", "The Reckoning",
];

export function episodeTitle(n: number): string {
  return EPISODE_TITLES[(n - 1) % EPISODE_TITLES.length];
}

export function episodeDuration(n: number): string {
  const base = 62 + ((n * 37) % 90); // 62–151s, deterministic
  return `${Math.floor(base / 60)}:${String(base % 60).padStart(2, "0")}`;
}
