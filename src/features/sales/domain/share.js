/*
 * Sharing documents over WhatsApp — in the field that's often faster than
 * finding a printer, and it's how customers here expect to receive an invoice
 * or a statement.
 */

/** Local Syrian numbers (09xxxxxxxx) become international (9639xxxxxxxx). */
export function waNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("963")) return digits;
  if (digits.startsWith("0")) return `963${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("9")) return `963${digits}`;
  return digits;
}

export const canWhatsApp = (phone) => waNumber(phone).length >= 9;
export const whatsappUrl = (phone, text) =>
  `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
export const telUrl = (phone) => `tel:${String(phone || "").replace(/\s/g, "")}`;

/** Native share sheet when available, WhatsApp otherwise. */
export async function shareText(text, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      return; // user dismissed the share sheet
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
