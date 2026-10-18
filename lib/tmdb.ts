import { PLATFORMS } from '@/lib/platforms';
import type { CatalogItem, MediaType, StreamingOffer, TitleDetail } from '@/lib/types';

const TMDB = 'https://api.themoviedb.org/3';

type TmdbResult = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
};

type TmdbList = { results?: TmdbResult[]; status_message?: string };

type TmdbDetail = TmdbResult & {
  imdb_id?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  genres?: { name: string }[];
  external_ids?: { imdb_id?: string | null };
  'watch/providers'?: {
    results?: {
      MX?: {
        flatrate?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
      };
    };
  };
};

export function hasTmdbKey() {
  return Boolean(process.env.EXPO_PUBLIC_TMDB_API_KEY);
}

export function posterUrl(path: string | null, size = 'w342') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function yearFrom(date?: string) {
  return date && date.length >= 4 ? date.slice(0, 4) : '';
}

function apiKey() {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (!key) {
    throw new Error('Falta EXPO_PUBLIC_TMDB_API_KEY en el archivo .env');
  }
  return key;
}

async function tmdbGet<T>(path: string, params: Record<string, string>) {
  const query = new URLSearchParams({ api_key: apiKey(), ...params });
  const response = await fetch(`${TMDB}${path}?${query.toString()}`);
  const data = (await response.json()) as T & { status_message?: string };
  if (!response.ok) {
    throw new Error(data.status_message || 'TMDB no respondió. Revisa la conexión o la API key.');
  }
  return data;
}

async function discover(mediaType: MediaType, platformId: number): Promise<CatalogItem[]> {
  const data = await tmdbGet<TmdbList>(`/discover/${mediaType}`, {
    language: 'es-MX',
    sort_by: 'vote_average.desc',
    'vote_count.gte': '80',
    watch_region: 'MX',
    with_watch_monetization_types: 'flatrate',
    with_watch_providers: String(platformId),
    include_adult: 'false',
    page: '1',
  });

  return (data.results ?? []).map((item) => ({
    id: item.id,
    mediaType,
    title: item.title || item.name || 'Sin título',
    overview: item.overview || '',
    posterPath: item.poster_path ?? null,
    year: yearFrom(item.release_date || item.first_air_date),
    voteAverage: item.vote_average ?? 0,
    voteCount: item.vote_count ?? 0,
    platformIds: [platformId],
  }));
}

function merge(items: CatalogItem[]) {
  const byKey = new Map<string, CatalogItem>();
  for (const item of items) {
    const key = `${item.mediaType}:${item.id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    const platformIds = [...new Set([...existing.platformIds, ...item.platformIds])];
    byKey.set(key, { ...existing, platformIds });
  }

  return [...byKey.values()].sort((a, b) => {
    if (b.voteAverage !== a.voteAverage) return b.voteAverage - a.voteAverage;
    return b.voteCount - a.voteCount;
  });
}

export async function fetchCatalog(platformId?: number) {
  const providers = platformId ? [platformId] : PLATFORMS.map((platform) => platform.id);
  const groups = await Promise.all(
    providers.flatMap((id) => [discover('movie', id), discover('tv', id)]),
  );
  return merge(groups.flat());
}

export async function fetchTitle(mediaType: MediaType, id: number): Promise<TitleDetail> {
  const data = await tmdbGet<TmdbDetail>(`/${mediaType}/${id}`, {
    language: 'es-MX',
    append_to_response: 'external_ids,watch/providers',
  });

  const offers: StreamingOffer[] = (data['watch/providers']?.results?.MX?.flatrate ?? []).map(
    (offer) => ({
      providerId: offer.provider_id,
      providerName: offer.provider_name,
      logoPath: offer.logo_path ?? null,
    }),
  );

  const knownIds = offers
    .map((offer) => offer.providerId)
    .filter((providerId) => PLATFORMS.some((platform) => platform.id === providerId));

  const minutes = data.runtime || data.episode_run_time?.[0] || null;
  const runtimeLabel =
    mediaType === 'tv' && data.number_of_seasons
      ? `${data.number_of_seasons} temporada${data.number_of_seasons === 1 ? '' : 's'}`
      : minutes
        ? `${minutes} min`
        : null;

  return {
    id: data.id,
    mediaType,
    title: data.title || data.name || 'Sin título',
    overview: data.overview || 'Sin sinopsis en español.',
    posterPath: data.poster_path ?? null,
    backdropPath: data.backdrop_path ?? null,
    year: yearFrom(data.release_date || data.first_air_date),
    voteAverage: data.vote_average ?? 0,
    voteCount: data.vote_count ?? 0,
    platformIds: knownIds,
    genres: (data.genres ?? []).map((genre) => genre.name),
    runtimeLabel,
    imdbId: data.imdb_id || data.external_ids?.imdb_id || null,
    offers,
  };
}
