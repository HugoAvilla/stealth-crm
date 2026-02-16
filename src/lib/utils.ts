import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const openWhatsApp = (phone: string, message?: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountryCode = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  if (message) {
    return `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${phoneWithCountryCode}`;
};
