/** Sidebar sections (desktop) and the phone's bottom tab bar. */

export const SALES_NAV = [
  { items: [{ to: "/sales", icon: "fa-solid fa-house", label: "اليوم", end: true }] },
  {
    label: "المبيعات",
    items: [
      { to: "/sales/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "الفواتير" },
      { to: "/sales/collections", icon: "fa-solid fa-hand-holding-dollar", label: "التحصيلات" },
      { to: "/sales/clients", icon: "fa-solid fa-users", label: "العملاء" },
      { to: "/sales/visits", icon: "fa-solid fa-route", label: "الزيارات" },
    ],
  },
  {
    label: "المخزون",
    items: [
      { to: "/sales/stock", icon: "fa-solid fa-truck-ramp-box", label: "مخزون السيارة" },
      { to: "/sales/products", icon: "fa-solid fa-boxes-stacked", label: "المنتجات" },
      { to: "/sales/promotions", icon: "fa-solid fa-tags", label: "عروض الشركة" },
    ],
  },
  {
    label: "المالية",
    items: [
      { to: "/sales/expenses", icon: "fa-solid fa-gas-pump", label: "المصاريف" },
      { to: "/sales/goals", icon: "fa-solid fa-bullseye", label: "الأهداف والعمولات" },
      { to: "/sales/reports", icon: "fa-solid fa-chart-column", label: "التقارير" },
    ],
  },
  { items: [{ to: "/sales/settings", icon: "fa-solid fa-gear", label: "الإعدادات" }] },
];

export const SALES_TABS = [
  { to: "/sales", icon: "fa-solid fa-house", label: "اليوم", end: true },
  { to: "/sales/clients", icon: "fa-solid fa-users", label: "العملاء" },
  { to: "/sales/invoices/new", icon: "fa-solid fa-plus", label: "بيع", primary: true },
  {
    to: "/sales/invoices",
    icon: "fa-solid fa-file-invoice-dollar",
    label: "الفواتير",
    exclude: ["/sales/invoices/new"],
  },
];
