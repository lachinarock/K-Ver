import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
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
import type { CatalogItem, MediaType } from '@/lib/types';

const FILTERS = [{ id: 0, short: 'Todas' }, ...PLATFORMS.map((platform) => ({ id: platform.id, short: platform.short }))];

export default function CatalogScreen() {
  const router = useRouter();
  const { ratingFor } = useWatched();
  const [media, setMedia] = useState<MediaType>('movie');
  const [platformId, setPlatformId] = useState(0);
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
      const catalog = await fetchCatalog(platformId || undefined);
      setItems(catalog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [platformId]);

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

  if (error === 'missing-key') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>K-Ver</Text>
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
      <Text style={styles.kicker}>México · suscripción</Text>
      <View style={styles.switch}>
        <Segment label="Películas" active={media === 'movie'} onPress={() => setMedia('movie')} />
        <Segment label="Series" active={media === 'tv'} onPress={() => setMedia('tv')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => {
          const active = platformId === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setPlatformId(filter.id)}
              style={[styles.chip, active && styles.chipOn]}>
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{filter.short}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
                <Text style={styles.meta}>
                  {item.voteAverage.toFixed(1)} TMDB{item.year ? ` · ${item.year}` : ''}
                  {watched ? ` · ${watched}★` : ''}
                </Text>
                <Text style={styles.platforms} numberOfLines={1}>
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

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentOn]}>
      <Text style={[styles.segmentText, active && styles.segmentTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24, gap: 12 },
  kicker: { color: theme.muted, paddingHorizontal: 16, paddingTop: 4, fontSize: 13 },
  title: { color: theme.text, fontSize: 32, fontWeight: '800' },
  message: { color: theme.muted, fontSize: 15, lineHeight: 22 },
  code: { color: theme.gold, fontFamily: 'SpaceMono', fontSize: 13 },
  switch: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  segment: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.card },
  segmentOn: { backgroundColor: theme.text },
  segmentText: { color: theme.muted, fontWeight: '700' },
  segmentTextOn: { color: theme.bg },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: theme.gold, borderColor: theme.gold },
  chipText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#1A1408' },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 12 },
  row: { gap: 12 },
  card: { flex: 1, marginBottom: 8 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 12, backgroundColor: theme.card },
  posterEmpty: { borderWidth: 1, borderColor: theme.line },
  cardTitle: { color: theme.text, fontWeight: '700', marginTop: 8, minHeight: 38 },
  meta: { color: theme.gold, fontSize: 12, marginTop: 2 },
  platforms: { color: theme.muted, fontSize: 12, marginTop: 2 },
  button: { alignSelf: 'flex-start', backgroundColor: theme.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: '#1A1408', fontWeight: '800' },
});
