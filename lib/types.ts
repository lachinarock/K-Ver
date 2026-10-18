export type MediaType = 'movie' | 'tv';

export type CatalogItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  year: string;
  voteAverage: number;
  voteCount: number;
  platformIds: number[];
};

export type StreamingOffer = {
  providerId: number;
  providerName: string;
  logoPath: string | null;
};

export type TitleDetail = CatalogItem & {
  backdropPath: string | null;
  genres: string[];
  runtimeLabel: string | null;
  imdbId: string | null;
  offers: StreamingOffer[];
};

export type WatchedTitle = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: string;
  rating: number;
  updatedAt: string;
};

export function titleKey(mediaType: MediaType, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}
