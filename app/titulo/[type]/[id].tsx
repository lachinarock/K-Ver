import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StarRating } from '@/components/StarRating';
import { useWatched } from '@/components/WatchedContext';
import { theme } from '@/constants/theme';
import { fetchRottenTomatoes, hasOmdbKey } from '@/lib/omdb';
import { platformById } from '@/lib/platforms';
import { fetchTitle, posterUrl } from '@/lib/tmdb';
import type { MediaType, TitleDetail } from '@/lib/types';

export default function TitleScreen() {
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const mediaType: MediaType = params.type === 'tv' ? 'tv' : 'movie';
  const tmdbId = Number(params.id);
  const { ratingFor, save, remove } = useWatched();
  const savedRating = ratingFor(mediaType, tmdbId);

  const [title, setTitle] = useState<TitleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tomatoes, setTomatoes] = useState<string | null>(null);
  const [checkedTomatoes, setCheckedTomatoes] = useState(false);
  const [rating, setRating] = useState(savedRating ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTitle(mediaType, tmdbId)
      .then((detail) => {
        if (!active) return;
        setTitle(detail);
        return fetchRottenTomatoes(detail.imdbId);
      })
      .then((score) => {
        if (!active) return;
        setTomatoes(score ?? null);
        setCheckedTomatoes(true);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No se pudo abrir este título.');
      });
    return () => {
      active = false;
    };
  }, [mediaType, tmdbId]);

  useEffect(() => {
    if (savedRating) setRating(savedRating);
  }, [savedRating]);

  async function onSave() {
    if (!title || rating < 1) return;
    setSaving(true);
    try {
      await save({
        mediaType: title.mediaType,
        tmdbId: title.id,
        title: title.title,
        englishTitle: title.englishTitle,
        posterPath: title.posterPath,
        year: title.year,
        rating,
      });
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{error}</Text>
      </View>
    );
  }

  if (!title) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.gold} />
      </View>
    );
  }

  const knownPlatforms = title.offers.filter((offer) => platformById(offer.providerId));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: title.title }} />
      {posterUrl(title.backdropPath || title.posterPath, 'w780') ? (
        <Image
          source={{ uri: posterUrl(title.backdropPath || title.posterPath, 'w780')! }}
          style={styles.hero}
          contentFit="cover"
        />
      ) : null}
      <Text style={styles.heading}>{title.title}</Text>
      {title.englishTitle ? <Text style={styles.englishTitle}>{title.englishTitle}</Text> : null}
      <Text style={styles.meta}>
        {[title.year, title.runtimeLabel, title.genres.slice(0, 3).join(' · ')].filter(Boolean).join('  ·  ')}
      </Text>

      <View style={styles.scores}>
        <Score label="TMDB" value={title.voteAverage.toFixed(1)} hint={`${title.voteCount} votos`} />
        <Score
          label="Rotten Tomatoes"
          value={tomatoes ?? (checkedTomatoes ? '—' : '…')}
          hint={
            !hasOmdbKey()
              ? 'Agrega la key de OMDb'
              : tomatoes
                ? 'Tomatometer'
                : checkedTomatoes
                  ? 'Sin puntaje público'
                  : 'Consultando'
          }
          accent={theme.tomato}
        />
      </View>

      <Text style={styles.section}>En México</Text>
      {knownPlatforms.length === 0 ? (
        <Text style={styles.body}>Hoy no aparece en las plataformas que sigue K-Ver.</Text>
      ) : (
        <View style={styles.offers}>
          {knownPlatforms.map((offer) => {
            const platform = platformById(offer.providerId);
            return (
              <View key={`${offer.providerId}:${offer.access}`} style={styles.offer}>
                <View style={[styles.dot, { backgroundColor: platform?.color ?? theme.gold }]} />
                <Text style={styles.offerText}>
                  {offer.providerName} · {offer.access}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.section}>Sinopsis</Text>
      <Text style={styles.body}>{title.overview}</Text>

      <Text style={styles.section}>Tu calificación</Text>
      <Text style={styles.body}>Si ya la viste, ponle de 1 a 5 estrellas. Se guarda solo en este dispositivo.</Text>
      <StarRating value={rating} onChange={setRating} size={36} />
      <Pressable
        style={[styles.button, (rating < 1 || saving) && styles.buttonOff]}
        disabled={rating < 1 || saving}
        onPress={onSave}>
        <Text style={styles.buttonText}>{savedRating ? 'Actualizar' : 'Marcar como vista'}</Text>
      </Pressable>
      {savedRating ? (
        <Pressable onPress={() => remove(mediaType, tmdbId)}>
          <Text style={styles.remove}>Quitar de vistas</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Score({ label, value, hint, accent = theme.gold }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <View style={styles.score}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color: accent }]}>{value}</Text>
      <Text style={styles.scoreHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { width: '100%', height: 210, borderRadius: 16, backgroundColor: theme.card },
  heading: { color: theme.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  englishTitle: { color: theme.muted, fontSize: 14 },
  meta: { color: theme.muted, fontSize: 14 },
  scores: { flexDirection: 'row', gap: 12, marginTop: 8 },
  score: { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 12, gap: 2 },
  scoreLabel: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  scoreValue: { fontSize: 28, fontWeight: '800' },
  scoreHint: { color: theme.muted, fontSize: 12 },
  section: { color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 14 },
  body: { color: theme.muted, fontSize: 15, lineHeight: 22 },
  offers: { gap: 8 },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 99 },
  offerText: { color: theme.text, fontSize: 15 },
  button: {
    marginTop: 12,
    backgroundColor: theme.gold,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonOff: { opacity: 0.45 },
  buttonText: { color: '#1A1408', fontWeight: '800', fontSize: 16 },
  remove: { color: theme.tomato, textAlign: 'center', marginTop: 14, fontWeight: '700' },
});
