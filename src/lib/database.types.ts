// Database types for Supabase integration

export type AppRole = 'ADMIN' | 'VENDEDOR' | 'PRODUCAO' | 'NENHUM';

export interface Profile {
  id: number;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  user_id: string;
  role: AppRole;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  cpf_cnpj: string | null;
  origem: string | null;
  birth_date: string | null;
  cep: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  client_id: number | null;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  size: 'P' | 'M' | 'G' | null;
  color: string | null;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  commission_percentage: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  sale_date: string;
  client_id: number | null;
  vehicle_id: number | null;
  seller_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string | null;
  is_open: boolean;
  status: 'Fechada' | 'Aberta' | 'Cancelada';
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number | null;
  service_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Space {
  id: number;
  name: string;
  client_id: number | null;
  vehicle_id: number | null;
  status: 'disponivel' | 'ocupado';
  tag: 'Em andamento' | 'Pausado' | 'Em espera' | 'Finalizado' | null;
  entry_date: string | null;
  entry_time: string | null;
  exit_date: string | null;
  exit_time: string | null;
  observations: string | null;
  photos: string[];
  discount: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  account_type: string | null;
  initial_balance: number;
  current_balance: number;
  is_main: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'Entrada' | 'Saida';
  color: string | null;
  created_at: string;
}

export interface Subcategory {
  id: number;
  category_id: number | null;
  name: string;
  type: 'Entrada' | 'Saida';
  color: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  transaction_date: string;
  name: string;
  amount: number;
  type: 'Entrada' | 'Saida' | 'Transferencia';
  account_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  payment_method: string | null;
  description: string | null;
  is_paid: boolean;
  sale_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: number;
  transfer_date: string;
  amount: number;
  from_account_id: number | null;
  to_account_id: number | null;
  description: string | null;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  brand: string | null;
  type: string | null;
  unit: 'Metros' | 'Litros' | 'Unidades';
  current_stock: number;
  minimum_stock: number;
  average_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  material_id: number | null;
  movement_type: 'Entrada' | 'Saida';
  quantity: number;
  reason: string | null;
  user_id: string | null;
  created_at: string;
}

export interface ConsumptionRule {
  id: number;
  material_type: string;
  size_p: number;
  size_m: number;
  size_g: number;
  created_at: string;
  updated_at: string;
}

export interface Warranty {
  id: number;
  client_id: number | null;
  vehicle_id: number | null;
  sale_id: number | null;
  warranty_type: string;
  issue_date: string;
  expiry_date: string;
  warranty_text: string | null;
  status: 'Pendente' | 'Enviado';
  created_at: string;
}

export interface WarrantyTemplate {
  id: number;
  name: string;
  service_id: number | null;
  validity_months: number;
  terms: string | null;
  coverage: string | null;
  restrictions: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: number;
  company_name: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  cep: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: number;
  client_id: number | null;
  vehicle_id: number | null;
  stage: 'Agendados' | 'Recebidos' | 'Em Execução' | 'Controle de Qualidade' | 'Pronto' | 'Entregue';
  service_name: string | null;
  scheduled_time: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  client_id: number | null;
  content: string;
  sender: 'client' | 'company';
  is_read: boolean;
  created_at: string;
}

// Extended types with relations
export interface ClientWithVehicles extends Client {
  vehicles: Vehicle[];
}

export interface SaleWithDetails extends Sale {
  client: Client | null;
  vehicle: Vehicle | null;
  sale_items: (SaleItem & { service: Service | null })[];
}

export interface TransactionWithRelations extends Transaction {
  account: Account | null;
  category: Category | null;
  subcategory: Subcategory | null;
}
