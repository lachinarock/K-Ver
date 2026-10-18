export type Platform = {
  id: number;
  name: string;
  short: string;
  color: string;
};

// IDs oficiales de TMDB / JustWatch. El catálogo se pide con watch_region=MX.
export const PLATFORMS: Platform[] = [
  { id: 8, name: 'Netflix', short: 'Netflix', color: '#E50914' },
  { id: 1899, name: 'Max', short: 'Max', color: '#5B2BE0' },
  { id: 337, name: 'Disney+', short: 'Disney+', color: '#113CCF' },
  { id: 350, name: 'Apple TV+', short: 'Apple', color: '#F2F2F2' },
  { id: 531, name: 'Paramount+', short: 'Paramount', color: '#0064FF' },
  { id: 119, name: 'Prime Video', short: 'Prime', color: '#00A8E1' },
];

export function platformById(id: number) {
  return PLATFORMS.find((platform) => platform.id === id);
}
