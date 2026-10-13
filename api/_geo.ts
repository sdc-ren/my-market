/**
 * api/_geo.ts — helper dùng chung cho tính phí giao hàng.
 * File bắt đầu bằng `_` nên Vercel KHÔNG tạo serverless function riêng.
 */

export interface DeliveryFeeZone {
  upToM: number;
  fee: number;
}

/** Khoảng cách đường chim bay (m) giữa 2 tọa độ — Haversine */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface FeeResult {
  fee: number;
  /** true nếu khoảng cách vượt quá vùng xa nhất và đang tính theo đ/km */
  beyondZones: boolean;
}

/**
 * Tính phí ship theo bảng zones.
 * - distanceM ≤ upToM của nấc đầu tiên khớp → fee của nấc đó.
 * - Vượt quá mọi nấc: fee nấc cuối + ceil(km vượt thêm) * extraPerKm.
 *   Nếu extraPerKm = 0 → trả beyondZones=true, fee = fee nấc cuối (shop tự thỏa thuận).
 */
export function calcDeliveryFee(
  distanceM: number,
  zones: DeliveryFeeZone[],
  extraPerKm: number
): FeeResult {
  const sorted = [...(zones || [])]
    .filter((z) => Number(z.upToM) > 0)
    .sort((a, b) => a.upToM - b.upToM);
  if (sorted.length === 0) return { fee: 0, beyondZones: false };

  for (const z of sorted) {
    if (distanceM <= Number(z.upToM)) {
      return { fee: Math.max(0, Math.round(Number(z.fee) || 0)), beyondZones: false };
    }
  }
  const last = sorted[sorted.length - 1];
  const extraKm = Math.ceil((distanceM - Number(last.upToM)) / 1000);
  const perKm = Math.max(0, Math.round(Number(extraPerKm) || 0));
  if (perKm <= 0) return { fee: Math.max(0, Math.round(Number(last.fee) || 0)), beyondZones: true };
  return { fee: Math.max(0, Math.round(Number(last.fee) || 0)) + extraKm * perKm, beyondZones: true };
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  formatted: string;
}

/**
 * Địa chỉ văn bản → tọa độ qua Geoapify Geocoding API (server-side, key trong env).
 * Bias về Việt Nam để tăng độ chính xác địa chỉ trong nước.
 */
export async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<GeocodeResult | null> {
  const q = (address || '').trim();
  if (!q || !apiKey) return null;
  const url =
    'https://api.geoapify.com/v1/geocode/search?text=' +
    encodeURIComponent(q) +
    '&filter=countrycode:vn&bias=countrycode:vn&limit=1&format=json&apiKey=' +
    encodeURIComponent(apiKey);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const first = data?.results?.[0];
  if (!first || typeof first.lat !== 'number' || typeof first.lon !== 'number') return null;
  return { lat: first.lat, lon: first.lon, formatted: first.formatted || q };
}
