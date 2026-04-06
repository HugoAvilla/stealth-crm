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

// Types for detailed INSULFILM/PPF service items
export type ProductCategory = 'INSULFILM' | 'PPF';
export type VehicleSize = 'P' | 'M' | 'G';

export interface DetailedServiceItemDB {
  id: number;
  sale_id: number;
  category: ProductCategory;
  product_type_id: number | null;
  region_id: number | null;
  meters_used: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string | null;
  company_id: number;
  service_name: string | null;
  region_code: string | null;
  display_name: string | null;
  is_customized: boolean;
  customization_group: string | null;
  product_type?: {
    brand: string;
    name: string;
    model: string | null;
    category: string;
    light_transmission: string | null;
  } | null;
  region?: {
    name: string;
    description: string | null;
  } | null;
}

export interface SaleWithDetailedItems extends SaleWithDetails {
  detailed_items?: DetailedServiceItemDB[];
}
