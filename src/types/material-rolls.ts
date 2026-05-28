export interface MaterialRoll {
  id: number;
  material_id: number;
  company_id: number;
  initial_length_meters: number;
  remaining_length_meters: number;
  width_meters: number | null;
  status: 'fechada' | 'aberta' | 'esgotada';
  source: 'manual' | 'migracao' | 'entrada';
  opened_at: string | null;
  exhausted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockReuseItem {
  id: number;
  material_id: number;
  company_id: number;
  length_meters: number;
  width_meters: number | null;
  status: 'disponivel' | 'encerrado';
  reason: string | null;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumedRollItem {
  roll_id: number;
  meters: number;
  new_remaining: number;
  new_status: 'fechada' | 'aberta' | 'esgotada';
}

export interface ConsumeRollsResult {
  warning: boolean;
  total_consumed?: number;
  consumed?: ConsumedRollItem[];
  required_meters?: number;
  available_meters?: number;
  missing_meters?: number;
}

export interface ReversedRollItem {
  roll_id: number;
  meters_returned: number;
  new_remaining: number;
  new_status: 'fechada' | 'aberta' | 'esgotada';
}

export interface ReverseRollsResult {
  reversed: ReversedRollItem[];
}
