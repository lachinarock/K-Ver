export function hasOmdbKey() {
  return Boolean(process.env.EXPO_PUBLIC_OMDB_API_KEY);
}

export async function fetchRottenTomatoes(imdbId: string | null) {
  const key = process.env.EXPO_PUBLIC_OMDB_API_KEY;
  if (!key || !imdbId) return null;

  const query = new URLSearchParams({ i: imdbId, apikey: key });
  const response = await fetch(`https://www.omdbapi.com/?${query.toString()}`);
  const data = (await response.json()) as {
    Response?: string;
    Ratings?: { Source: string; Value: string }[];
  };

  if (!response.ok || data.Response === 'False') return null;
  return data.Ratings?.find((rating) => rating.Source === 'Rotten Tomatoes')?.Value ?? null;
}
