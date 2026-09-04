/**
 * Convert PostGIS WKT geometry strings to GeoJSON geometry objects.
 * PostGIS returns WKT like:
 *   - POLYGON((3.0 6.0, 3.1 6.0, ...))
 *   - SRID=4326;POLYGON((3.0 6.0, ...))
 *   - MULTIPOLYGON(((rings...)), ((rings...)))
 */

type GeoJSONGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPoint"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

function parseCoordinatePair(str: string): [number, number] {
  const trimmed = str.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(1, -1);
    const parts = inner.split(/\s+/);
    return [parseFloat(parts[0]), parseFloat(parts[1])];
  }
  const parts = trimmed.split(/\s+/);
  return [parseFloat(parts[0]), parseFloat(parts[1])];
}

function parseRing(str: string): number[][] {
  // Strip outer parens
  const inner = str.trim();
  const cleaned = inner.startsWith("(") && inner.endsWith(")")
    ? inner.slice(1, -1)
    : inner;
  return cleaned.split(",").map(parseCoordinatePair);
}

function parsePolygonCoords(str: string): number[][][] {
  // "POLYGON((ring1), (ring2))" — strip "POLYGON(" and trailing ")"
  const inner = str.replace(/^POLYGON\s*\(/i, "").replace(/\)\s*$/i, "");
  // Each ring is wrapped in parens: (ring)
  const rings = inner.match(/\([^)]+\)/g) || [];
  return rings.map(parseRing);
}

function parseMultiPolygonCoords(str: string): number[][][][] {
  // "MULTIPOLYGON(((rings)), ((rings)))"
  // Strip prefix and trailing )
  const inner = str.replace(/^MULTIPOLYGON\s*\(/i, "").replace(/\)\s*$/i, "");
  // Each polygon is wrapped in double parens: ((...))
  const polygons = inner.match(/\(\([^)]+\)\)/g) || [];
  return polygons.map(parsePolygonCoords);
}

function parseGeometry(wkt: string): GeoJSONGeometry | null {
  if (!wkt || typeof wkt !== "string" || wkt.trim() === "") return null;

  // Strip SRID prefix if present: "SRID=4326;POLYGON(...)"
  let body = wkt;
  const sridMatch = wkt.match(/^[^;]*;/i);
  if (sridMatch) {
    body = wkt.slice(sridMatch[0].length);
  }

  const upper = body.trim().toUpperCase();

  if (upper.startsWith("POINT")) {
    const inner = body.replace(/^POINT\s*\(/i, "").replace(/\)\s*$/i, "");
    const coords = parseCoordinatePair(inner);
    return { type: "Point", coordinates: coords };
  }

  if (upper.startsWith("LINESTRING")) {
    const inner = body.replace(/^LINESTRING\s*\(/i, "").replace(/\)\s*$/i, "");
    const coords = inner.split(",").map(s => parseCoordinatePair(s));
    return { type: "LineString", coordinates: coords };
  }

  if (upper.startsWith("POLYGON")) {
    return { type: "Polygon", coordinates: parsePolygonCoords(body) };
  }

  if (upper.startsWith("MULTIPOINT")) {
    const inner = body.replace(/^MULTIPOINT\s*\(/i, "").replace(/\)\s*$/i, "");
    const coords = inner
      .replace(/\(/g, "")
      .replace(/\)/g, "")
      .split(",")
      .map(s => parseCoordinatePair(s));
    return { type: "MultiPoint", coordinates: coords };
  }

  if (upper.startsWith("MULTILINESTRING")) {
    const inner = body.replace(/^MULTILINESTRING\s*\(/i, "").replace(/\)\s*$/i, "");
    const lines = inner.match(/\([^)]+\)/g) || [];
    return {
      type: "MultiLineString",
      coordinates: lines.map(l => parseRing(l)),
    };
  }

  if (upper.startsWith("MULTIPOLYGON")) {
    return { type: "MultiPolygon", coordinates: parseMultiPolygonCoords(body) };
  }

  // Try to detect if it's already GeoJSON
  if (body.trim().startsWith("{")) {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  // Unknown format — return null rather than crashing
  console.warn("Unknown WKT format:", body.slice(0, 100));
  return null;
}

/**
 * Convert a PostGIS WKT string to a GeoJSON geometry object.
 * Returns null if conversion fails.
 */
export function wktToGeoJSON(wkt: string): GeoJSONGeometry | null {
  if (!wkt || typeof wkt !== "string") return null;
  return parseGeometry(wkt);
}
