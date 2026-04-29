export interface BankInfo {
  code: string;
  name: string;
  logoUrl: string;
  color: string;
}

export const BANK_LIST: BankInfo[] = [
  { code: '341', name: 'Itaú', logoUrl: '/banks/341.svg', color: '#ec7000' },
  { code: '237', name: 'Bradesco', logoUrl: '/banks/237.svg', color: '#cc092f' },
  { code: '260', name: 'Nubank', logoUrl: '/banks/260.svg', color: '#8a05be' },
  { code: '033', name: 'Santander', logoUrl: '/banks/033.svg', color: '#ec0000' },
  { code: '001', name: 'Banco do Brasil', logoUrl: '/banks/001.svg', color: '#fcf800' },
  { code: '104', name: 'Caixa Econômica Federal', logoUrl: '/banks/104.svg', color: '#005ca9' },
  { code: '077', name: 'Inter', logoUrl: '/banks/077.svg', color: '#ff7a00' },
  { code: '336', name: 'C6 Bank', logoUrl: '/banks/336.svg', color: '#242424' },
  { code: '212', name: 'Banco Original', logoUrl: '/banks/212.svg', color: '#00d7a1' },
  { code: '074', name: 'Banco Safra', logoUrl: '/banks/074.svg', color: '#002554' },
  { code: '748', name: 'Sicredi', logoUrl: '/banks/748.svg', color: '#00a859' },
  { code: '756', name: 'Sicoob', logoUrl: '/banks/756.svg', color: '#00ae9d' },
  { code: '041', name: 'Banrisul', logoUrl: '/banks/041.svg', color: '#005aa0' },
  { code: '389', name: 'Mercantil do Brasil', logoUrl: '/banks/389.svg', color: '#d8112c' },
  { code: '422', name: 'Banco Safra', logoUrl: '/banks/422.svg', color: '#002554' },
  { code: '136', name: 'Unicred', logoUrl: '/banks/136.svg', color: '#004a32' },
  { code: '380', name: 'PicPay', logoUrl: '/banks/380.svg', color: '#11c76f' },
  { code: '335', name: 'Banco Digio', logoUrl: '/banks/335.svg', color: '#00204b' },
  { code: '290', name: 'PagSeguro', logoUrl: '/banks/290.svg', color: '#1fb58f' },
  { code: '655', name: 'Banco Votorantim (BV)', logoUrl: '/banks/655.svg', color: '#005bd4' },
];

export function getBankByCode(code: string | null | undefined): BankInfo | null {
  if (!code) return null;
  return BANK_LIST.find((bank) => bank.code === code) || null;
}
