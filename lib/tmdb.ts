import { PLATFORMS } from '@/lib/platforms';
import type { CatalogItem, CatalogPeriod, MediaType, StreamingOffer, TitleDetail } from '@/lib/types';

const TMDB = 'https://api.themoviedb.org/3';

type TmdbResult = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
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
  translations?: {
    translations?: {
      iso_639_1?: string;
      iso_3166_1?: string;
      data?: { title?: string; name?: string };
    }[];
  };
  external_ids?: { imdb_id?: string | null };
  'watch/providers'?: {
    results?: {
      MX?: {
        flatrate?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
        rent?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
        buy?: { provider_id: number; provider_name: string; logo_path?: string | null }[];
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

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function periodRange(period: CatalogPeriod, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  if (period === 'week') {
    const weekday = start.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    start.setDate(start.getDate() + mondayOffset);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === 'month') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return { gte: isoDate(start), lte: isoDate(end) };
}

function distinctTitle(spanish: string, english?: string) {
  const next = english?.trim() ?? '';
  if (!next) return '';
  if (next.localeCompare(spanish.trim(), undefined, { sensitivity: 'accent' }) === 0) return '';
  return next;
}

function englishFromTranslations(
  translations: TmdbDetail['translations'],
  spanish: string,
) {
  const list = translations?.translations ?? [];
  const preferred =
    list.find((item) => item.iso_639_1 === 'en' && item.iso_3166_1 === 'US') ??
    list.find((item) => item.iso_639_1 === 'en');
  return distinctTitle(spanish, preferred?.data?.title || preferred?.data?.name);
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

function dateParams(mediaType: MediaType, period: CatalogPeriod): Record<string, string> {
  const { gte, lte } = periodRange(period);
  if (mediaType === 'movie') {
    return {
      'primary_release_date.gte': gte,
      'primary_release_date.lte': lte,
    };
  }
  return {
    'air_date.gte': gte,
    'air_date.lte': lte,
  };
}

function voteFloor(period: CatalogPeriod) {
  if (period === 'week') return '15';
  if (period === 'month') return '40';
  return '80';
}

async function discover(
  mediaType: MediaType,
  platformId: number,
  period: CatalogPeriod,
  language: string,
): Promise<CatalogItem[]> {
  const data = await tmdbGet<TmdbList>(`/discover/${mediaType}`, {
    language,
    sort_by: 'vote_average.desc',
    'vote_count.gte': voteFloor(period),
    watch_region: 'MX',
    with_watch_monetization_types: 'flatrate|rent|buy',
    with_watch_providers: String(platformId),
    include_adult: 'false',
    page: '1',
    ...dateParams(mediaType, period),
  });

  return (data.results ?? []).map((item) => ({
    id: item.id,
    mediaType,
    title: item.title || item.name || item.original_title || item.original_name || 'Sin título',
    englishTitle: '',
    overview: item.overview || '',
    posterPath: item.poster_path ?? null,
    year: yearFrom(item.release_date || item.first_air_date),
    voteAverage: item.vote_average ?? 0,
    voteCount: item.vote_count ?? 0,
    platformIds: [platformId],
  }));
}

async function discoverLocalized(
  mediaType: MediaType,
  platformId: number,
  period: CatalogPeriod,
): Promise<CatalogItem[]> {
  const [spanish, english] = await Promise.all([
    discover(mediaType, platformId, period, 'es-MX'),
    discover(mediaType, platformId, period, 'en-US'),
  ]);
  const englishById = new Map(english.map((item) => [item.id, item.title]));

  return spanish.map((item) => ({
    ...item,
    englishTitle: distinctTitle(item.title, englishById.get(item.id)),
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

export async function fetchCatalog(period: CatalogPeriod, platformId?: number) {
  const providers = platformId ? [platformId] : PLATFORMS.map((platform) => platform.id);
  const groups = await Promise.all(
    providers.flatMap((id) => [
      discoverLocalized('movie', id, period),
      discoverLocalized('tv', id, period),
    ]),
  );
  return merge(groups.flat());
}

export async function fetchTitle(mediaType: MediaType, id: number): Promise<TitleDetail> {
  const data = await tmdbGet<TmdbDetail>(`/${mediaType}/${id}`, {
    language: 'es-MX',
    append_to_response: 'external_ids,watch/providers,translations',
  });

  const region = data['watch/providers']?.results?.MX;
  const offers: StreamingOffer[] = (
    [
      ['flatrate', 'Suscripción'],
      ['rent', 'Alquiler'],
      ['buy', 'Compra'],
    ] as const
  ).flatMap(([key, access]) =>
    (region?.[key] ?? []).map((offer) => ({
      providerId: offer.provider_id,
      providerName: offer.provider_name,
      logoPath: offer.logo_path ?? null,
      access,
    })),
  );

  const knownIds = offers
    .map((offer) => offer.providerId)
    .filter((providerId) => PLATFORMS.some((platform) => platform.id === providerId));

  const title = data.title || data.name || 'Sin título';
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
    title,
    englishTitle: englishFromTranslations(data.translations, title),
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
