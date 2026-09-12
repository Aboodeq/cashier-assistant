import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

const noop = () => {};
const fallback = { success: noop, error: noop, info: noop };

/** toast.success(message, { action: { label, onClick }, duration }) */
export function useToast() {
  return useContext(ToastContext) ?? fallback;
}
