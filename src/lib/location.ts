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
  // expo-location not in native runtime (e.g. base commons.apk); calls will no-op.
}

export async function autofillFromDevice(): Promise<AutofillLocation | null> {
  if (!locationModule) return null;
  try {
    const { status } = await locationModule.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await locationModule.getCurrentPositionAsync({ accuracy: locationModule.Accuracy.Balanced });
    const [place] = await locationModule.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    if (!place) return null;
    return {
      city: place.city || place.subregion || place.district || '',
      state: place.region || place.subregion || '',
      country: place.country || 'India',
    };
  } catch {
    return null;
  }
}
