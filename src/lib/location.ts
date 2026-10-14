import type * as LocationType from 'expo-location';

export type AutofillLocation = {
  city: string;
  state: string;
  country: string;
};

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
        if (place && (place.city || place.region)) {
          return {
            city: place.city || place.subregion || place.district || '',
            state: place.region || place.subregion || '',
            country: place.country || 'India',
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
