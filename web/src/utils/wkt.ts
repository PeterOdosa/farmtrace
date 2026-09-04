/**
 * Convert PostGIS WKT geometry strings to GeoJSON geometry objects.
 * Used because Supabase stores boundaries as PostGIS geometry,
 * and select('*') returns them as WKT, not GeoJSON.
 */

type GeoJSONGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPoint"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] };

function parseCoordinatePair(str: string): [number, number] {
  const [x, y] = str.trim().split(/\s+/);
  return [parseFloat(x), parseFloat(y)];
}

function parseRing(str: string): number[][] {
  // Strip outer parens: "(3.0 6.0, 3.1 6.0, ...)"
  const inner = str.trim().replace(/^\(/, "").replace(/\)$/, "");
  return inner.split(",").map(parseCoordinatePair);
}

function parsePolygon(str: string): number[][][] {
  // "POLYGON((rings...))" — first strip "POLYGON(" prefix and trailing ")"
  const inner = str.replace(/^POLYGON\(/, "").replace(/\)$/, "");
  // Split rings by "), ("
  const rings = inner.match(/\([^()]+\)/g) || [];
  return rings.map(parseRing);
}

function parseMultiPolygon(str: string): number[][][][] {
  // "MULTIPOLYGON(((rings...)), ((rings...)))"
  // Strip "MULTIPOLYGON(" prefix and trailing ")"
  const inner = str.replace(/^MULTIPOLYGON\(/, "").replace(/\)$/, "");
  // Each polygon is wrapped in double parens: ((...))
  const polygons = inner.match(/\(\([^()]+\)\)/g) || [];
  return polygons.map(parsePolygon);
}

function parseGeometry(wkt: string): GeoJSONGeometry | null {
  if (!wkt || typeof wkt !== "string" || !wkt.startsWith("GEOMETRY")) return null;

  const upper = wkt.toUpperCase();

  // Strip "GEOMETRYCOLLECTION(" prefix / trailing ")"
  if (upper.startsWith("GEOMETRYCOLLECTION(")) {
    const inner = wkt.replace(/^GEOMETRYCOLLECTION\(/, "").replace(/\)$/, "");
    // Split by "), (" and recurse
    const geoms = inner.split(/\)\s*,\s*\(/);
    return {
      type: "GeometryCollection",
      geometries: geoms.map(g => parseGeometry("GEOMETRY" + g)),
    } as any;
  }

  if (upper.startsWith("POINT")) {
    const coords = parseCoordinatePair(wkt.replace(/^POINT\(/, "").replace(/\)$/, ""));
    return { type: "Point", coordinates: coords };
  }

  if (upper.startsWith("LINESTRING")) {
    return { type: "LineString", coordinates: parseRing(wkt.replace(/^LINESTRING\(/, "").replace(/\)$/, "")) };
  }

  if (upper.startsWith("POLYGON")) {
    return { type: "Polygon", coordinates: parsePolygon(wkt) };
  }

  if (upper.startsWith("MULTIPOINT")) {
    const inner = wkt.replace(/^MULTIPOINT\(/, "").replace(/\)$/, "");
    // Could be: (3.0 6.0, 3.1 6.1) or ((3.0 6.0))
    return {
      type: "MultiPoint",
      coordinates: inner
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .split(",")
        .map(s => parseCoordinatePair(s)),
    };
  }

  if (upper.startsWith("MULTILINESTRING")) {
    const inner = wkt.replace(/^MULTILINESTRING\(/, "").replace(/\)$/, "");
    const lines = inner.match(/\([^()]+\)/g) || [];
    return {
      type: "MultiLineString",
      coordinates: lines.map(l => parseRing(l)),
    };
  }

  if (upper.startsWith("MULTIPOLYGON")) {
    return { type: "MultiPolygon", coordinates: parseMultiPolygon(wkt) };
  }

  return null;
}

/**
 * Convert a PostGIS WKT string to a GeoJSON geometry object.
 * Returns null if conversion fails or input is already valid GeoJSON.
 */
export function wktToGeoJSON(wkt: string): GeoJSONGeometry | null {
  if (!wkt || typeof wkt !== "string") return null;
  // If it looks like a JSON object, it's already GeoJSON
  if (wkt.trim().startsWith("{")) return JSON.parse(wkt);
  return parseGeometry(wkt);
}
