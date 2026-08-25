const KEY = process.env.EXPO_PUBLIC_STADIA_API_KEY || 'your-stadia-api-key-here';

export const TILE_STYLES = {
  streets: `https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=${KEY}`,
  satellite: `https://tiles.stadiamaps.com/styles/stamen_terrain.json?api_key=${KEY}`,
  dark: `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${KEY}`,
} as const;

export type TileStyle = keyof typeof TILE_STYLES;
