import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useWatched } from '@/components/WatchedContext';
import { theme } from '@/constants/theme';
import { PLATFORMS, platformById } from '@/lib/platforms';
import { fetchCatalog, hasTmdbKey, posterUrl } from '@/lib/tmdb';
import type { CatalogItem, CatalogPeriod, MediaType } from '@/lib/types';

const FILTERS = [{ id: 0, short: 'Todas' }, ...PLATFORMS.map((platform) => ({ id: platform.id, short: platform.short }))];

const PERIODS: { id: CatalogPeriod; label: string }[] = [
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'year', label: 'Este Año' },
];

export default function CatalogScreen() {
  const router = useRouter();
  const { ratingFor } = useWatched();
  const [media, setMedia] = useState<MediaType>('movie');
  const [period, setPeriod] = useState<CatalogPeriod>('week');
  const [platformId, setPlatformId] = useState(0);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!hasTmdbKey()) {
      setLoading(false);
      setError('missing-key');
      return;
    }
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const catalog = await fetchCatalog(period, platformId || undefined);
      setItems(catalog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [platformId, period]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') load('refresh');
    });
    return () => subscription.remove();
  }, [load]);

  const visible = useMemo(
    () => items.filter((item) => item.mediaType === media),
    [items, media],
  );
  const platformLabel = FILTERS.find((filter) => filter.id === platformId)?.short ?? 'Todas';

  if (error === 'missing-key') {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Para leer el catálogo de México necesitas una API key gratis de TMDB. Crea un archivo .env en la raíz del proyecto con:
        </Text>
        <Text style={styles.code}>EXPO_PUBLIC_TMDB_API_KEY=tu_llave</Text>
        <Text style={styles.message}>
          Opcional, para Rotten Tomatoes: EXPO_PUBLIC_OMDB_API_KEY. Después reinicia Expo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.switchScroll}
        contentContainerStyle={styles.switch}>
        <Segment label="Películas" tone="media" active={media === 'movie'} onPress={() => setMedia('movie')} />
        <Segment label="Series" tone="media" active={media === 'tv'} onPress={() => setMedia('tv')} />
        <Text style={styles.divider}>|</Text>
        {PERIODS.map((option) => (
          <Segment
            key={option.id}
            label={option.label}
            tone="time"
            active={period === option.id}
            onPress={() => setPeriod(option.id)}
          />
        ))}
      </ScrollView>
      <Pressable style={styles.dropdown} onPress={() => setPlatformsOpen(true)}>
        <Text style={styles.dropdownValue}>{platformLabel}</Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </Pressable>
      <Modal visible={platformsOpen} transparent animationType="fade" onRequestClose={() => setPlatformsOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setPlatformsOpen(false)} />
          <View style={styles.menu}>
            {FILTERS.map((filter) => {
              const active = platformId === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => {
                    setPlatformId(filter.id);
                    setPlatformsOpen(false);
                  }}
                  style={[styles.menuItem, active && styles.menuItemOn]}>
                  <Text style={[styles.menuText, active && styles.menuTextOn]}>{filter.short}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.button} onPress={() => load()}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => `${item.mediaType}:${item.id}`}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={theme.gold} />
          }
          ListEmptyComponent={
            <Text style={styles.message}>No hay títulos con suficientes votos en este filtro.</Text>
          }
          renderItem={({ item }) => {
            const watched = ratingFor(item.mediaType, item.id);
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/titulo/[type]/[id]',
                    params: { type: item.mediaType, id: String(item.id) },
                  })
                }>
                {posterUrl(item.posterPath) ? (
                  <Image source={{ uri: posterUrl(item.posterPath)! }} style={styles.poster} contentFit="cover" />
                ) : (
                  <View style={[styles.poster, styles.posterEmpty]} />
                )}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.englishTitle ? (
                  <Text style={styles.englishTitle} numberOfLines={1}>
                    {item.englishTitle}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {item.voteAverage.toFixed(1)} TMDB{item.year ? ` · ${item.year}` : ''}
                  {watched ? ` · ${watched}★` : ''}
                </Text>
                <Text style={styles.platforms}>
                  {item.platformIds.map((id) => platformById(id)?.short ?? '').filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function Segment({
  label,
  active,
  tone,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: 'media' | 'time';
  onPress: () => void;
}) {
  const selected = tone === 'time' ? styles.segmentTime : styles.segmentOn;
  const selectedText = tone === 'time' ? styles.segmentTimeText : styles.segmentTextOn;
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && selected]}>
      <Text style={[styles.segmentText, active && selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24, gap: 12 },
  message: { color: theme.muted, fontSize: 15, lineHeight: 22 },
  code: { color: theme.gold, fontFamily: 'SpaceMono', fontSize: 13 },
  switchScroll: { flexGrow: 0, flexShrink: 0 },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  divider: { color: theme.line, fontSize: 18, fontWeight: '300', marginHorizontal: 2 },
  segment: { flexShrink: 0, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.card },
  segmentOn: { backgroundColor: theme.text },
  segmentTime: { backgroundColor: theme.gold },
  segmentText: { color: theme.muted, fontWeight: '700', fontSize: 13, flexShrink: 0 },
  segmentTextOn: { color: theme.bg },
  segmentTimeText: { color: '#1A1408' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownValue: { color: theme.text, fontSize: 15, fontWeight: '700' },
  dropdownChevron: { color: theme.gold, fontSize: 14, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  backdropTap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menu: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  menuItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.line },
  menuItemOn: { backgroundColor: theme.gold },
  menuText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  menuTextOn: { color: '#1A1408' },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24, gap: 12 },
  row: { gap: 12 },
  card: { flex: 1, marginBottom: 8 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 12, backgroundColor: theme.card },
  posterEmpty: { borderWidth: 1, borderColor: theme.line },
  cardTitle: { color: theme.text, fontWeight: '700', marginTop: 8 },
  englishTitle: { color: theme.muted, fontSize: 12, lineHeight: 16 },
  meta: { color: theme.gold, fontSize: 12, marginTop: 2 },
  platforms: { color: theme.muted, fontSize: 12, marginTop: 2 },
  button: { alignSelf: 'flex-start', backgroundColor: theme.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: '#1A1408', fontWeight: '800' },
});
