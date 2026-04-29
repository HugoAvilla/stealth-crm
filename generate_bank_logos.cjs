const fs = require('fs');
const path = require('path');

const BANK_LIST = [
  { code: '341', name: 'Itaú', color: '#ec7000' },
  { code: '237', name: 'Bradesco', color: '#cc092f' },
  { code: '260', name: 'Nubank', color: '#8a05be' },
  { code: '033', name: 'Santander', color: '#ec0000' },
  { code: '001', name: 'BB', color: '#fcf800' },
  { code: '104', name: 'Caixa', color: '#005ca9' },
  { code: '077', name: 'Inter', color: '#ff7a00' },
  { code: '336', name: 'C6 Bank', color: '#242424' },
  { code: '212', name: 'Original', color: '#00d7a1' },
  { code: '074', name: 'Safra', color: '#002554' },
  { code: '748', name: 'Sicredi', color: '#00a859' },
  { code: '756', name: 'Sicoob', color: '#00ae9d' },
  { code: '041', name: 'Banrisul', color: '#005aa0' },
  { code: '389', name: 'Mercantil', color: '#d8112c' },
  { code: '422', name: 'Safra', color: '#002554' },
  { code: '136', name: 'Unicred', color: '#004a32' },
  { code: '380', name: 'PicPay', color: '#11c76f' },
  { code: '335', name: 'Digio', color: '#00204b' },
  { code: '290', name: 'PagSeguro', color: '#1fb58f' },
  { code: '655', name: 'BV', color: '#005bd4' },
];

const dir = path.join(__dirname, 'public', 'banks');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

BANK_LIST.forEach(bank => {
  const initial = bank.name.substring(0, 2).toUpperCase();
  const textColor = bank.code === '001' ? '#000000' : '#ffffff'; // BB is yellow, needs black text
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="${bank.color}" />
  <text x="16" y="21" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${textColor}" text-anchor="middle">${initial}</text>
</svg>`;

  fs.writeFileSync(path.join(dir, `${bank.code}.svg`), svg);
});

console.log('SVG bank logos generated successfully!');
