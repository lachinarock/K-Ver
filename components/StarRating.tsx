import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
};

export function StarRating({ value, onChange, size = 28 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={!onChange}
          hitSlop={8}
          onPress={() => onChange?.(star)}
          accessibilityRole="button"
          accessibilityLabel={`${star} estrella${star === 1 ? '' : 's'}`}>
          <Text style={{ fontSize: size, color: star <= value ? '#F5C16C' : '#3A3A42' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
});
