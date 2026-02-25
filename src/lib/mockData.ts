// ========================================
// TYPE DEFINITIONS ONLY - NO MOCK DATA
// All data is fetched from Supabase
// ========================================

// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'vendedor';
  avatar: string | null;
  created_at: string;
  phone?: string;
  is_active?: boolean;
}

// Vehicle Types
export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
  size: 'P' | 'M' | 'G';
}

// Client Types
export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  cpf: string | null;
  origem: 'Instagram' | 'Google' | 'Indicação' | 'Passante';
  created_at: string;
  vehicles: Vehicle[];
  total_spent: number;
  sales_count: number;
}

// Service Types
export interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  commission_percent: number;
  post_sale_days: number;
  auto_schedule: boolean;
  sales_count: number;
  total_revenue: number;
}

// Sale Types
export interface Sale {
  id: number;
  client_id: number;
  vehicle_id: number;
  services: number[];
  date: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'Pix' | 'Dinheiro' | 'Débito' | 'Crédito' | 'Boleto' | 'Transferência';
  status: 'Fechada' | 'Aberta';
  employee_id: number;
  notes?: string;
}

// Financial Account Types
export interface Account {
  id: number;
  name: string;
  type: 'Conta Corrente' | 'Poupança' | 'Carteira' | 'Investimento';
  balance: number;
  is_primary: boolean;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  type: 'entrada' | 'saida';
  color: string;
  parent_id?: number;
}

// Transaction Types
export interface Transaction {
  id: number;
  type: 'entrada' | 'saida' | 'transferencia';
  amount: number;
  description: string;
  category_id?: number;
  account_id: number;
  to_account_id?: number;
  date: string;
  status: 'confirmado' | 'pendente';
  payment_method?: string;
  sale_id?: number;
}

// Slot Types
export interface Slot {
  id: number;
  name: string;
  status: 'disponivel' | 'ocupada' | 'manutencao';
  sale_id?: number;
  started_at?: string;
  checklist_photos?: string[];
  work_status?: 'em_andamento' | 'pausado' | 'em_espera' | 'finalizado';
}

// Material Types
export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
}

// Consumption Rule Types
export interface ConsumptionRule {
  id: number;
  material_id: number;
  service_id: number;
  vehicle_size: 'P' | 'M' | 'G';
  quantity: number;
}

// Warranty Template Types
export interface WarrantyTemplate {
  id: number;
  name: string;
  service_id: number;
  validity_months: number;
  terms: string;
}

// Issued Warranty Types
export interface IssuedWarranty {
  id: number;
  template_id: number;
  sale_id: number;
  client_id: number;
  vehicle_id: number;
  issued_at: string;
  expires_at: string;
  certificate_number: string;
}

// Report Types
export interface ReportType {
  id: string;
  name: string;
  description: string;
  group: 'financeiro' | 'vendas' | 'operacional' | 'clientes';
  formats: ('pdf' | 'xlsx')[];
}

// Report types - Only PDF format
export const reportTypes: ReportType[] = [
  { id: "dfc", name: "DFC - Demonstração de Fluxo de Caixa", description: "Relatório completo de entradas e saídas", group: "financeiro", formats: ["pdf", "xlsx"] },
  { id: "dre", name: "DRE - Demonstração de Resultado", description: "Resultado do exercício por período", group: "financeiro", formats: ["pdf", "xlsx"] },
  { id: "vendas_periodo", name: "Vendas por Período", description: "Todas as vendas em um intervalo de datas", group: "vendas", formats: ["pdf", "xlsx"] },
  { id: "vendas_servico", name: "Vendas por Serviço", description: "Performance de cada serviço", group: "vendas", formats: ["pdf", "xlsx"] },
  { id: "vendas_vendedor", name: "Vendas por Vendedor", description: "Comissões e performance por vendedor", group: "vendas", formats: ["pdf", "xlsx"] },
  { id: "clientes_ativos", name: "Clientes Ativos", description: "Lista de clientes com vendas recentes", group: "clientes", formats: ["pdf", "xlsx"] },
  { id: "clientes_inativos", name: "Clientes Inativos", description: "Clientes sem compras há mais de 90 dias", group: "clientes", formats: ["pdf", "xlsx"] },
  { id: "ocupacao_vagas", name: "Ocupação de Vagas", description: "Histórico de ocupação do espaço", group: "operacional", formats: ["pdf", "xlsx"] },
  { id: "estoque_movimento", name: "Movimentação de Estoque", description: "Entradas e saídas de materiais", group: "operacional", formats: ["pdf", "xlsx"] },
  { id: "extrato_conta", name: "Extrato de Conta", description: "Movimentações de uma conta específica", group: "financeiro", formats: ["pdf", "xlsx"] },
  { id: "clientes_marketing", name: "Lista de Marketing", description: "Nome, telefone e email para campanhas", group: "clientes", formats: ["pdf", "xlsx"] },
  { id: "clientes_completo", name: "Lista Completa (Backup)", description: "Todos os dados de clientes, veículos e serviços", group: "clientes", formats: ["pdf", "xlsx"] }
];

// Company Settings Types
export interface CompanySettings {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string | null;
  primary_color: string;
}

// Pipeline Item Types
export interface PipelineItem {
  id: number;
  sale_id: number;
  stage: 'Agendados' | 'Recebidos' | 'Em Execução' | 'Controle Qualidade' | 'Pronto' | 'Entregue';
  scheduled_time?: string;
  is_urgent: boolean;
}

// Chat Message Types
export interface ChatMessage {
  id: number;
  client_id: number;
  content: string;
  sender: 'client' | 'company';
  timestamp: string;
  read: boolean;
}

// ========================================
// EMPTY DATA ARRAYS - Data comes from Supabase
// ========================================

export const users: User[] = [];
export const clients: Client[] = [];
export const services: Service[] = [];
export const sales: Sale[] = [];
export const accounts: Account[] = [];
export const categories: Category[] = [];
export const transactions: Transaction[] = [];
export const slots: Slot[] = [];
export const materials: Material[] = [];
export const consumptionRules: ConsumptionRule[] = [];
export const warrantyTemplates: WarrantyTemplate[] = [];
export const issuedWarranties: IssuedWarranty[] = [];
export const pipelineItems: PipelineItem[] = [];
export const clientMessages: ChatMessage[] = [];

// Default company settings (will be overridden by Supabase data)
export const companySettings: CompanySettings = {
  name: "WFE Evolution",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  logo_url: null,
  primary_color: "#3b82f6"
};

// ========================================
// HELPER FUNCTIONS (for backward compatibility)
// These return undefined as data should be fetched from Supabase
// ========================================

export const getClientById = (id: number) => clients.find(c => c.id === id);
export const getVehicleById = (id: number) => {
  for (const client of clients) {
    const vehicle = client.vehicles.find(v => v.id === id);
    if (vehicle) return vehicle;
  }
  return null;
};
export const getServiceById = (id: number) => services.find(s => s.id === id);
export const getUserById = (id: number) => users.find(u => u.id === id);
export const getAccountById = (id: number) => accounts.find(a => a.id === id);
export const getCategoryById = (id: number) => categories.find(c => c.id === id);
export const getMaterialById = (id: number) => materials.find(m => m.id === id);
