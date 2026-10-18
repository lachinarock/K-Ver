import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

const ASPECT = 780 / 348;
const LOGO_HEIGHT = 24;

export function Logo() {
  return (
    <Image
      source={require('../assets/images/logo.png')}
      style={{ width: Math.round(LOGO_HEIGHT * ASPECT), height: LOGO_HEIGHT }}
      contentFit="contain"
      accessibilityLabel="K Ver"
    />
  );
}

export function BrandHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Logo />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.bg,
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
});
