/** Shared option lists (kept out of component files so fast refresh works). */

export const CLIENT_CATEGORIES = [
  { value: "new", label: "جديد" },
  { value: "regular", label: "دائم" },
  { value: "vip", label: "مميز" },
  { value: "inactive", label: "غير نشط" },
];

export const VISIT_OUTCOMES = [
  { value: "successful", label: "ناجحة", icon: "fa-solid fa-circle-check", tone: "success" },
  { value: "no_answer", label: "لا يوجد رد", icon: "fa-solid fa-phone-slash", tone: "warning" },
  { value: "closed", label: "مغلق", icon: "fa-solid fa-store-slash", tone: "neutral" },
  { value: "postponed", label: "مؤجلة", icon: "fa-solid fa-clock", tone: "info" },
];

export const outcomeMeta = (value) => VISIT_OUTCOMES.find((o) => o.value === value) || VISIT_OUTCOMES[0];

export const EXPENSE_CATEGORIES = [
  { value: "fuel", label: "وقود", icon: "fa-solid fa-gas-pump" },
  { value: "maintenance", label: "صيانة", icon: "fa-solid fa-wrench" },
  { value: "tolls", label: "رسوم طرق", icon: "fa-solid fa-road" },
  { value: "parking", label: "مواقف", icon: "fa-solid fa-square-parking" },
  { value: "insurance", label: "تأمين", icon: "fa-solid fa-shield-halved" },
  { value: "fines", label: "مخالفات", icon: "fa-solid fa-triangle-exclamation" },
  { value: "meals", label: "ضيافة وطعام", icon: "fa-solid fa-mug-hot" },
  { value: "other", label: "أخرى", icon: "fa-solid fa-ellipsis" },
];

export const expenseCategory = (value) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
