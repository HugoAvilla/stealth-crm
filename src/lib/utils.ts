import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const openWhatsApp = (phone: string, message?: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountryCode = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const url = message 
    ? `https://web.whatsapp.com/send?phone=${phoneWithCountryCode}&text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com/send?phone=${phoneWithCountryCode}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
