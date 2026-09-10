/**
 * Client-facing types. These mirror exactly what the API returns
 * (see lib/server/dto.ts) so a component never has to know about SQL columns.
 */

export type GenreId = string;

export interface Genre {
  id: GenreId;
  name: string;
  count?: number;
}

/** A series as served by /api/series, /api/home and /api/series/[id]. */
export interface Drama {
  id: string;
  title: string;
  genre: GenreId;
  genreName: string;
  tags: string[];
  cover: string;
  hero?: string;
  rating: number;
  views: number;
  likes?: number;
  favorites?: number;
  episodes: number;
  freeEpisodes: number;
  status: "Ongoing" | "Completed";
  publishState?: "draft" | "review" | "published" | "rejected" | "offline";
  updatedLabel: string;
  synopsis: string;
  creator: string;
  creatorName?: string;
  isNew?: boolean;
  featured?: boolean;
  monetization?: "free" | "vip" | "ppe";
  ppePrice?: number;
  updatedAt?: number;
  reviewNote?: string | null;
}

export interface Episode {
  id: string;
  n: number;
  title: string;
  duration: string;
  durationS: number;
  access: "free" | "vip" | "ppe";
  price: number;
  hasMedia: boolean;
  mediaStatus?: string;
  poster?: string;
  views: number;
  status: string;
  locked?: boolean;
  requires?: "login" | "vip" | "purchase";
  progress?: { positionS: number; durationS: number; completed: boolean } | null;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  days?: number;
  perMonth?: number;
  badge?: string;
  savings?: string;
  highlight?: boolean;
}

export interface Creator {
  id: string;
  name: string;
  initials: string;
  role: string;
  followers: number | string;
  shareBps?: number;
  balance?: number;
}

export interface HistoryItem {
  seriesId: string;
  episodeId: string;
  title: string;
  cover: string;
  episodeN: number;
  episodeTitle?: string;
  episodes?: number;
  positionS: number;
  durationS: number;
  percent: number;
  completed?: boolean;
  updatedAt: number;
}

export interface CommentItem {
  id: string;
  body: string;
  likes: number;
  createdAt: number;
  episodeId?: string | null;
  user: { name: string; initials: string; vip: boolean };
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}
