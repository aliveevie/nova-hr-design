export type GeoPoint = {
  lat: number;
  lng: number;
  /** Horizontal accuracy in meters from the device (smaller is better). */
  accuracyM?: number | null;
};

export type OfficeGeofence = {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  maxAccuracyM: number;
  entryBufferM: number;
  exitBufferM: number;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMetersHaversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isPointInsideGeofence(args: {
  point: GeoPoint;
  geofence: OfficeGeofence;
  /** Previous inside-state enables hysteresis for stable transitions. */
  wasInside: boolean;
}): boolean {
  const { point, geofence, wasInside } = args;
  const accuracy = point.accuracyM ?? null;
  if (accuracy === null || !Number.isFinite(accuracy)) return false;
  if (accuracy > geofence.maxAccuracyM) return false;

  const dist = distanceMetersHaversine(
    point.lat,
    point.lng,
    geofence.centerLat,
    geofence.centerLng
  );

  const enterRadius = Math.max(0, geofence.radiusM - (geofence.entryBufferM || 0));
  const exitRadius = geofence.radiusM + (geofence.exitBufferM || 0);

  // Hysteresis: require tighter radius to enter, looser radius to exit.
  if (wasInside) return dist <= exitRadius;
  return dist <= enterRadius;
}

export function resolveInsideGeofence(args: {
  point: GeoPoint;
  geofences: OfficeGeofence[];
  /** Previous inside-zone id to stabilize across multiple geofences. */
  previousZoneId?: string | null;
}): { insideZoneId: string | null; distanceM: number | null } {
  const { point, geofences, previousZoneId } = args;
  if (!geofences || geofences.length === 0) return { insideZoneId: null, distanceM: null };

  // If previously inside a zone, prefer staying in that zone if still inside.
  if (previousZoneId) {
    const prev = geofences.find((g) => g.id === previousZoneId);
    if (prev) {
      const inside = isPointInsideGeofence({ point, geofence: prev, wasInside: true });
      const dist = distanceMetersHaversine(point.lat, point.lng, prev.centerLat, prev.centerLng);
      if (inside) return { insideZoneId: prev.id, distanceM: dist };
    }
  }

  let best: { id: string; dist: number } | null = null;
  for (const g of geofences) {
    const inside = isPointInsideGeofence({ point, geofence: g, wasInside: false });
    if (!inside) continue;
    const dist = distanceMetersHaversine(point.lat, point.lng, g.centerLat, g.centerLng);
    if (!best || dist < best.dist) best = { id: g.id, dist };
  }
  return best ? { insideZoneId: best.id, distanceM: best.dist } : { insideZoneId: null, distanceM: null };
}

