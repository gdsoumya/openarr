export const colors = {
  surfaceBase: '#0f1023',
  // Matches the top of the AppBackground gradient so native headers blend in
  surfaceHeader: '#171c40',
  surfaceCard: 'rgba(21,25,53,0.82)',
  surfaceCardBorder: 'rgba(255,255,255,0.09)',
  surfaceElevated: '#16213e',
  primary: '#64ffda',
  primaryMuted: 'rgba(100, 255, 218, 0.1)',
  primaryBorder: 'rgba(100, 255, 218, 0.15)',
  transmission: '#e94560',
  sonarr: '#3fbac2',
  radarr: '#ffc107',
  prowlarr: '#e07b39',
  bazarr: '#a855f7',
  portainer: '#13bef9',
  emby: '#52b54b',
  gluetun: '#5dd39e',
  success: '#64ffda',
  error: '#e94560',
  warning: '#ffc107',
  info: '#3fbac2',
  textPrimary: '#ffffff',
  textSecondary: '#cdd6f4',
  textMuted: '#8892b0',
  divider: 'rgba(255,255,255,0.09)',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  round: 9999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '500' as const },
  badge: { fontSize: 10, fontWeight: '700' as const },
} as const;

export const serviceConfig = {
  transmission: { color: colors.transmission, label: 'Transmission', icon: 'T' },
  sonarr: { color: colors.sonarr, label: 'Sonarr', icon: 'S' },
  radarr: { color: colors.radarr, label: 'Radarr', icon: 'R' },
  prowlarr: { color: colors.prowlarr, label: 'Prowlarr', icon: 'P' },
  bazarr: { color: colors.bazarr, label: 'Bazarr', icon: 'B' },
  portainer: { color: colors.portainer, label: 'Portainer', icon: 'P' },
  emby: { color: colors.emby, label: 'Emby', icon: 'E' },
  gluetun: { color: colors.gluetun, label: 'Gluetun VPN', icon: 'G' },
} as const;

export type ServiceId = keyof typeof serviceConfig;
