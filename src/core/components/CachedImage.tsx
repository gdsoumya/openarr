import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

interface CachedImageProps {
  uri: string | undefined;
  style?: ViewStyle;
  contentFit?: 'cover' | 'contain' | 'fill';
  placeholder?: string;
}

export function CachedImage({ uri, style, contentFit = 'cover', placeholder }: CachedImageProps) {
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
    />
  );
}
