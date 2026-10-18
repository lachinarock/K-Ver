import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { StarRating } from '@/components/StarRating';
import { useWatched } from '@/components/WatchedContext';
import { theme } from '@/constants/theme';
import { posterUrl } from '@/lib/tmdb';

export default function WatchedScreen() {
  const router = useRouter();
  const { items, ready } = useWatched();

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.mediaType}:${item.tmdbId}`}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          ready ? (
            <Text style={styles.empty}>
              Aquí van a quedar las películas y series que marques como vistas, con tu calificación de 1 a 5. Solo viven en este teléfono.
            </Text>
          ) : (
            <View />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/titulo/[type]/[id]',
                params: { type: item.mediaType, id: String(item.tmdbId) },
              })
            }>
            {posterUrl(item.posterPath, 'w185') ? (
              <Image source={{ uri: posterUrl(item.posterPath, 'w185')! }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.posterEmpty]} />
            )}
            <View style={styles.body}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.mediaType === 'movie' ? 'Película' : 'Serie'}
                {item.year ? ` · ${item.year}` : ''}
              </Text>
              <StarRating value={item.rating} size={18} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { padding: 16, gap: 12 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  empty: { color: theme.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  poster: { width: 64, height: 96, borderRadius: 8, backgroundColor: theme.bg },
  posterEmpty: { borderWidth: 1, borderColor: theme.line },
  body: { flex: 1, justifyContent: 'center', gap: 6 },
  title: { color: theme.text, fontSize: 16, fontWeight: '700' },
  meta: { color: theme.muted, fontSize: 13 },
});
