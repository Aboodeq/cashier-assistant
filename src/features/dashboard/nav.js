/** Sidebar sections (desktop) and the phone's bottom tab bar for الصندوق. */

export const DASHBOARD_NAV = [
  { items: [{ to: "/dashboard", icon: "fa-solid fa-house", label: "الرئيسية", end: true }] },
  {
    label: "الإدارة",
    items: [
      { to: "/dashboard/companies", icon: "fa-solid fa-building", label: "الشركات" },
      { to: "/dashboard/representatives", icon: "fa-solid fa-users", label: "المناديب" },
      { to: "/dashboard/sessions", icon: "fa-solid fa-folder-open", label: "الجلسات" },
    ],
  },
];

export const DASHBOARD_TABS = [
  { to: "/dashboard", icon: "fa-solid fa-house", label: "الرئيسية", end: true },
  { to: "/dashboard/companies", icon: "fa-solid fa-building", label: "الشركات" },
  { to: "/dashboard/representatives", icon: "fa-solid fa-users", label: "المناديب" },
  { to: "/dashboard/sessions", icon: "fa-solid fa-folder-open", label: "الجلسات" },
];
