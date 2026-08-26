export function formatMoney(val) {
  return (Number(val) || 0).toLocaleString();
}

/** Sums the currency fields across a list of deposit/withdrawal entries. */
export function sumEntries(entries) {
  return {
    newSYP: entries.reduce((a, e) => a + (Number(e.newSYP) || 0), 0),
    usd: entries.reduce((a, e) => a + (Number(e.usd) || 0), 0),
  };
}

/** Deposits minus withdrawals, per currency. */
export function netTotals(deposits, withdrawals) {
  return {
    newSYP: deposits.newSYP - withdrawals.newSYP,
    usd: deposits.usd - withdrawals.usd,
  };
}

export function formatReportTimestamp(date = new Date()) {
  return `${date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })} - ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function formatEntryDate(entry, fallback = "-") {
  const raw = entry?.createdAt;
  const d =
    typeof raw === "number"
      ? new Date(raw)
      : raw?.toDate
        ? raw.toDate()
        : raw
          ? new Date(raw)
          : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().split("T")[0] : fallback;
}

export function amountLines(entry, money = formatMoney) {
  const lines = [];
  if (Number(entry.newSYP) > 0) lines.push({ amount: money(entry.newSYP), unit: "ليرة سورية" });
  if (Number(entry.usd) > 0) lines.push({ amount: money(entry.usd), unit: "دولار أمريكي" });
  return lines.length ? lines : [{ amount: "0", unit: "" }];
}
