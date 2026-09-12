/*
 * All dates in the sales module are plain local "YYYY-MM-DD" strings.
 * They are built from the device's local calendar — never from toISOString(),
 * which is UTC and would stamp sales made after midnight in Syria (UTC+3)
 * with the previous day.
 */

const MONTHS = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];
const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function isoOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const todayISO = () => isoOf(new Date());
export const nowMs = () => Date.now();
export const monthOf = (iso) => String(iso || "").slice(0, 7);
export const thisMonthISO = () => monthOf(todayISO());

export function parseISO(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDays(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

export function startOfMonth(iso = todayISO()) {
  return `${monthOf(iso)}-01`;
}

export function endOfMonth(iso = todayISO()) {
  const d = parseISO(iso);
  return isoOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function startOfYear(iso = todayISO()) {
  return `${String(iso).slice(0, 4)}-01-01`;
}

/** The current week, starting on Saturday (the Syrian work week). */
export function startOfWeek(iso = todayISO()) {
  const d = parseISO(iso);
  const back = (d.getDay() + 1) % 7;
  return addDays(iso, -back);
}

export function lastMonthRange(iso = todayISO()) {
  const d = parseISO(iso);
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return { from: isoOf(prev), to: isoOf(new Date(prev.getFullYear(), prev.getMonth() + 1, 0)) };
}

export function formatDate(iso, { weekday = false } = {}) {
  if (!iso) return "—";
  const d = parseISO(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return weekday ? `${WEEKDAYS[d.getDay()]} ${base}` : base;
}

export function formatShortDate(iso) {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatMonthLabel(ym) {
  const [y, m] = String(ym || "").split("-").map(Number);
  if (!y || !m) return String(ym || "—");
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const h = d.getHours();
  const suffix = h < 12 ? "ص" : "م";
  const h12 = h % 12 || 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(ms) {
  if (!ms) return "—";
  return `${formatDate(isoOf(new Date(ms)))} · ${formatTime(ms)}`;
}

/** "اليوم" / "أمس" / "غداً", otherwise a short date. */
export function relativeDay(iso) {
  const today = todayISO();
  if (iso === today) return "اليوم";
  if (iso === addDays(today, -1)) return "أمس";
  if (iso === addDays(today, 1)) return "غداً";
  return formatShortDate(iso);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "نهارك سعيد";
  return "مساء الخير";
}

export const inRange = (iso, from, to) => Boolean(iso) && (!from || iso >= from) && (!to || iso <= to);
