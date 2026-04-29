export interface BankInfo {
  code: string;
  name: string;
  logoUrl: string;
  color: string;
}

export const BANK_LIST: BankInfo[] = [
  { code: '341', name: 'Itaú', logoUrl: '/banks/341.png', color: '#ec7000' },
  { code: '237', name: 'Bradesco', logoUrl: '/banks/237.png', color: '#cc092f' },
  { code: '260', name: 'Nubank', logoUrl: '/banks/260.png', color: '#8a05be' },
  { code: '033', name: 'Santander', logoUrl: '/banks/033.png', color: '#ec0000' },
  { code: '001', name: 'Banco do Brasil', logoUrl: '/banks/001.png', color: '#fcf800' },
  { code: '104', name: 'Caixa Econômica Federal', logoUrl: '/banks/104.png', color: '#005ca9' },
  { code: '077', name: 'Inter', logoUrl: '/banks/077.png', color: '#ff7a00' },
  { code: '336', name: 'C6 Bank', logoUrl: '/banks/336.png', color: '#242424' },
  { code: '212', name: 'Banco Original', logoUrl: '/banks/212.png', color: '#00d7a1' },
  { code: '074', name: 'Banco Safra', logoUrl: '/banks/074.png', color: '#002554' },
  { code: '422', name: 'Banco Safra', logoUrl: '/banks/422.png', color: '#002554' },
  { code: '748', name: 'Sicredi', logoUrl: '/banks/748.png', color: '#00a859' },
  { code: '756', name: 'Sicoob', logoUrl: '/banks/756.png', color: '#00ae9d' },
  { code: '041', name: 'Banrisul', logoUrl: '/banks/041.png', color: '#005aa0' },
  { code: '389', name: 'Mercantil do Brasil', logoUrl: '/banks/389.png', color: '#d8112c' },
  { code: '136', name: 'Unicred', logoUrl: '/banks/136.png', color: '#004a32' },
  { code: '380', name: 'PicPay', logoUrl: '/banks/380.png', color: '#11c76f' },
  { code: '335', name: 'Banco Digio', logoUrl: '/banks/335.png', color: '#00204b' },
  { code: '290', name: 'PagSeguro', logoUrl: '/banks/290.png', color: '#1fb58f' },
  { code: '655', name: 'Banco Votorantim (BV)', logoUrl: '/banks/655.png', color: '#005bd4' },
  { code: '623', name: 'Banco BMG', logoUrl: '/banks/623.png', color: '#ff5f00' },
  { code: '626', name: 'Banco Pan', logoUrl: '/banks/626.png', color: '#00c1ff' },
  { code: '348', name: 'Banco XP', logoUrl: '/banks/348.png', color: '#000000' },
  { code: '746', name: 'Banco Modal', logoUrl: '/banks/746.png', color: '#1d1d1d' },
  { code: '208', name: 'BTG Pactual', logoUrl: '/banks/208.png', color: '#002a4a' },
  { code: '004', name: 'Banco do Nordeste', logoUrl: '/banks/004.png', color: '#004c99' },
  { code: '707', name: 'Banco Daycoval', logoUrl: '/banks/707.png', color: '#003366' },
];

export function getBankByCode(code: string | null | undefined): BankInfo | null {
  if (!code) return null;
  return BANK_LIST.find((bank) => bank.code === code) || null;
}
