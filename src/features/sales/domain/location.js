import { formatDate, isoOf } from "./dates";

const GEO_ERRORS = {
  1: "تم رفض إذن الوصول إلى الموقع — فعّله من إعدادات المتصفح ثم حاول مجدداً",
  2: "تعذّر تحديد الموقع — تأكد من تشغيل خدمة الموقع (GPS) في هاتفك",
  3: "انتهت مهلة تحديد الموقع — حاول مرة أخرى في مكان مكشوف",
};

/** Promise wrapper around the browser's Geolocation API, with Arabic errors. */
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

export const hasLocation = (client) => client?.location?.lat != null && client?.location?.lng != null;

/**
 * Google Maps "directions to" link — needs no API key, routes from wherever
 * the phone currently is, and opens the Maps app directly on Android/iOS.
 */
export const directionsUrl = (location) =>
  `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving`;

export const mapUrl = (location) =>
  `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

export const coordsLabel = (location) =>
  location ? `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}` : "";

export const savedOnLabel = (location) =>
  location?.savedAt ? formatDate(isoOf(new Date(location.savedAt))) : "";
