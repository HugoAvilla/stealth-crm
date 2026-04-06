// Constantes para o sistema de INSULFILM personalizado
// Estas regiões são hardcoded no frontend — não são entries em vehicle_regions

export const CUSTOM_INSULFILM_REGIONS = [
  { code: 'CUSTOM_SIDE_FRONT', label: 'Laterais dianteiros', order: 2 },
  { code: 'CUSTOM_SIDE_REAR', label: 'Laterais traseiros', order: 3 },
  { code: 'CUSTOM_REAR', label: 'Traseiro', order: 4 },
] as const;

export type CustomRegionCode = typeof CUSTOM_INSULFILM_REGIONS[number]['code'];

// Region codes para o modo simples (regras de consumo)
export const SIMPLE_REGION_CODES = [
  { code: 'WINDSHIELD', label: 'Parabrisa' },
  { code: 'SIDE_REAR', label: 'Laterais + Traseiro' },
  { code: 'SINGLE_WINDOW', label: 'Um (01) Vidro' },
  { code: 'SUNROOF', label: 'Teto Solar' },
] as const;

export type SimpleRegionCode = typeof SIMPLE_REGION_CODES[number]['code'];

// Proporções de consumo por tamanho de veículo (dados reais da loja)
// Parabrisa usa 100% da regra WINDSHIELD
// Lat.Diant / Lat.Tras / Traseiro dividem a regra SIDE_REAR
export const CUSTOM_SPLIT_RATIOS = {
  P: { // Hatch, utilitário cabine simples (Gol, Mobi, Kwid, Onix)
    CUSTOM_SIDE_FRONT: { source: 'SIDE_REAR' as const,  ratio: 0.32 },
    CUSTOM_SIDE_REAR:  { source: 'SIDE_REAR' as const,  ratio: 0.32 },
    CUSTOM_REAR:       { source: 'SIDE_REAR' as const,  ratio: 0.36 },
  },
  M: { // Sedan, hatch médio (Corolla, Civic, Cruze, HB20 sedan)
    CUSTOM_SIDE_FRONT: { source: 'SIDE_REAR' as const,  ratio: 0.30 },
    CUSTOM_SIDE_REAR:  { source: 'SIDE_REAR' as const,  ratio: 0.30 },
    CUSTOM_REAR:       { source: 'SIDE_REAR' as const,  ratio: 0.40 },
  },
  G: { // SUV, camionete (Compass, Tracker, Hilux, S10, Ranger)
    CUSTOM_SIDE_FRONT: { source: 'SIDE_REAR' as const,  ratio: 0.39 },
    CUSTOM_SIDE_REAR:  { source: 'SIDE_REAR' as const,  ratio: 0.39 },
    CUSTOM_REAR:       { source: 'SIDE_REAR' as const,  ratio: 0.22 },
  },
} as const;

export type VehicleSizeKey = keyof typeof CUSTOM_SPLIT_RATIOS;

// Helper: dado um tamanho de veículo e as regras de consumo (region_code → meters),
// calcula os metros de cada região personalizada
export function calculateCustomSplit(
  vehicleSize: VehicleSizeKey,
  consumptionByRegionCode: Record<string, number>
): Record<CustomRegionCode, number> {
  const ratios = CUSTOM_SPLIT_RATIOS[vehicleSize];
  const result: Record<string, number> = {};

  for (const region of CUSTOM_INSULFILM_REGIONS) {
    const config = ratios[region.code];
    const sourceMeters = consumptionByRegionCode[config.source] || 0;
    result[region.code] = parseFloat((sourceMeters * config.ratio).toFixed(2));
  }

  return result as Record<CustomRegionCode, number>;
}
