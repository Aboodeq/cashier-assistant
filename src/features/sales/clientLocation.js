import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const GEO_ERRORS = {
  1: "تم رفض إذن الوصول إلى الموقع — فعّله من إعدادات المتصفح ثم حاول مجدداً",
  2: "تعذّر تحديد الموقع — تأكد من تشغيل خدمة الموقع (GPS) في هاتفك",
  3: "انتهت مهلة تحديد الموقع — حاول مرة أخرى في مكان مكشوف",
};

/** Promise wrapper around the browser's Geolocation API, with Arabic error messages. */
export function getCurrentCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("هذا المتصفح لا يدعم تحديد الموقع"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) => reject(new Error(GEO_ERRORS[err.code] || "تعذّر تحديد الموقع")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export function saveClientLocation(uid, clientId, coords) {
  return updateDoc(doc(db, "users", uid, "salesClients", clientId), {
    location: { ...coords, savedAt: Date.now() },
  });
}

/** Captures the device's current position and saves it as this client's location. */
export async function saveCurrentLocationToClient(uid, clientId) {
  const coords = await getCurrentCoords();
  await saveClientLocation(uid, clientId, coords);
  return coords;
}

export function clearClientLocation(uid, clientId) {
  return updateDoc(doc(db, "users", uid, "salesClients", clientId), { location: null });
}

export const hasLocation = (client) => client?.location?.lat != null && client?.location?.lng != null;

/**
 * Google Maps "directions to" link — needs no API key, routes from wherever the
 * phone currently is, and opens the Google Maps app directly on Android/iOS.
 */
export function directionsUrl(location) {
  return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving`;
}

export function savedOnLabel(location) {
  return location?.savedAt ? new Date(location.savedAt).toISOString().split("T")[0] : "";
}
