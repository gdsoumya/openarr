import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';

interface CachedImageProps {
  uri: string | undefined;
  headers?: Record<string, string>;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  placeholder?: string;
}

export function CachedImage({ uri, headers, style, contentFit = 'cover', placeholder }: CachedImageProps) {
  if (!uri) return null;
  return (
    <Image
      source={{ uri, headers }}
      style={style}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
    />
  );
}
