export type MediaType = 'movie' | 'tv';

export type CatalogPeriod = 'week' | 'month' | 'year';

export type CatalogItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  englishTitle: string;
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
  access: 'Suscripción' | 'Alquiler' | 'Compra';
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
  englishTitle: string;
  posterPath: string | null;
  year: string;
  rating: number;
  updatedAt: string;
};

export function titleKey(mediaType: MediaType, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}
