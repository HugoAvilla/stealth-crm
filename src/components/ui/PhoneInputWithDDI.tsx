import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { code: "+55", flag: "🇧🇷", name: "Brasil", mask: "(00) 00000-0000", maxDigits: 11 },
  { code: "+1", flag: "🇺🇸", name: "EUA", mask: "(000) 000-0000", maxDigits: 10 },
  { code: "+1", flag: "🇨🇦", name: "Canadá", mask: "(000) 000-0000", maxDigits: 10 },
  { code: "+54", flag: "🇦🇷", name: "Argentina", mask: "00 0000-0000", maxDigits: 10 },
  { code: "+595", flag: "🇵🇾", name: "Paraguai", mask: "000 000 000", maxDigits: 9 },
  { code: "+598", flag: "🇺🇾", name: "Uruguai", mask: "00 000 000", maxDigits: 8 },
  { code: "+57", flag: "🇨🇴", name: "Colômbia", mask: "000 000 0000", maxDigits: 10 },
  { code: "+52", flag: "🇲🇽", name: "México", mask: "00 0000 0000", maxDigits: 10 },
  { code: "+56", flag: "🇨🇱", name: "Chile", mask: "0 0000 0000", maxDigits: 9 },
  { code: "+51", flag: "🇵🇪", name: "Peru", mask: "000 000 000", maxDigits: 9 },
  { code: "+591", flag: "🇧🇴", name: "Bolívia", mask: "0000 0000", maxDigits: 8 },
  { code: "+351", flag: "🇵🇹", name: "Portugal", mask: "000 000 000", maxDigits: 9 },
  { code: "+34", flag: "🇪🇸", name: "Espanha", mask: "000 000 000", maxDigits: 9 },
  { code: "+39", flag: "🇮🇹", name: "Itália", mask: "000 000 0000", maxDigits: 10 },
  { code: "+33", flag: "🇫🇷", name: "França", mask: "0 00 00 00 00", maxDigits: 9 },
  { code: "+49", flag: "🇩🇪", name: "Alemanha", mask: "000 00000000", maxDigits: 11 },
  { code: "+44", flag: "🇬🇧", name: "Reino Unido", mask: "0000 000000", maxDigits: 10 },
  { code: "+81", flag: "🇯🇵", name: "Japão", mask: "00 0000 0000", maxDigits: 10 },
  { code: "+86", flag: "🇨🇳", name: "China", mask: "000 0000 0000", maxDigits: 11 },
  { code: "+91", flag: "🇮🇳", name: "Índia", mask: "00000 00000", maxDigits: 10 },
  { code: "+971", flag: "🇦🇪", name: "Emirados Árabes", mask: "00 000 0000", maxDigits: 9 },
] as const;

// Use unique key for countries with same code (e.g., US and Canada both +1)
const getCountryKey = (c: typeof COUNTRIES[number]) => `${c.code}-${c.name}`;

interface PhoneInputWithDDIProps {
  value: string;
  onChange: (fullPhone: string) => void;
  defaultCountryCode?: string;
}

const formatBrazilPhone = (digits: string) => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export default function PhoneInputWithDDI({ value, onChange, defaultCountryCode = "+55" }: PhoneInputWithDDIProps) {
  // Parse initial value to extract DDI
  const parseInitialValue = () => {
    if (!value) return { ddi: defaultCountryCode, local: "" };
    // Try to find matching country code from value
    for (const c of [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)) {
      if (value.startsWith(c.code)) {
        return { ddi: c.code, local: value.slice(c.code.length).trim() };
      }
    }
    return { ddi: defaultCountryCode, local: value };
  };

  const initial = parseInitialValue();
  const [selectedCountryKey, setSelectedCountryKey] = useState(() => {
    const found = COUNTRIES.find(c => c.code === initial.ddi);
    return found ? getCountryKey(found) : getCountryKey(COUNTRIES[0]);
  });
  const [localPhone, setLocalPhone] = useState(initial.local);

  const selectedCountry = COUNTRIES.find(c => getCountryKey(c) === selectedCountryKey) || COUNTRIES[0];

  const handleCountryChange = (key: string) => {
    setSelectedCountryKey(key);
    const country = COUNTRIES.find(c => getCountryKey(c) === key) || COUNTRIES[0];
    onChange(`${country.code} ${localPhone}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, selectedCountry.maxDigits);
    let formatted = digits;
    if (selectedCountry.code === "+55") {
      formatted = formatBrazilPhone(digits);
    }
    setLocalPhone(formatted);
    onChange(`${selectedCountry.code} ${formatted}`);
  };

  return (
    <div className="flex gap-1">
      <Select value={selectedCountryKey} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-[110px] shrink-0">
          <SelectValue>
            <span className="flex items-center gap-1 text-sm">
              {selectedCountry.flag} {selectedCountry.code}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {COUNTRIES.map((country) => (
            <SelectItem key={getCountryKey(country)} value={getCountryKey(country)}>
              <span className="flex items-center gap-2">
                {country.flag} {country.name} ({country.code})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        placeholder={selectedCountry.mask}
        value={localPhone}
        onChange={handlePhoneChange}
        className="flex-1"
      />
    </div>
  );
}
