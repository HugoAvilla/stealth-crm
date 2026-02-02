// Unified sale types for real Supabase data

export interface SaleClient {
  id: number;
  name: string;
  phone: string;
}

export interface SaleVehicle {
  id: number;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  size: string | null;
}

export interface SaleService {
  id: number;
  name: string;
  base_price: number;
}

export interface SaleItem {
  id: number;
  service_id: number | null;
  quantity: number | null;
  unit_price: number;
  total_price: number;
  service: SaleService | null;
}

export interface SaleWithDetails {
  id: number;
  client_id: number | null;
  vehicle_id: number | null;
  sale_date: string;
  subtotal: number;
  discount: number | null;
  total: number;
  payment_method: string | null;
  status: string | null;
  is_open: boolean | null;
  observations: string | null;
  created_at: string | null;
  client: SaleClient | null;
  vehicle: SaleVehicle | null;
  sale_items: SaleItem[];
}
