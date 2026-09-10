import { toSeries, toEpisode, type SeriesRow, type EpisodeRow } from "./repo/catalog";
import { coverOr, heroOr, posterOr } from "@/lib/placeholders";

/**
 * Response shaping. Every list/detail endpoint funnels through here so the
 * client never has to know about column names — and so no artwork field is
 * ever returned empty (placeholders are resolved server-side).
 */

export function seriesDTO(row: SeriesRow) {
  const dto = toSeries(row);
  dto.cover = coverOr(dto.cover, row.id);
  dto.hero = dto.hero ? dto.hero : heroOr(null, row.id);
  return dto;
}

export function seriesListDTO(rows: SeriesRow[]) {
  return rows.map(seriesDTO);
}

export function episodeDTO(row: EpisodeRow & { media_status?: string | null }, seriesCover?: string) {
  const dto = toEpisode(row);
  dto.poster = posterOr(dto.poster, seriesCover, row.id);
  return dto;
}
