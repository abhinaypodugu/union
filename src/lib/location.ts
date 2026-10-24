import type * as LocationType from 'expo-location';

export type AutofillLocation = {
  city: string;
  state: string;
  country: string;
  district?: string;
  subregion?: string;
  street?: string;
  name?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
};

/** Disambiguates Secunderabad from Hyderabad across postal PIN codes, text matches, and coordinates. */
export function isSecunderabadLocation(p: {
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  subregion?: string;
  district?: string;
  street?: string;
  name?: string;
  city?: string;
}): boolean {
  const pCode = (p.postalCode || '').trim();
  const sub = (p.subregion || '').toLowerCase();
  const dist = (p.district || '').toLowerCase();
  const st = (p.street || '').toLowerCase();
  const nm = (p.name || '').toLowerCase();
  const ct = (p.city || '').toLowerCase();

  const isPin = /^(500003|500009|500010|500011|500014|500015|500017|500025|500026|500047|500056|500061|500078|500087|500094)/.test(pCode);
  const isText = [sub, dist, st, nm, ct].some((t) => t.includes('secunderabad'));
  const lat = p.latitude ?? 0;
  const lon = p.longitude ?? 0;
  const isGeo = lat >= 17.41 && lat <= 17.56 && lon >= 78.47 && lon <= 78.58;

  return Boolean(isPin || isText || isGeo);
}

let locationModule: typeof LocationType | null = null;
try {
  locationModule = require('expo-location');
} catch {
  // expo-location not in native runtime (e.g. base commons.apk); calls will use network fallback.
}

export async function autofillFromDevice(): Promise<AutofillLocation | null> {
  // 1. Try native GPS via expo-location if compiled into the native binary
  if (locationModule) {
    try {
      const { status } = await locationModule.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await locationModule.getCurrentPositionAsync({ accuracy: locationModule.Accuracy.Balanced });
        const [place] = await locationModule.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (place) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const pCode = (place.postalCode || '').trim();
          const sub = (place.subregion || '').toLowerCase();
          const dist = (place.district || '').toLowerCase();
          const st = (place.street || '').toLowerCase();
          const nm = (place.name || '').toLowerCase();
          const ct = (place.city || '').toLowerCase();

          const resolvedCity = isSecunderabadLocation({
            latitude: lat,
            longitude: lon,
            postalCode: pCode,
            subregion: place.subregion,
            district: place.district,
            street: place.street,
            name: place.name,
            city: place.city,
          })
            ? 'Secunderabad'
            : (place.city || place.subregion || place.district || '');

          return {
            city: resolvedCity,
            state: place.region || place.subregion || 'Telangana',
            country: place.country || 'India',
            district: place.district || '',
            subregion: place.subregion || '',
            street: place.street || '',
            name: place.name || '',
            postalCode: pCode,
            latitude: lat,
            longitude: lon,
          };
        }
      }
    } catch { }
  }

  // 2. Seamless fallback: reverse IP geolocation if native GPS is uncompiled or ungranted
  try {
    const res = await fetch('https://ipwho.is/', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && (data.city || data.region)) {
        return {
          city: data.city || '',
          state: data.region || '',
          country: data.country || 'India',
        };
      }
    }
  } catch { }

  try {
    const res2 = await fetch('https://ipapi.co/json/');
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && (data2.city || data2.region)) {
        return {
          city: data2.city || '',
          state: data2.region || '',
          country: data2.country_name || 'India',
        };
      }
    }
  } catch { }

  return null;
}
