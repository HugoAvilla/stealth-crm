import { describe, it, expect } from 'vitest';
import { BANK_LIST, getBankByCode } from '../bankCatalog';

describe('bankCatalog', () => {
  it('should export a BANK_LIST with around 20 banks', () => {
    expect(BANK_LIST.length).toBeGreaterThanOrEqual(20);
    // Ensure essential banks are present
    const codes = BANK_LIST.map(b => b.code);
    expect(codes).toContain('341'); // Itaú
    expect(codes).toContain('237'); // Bradesco
    expect(codes).toContain('260'); // Nubank
    expect(codes).toContain('033'); // Santander
    expect(codes).toContain('001'); // BB
  });

  it('should have required fields for each bank', () => {
    for (const bank of BANK_LIST) {
      expect(bank).toHaveProperty('code');
      expect(bank).toHaveProperty('name');
      expect(bank).toHaveProperty('logoUrl');
      expect(bank).toHaveProperty('color');
      
      expect(bank.logoUrl).toBe(`/banks/${bank.code}.svg`);
    }
  });

  describe('getBankByCode', () => {
    it('should return the correct bank for a valid code', () => {
      const itau = getBankByCode('341');
      expect(itau).not.toBeNull();
      expect(itau?.name).toBe('Itaú');
    });

    it('should return null for an invalid code', () => {
      const bank = getBankByCode('999');
      expect(bank).toBeNull();
    });

    it('should return null for null or undefined', () => {
      expect(getBankByCode(null)).toBeNull();
      expect(getBankByCode(undefined)).toBeNull();
      expect(getBankByCode('')).toBeNull();
    });
  });
});
