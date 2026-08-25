// Stadia Maps tile API key (MapLibre replacement for Mapbox)
export const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY || "your-stadia-api-key-here";

// Tile style URLs
export const TILE_STYLES = {
  streets:   `https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=${STADIA_API_KEY}`,
  satellite: `https://tiles.stadiamaps.com/styles/stamen_terrain.json?api_key=${STADIA_API_KEY}`,
  dark:      `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${STADIA_API_KEY}`,
} as const;

export type TileStyle = keyof typeof TILE_STYLES;

// Supabase
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ycvcfvnyoqcoziddcbrx.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbG...cXGc";
