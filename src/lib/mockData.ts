// Mock Users
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

export const users: User[] = [
  {
    id: 1,
    name: "Admin Sistema",
    email: "admin@wfe.com.br",
    password: "admin123",
    role: "admin",
    avatar: null,
    created_at: "2025-06-15",
    phone: "+55 (17) 99999-0000",
    is_active: true
  },
  {
    id: 2,
    name: "Carlos Vendedor",
    email: "vendedor1@wfe.com.br",
    password: "vend123",
    role: "vendedor",
    avatar: null,
    created_at: "2025-08-20",
    phone: "+55 (11) 98888-1111",
    is_active: true
  },
  {
    id: 3,
    name: "Ana Vendedora",
    email: "vendedor2@wfe.com.br",
    password: "vend123",
    role: "vendedor",
    avatar: null,
    created_at: "2025-09-10",
    phone: "+55 (21) 97777-2222",
    is_active: true
  }
];

// Mock Vehicles
export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
  size: 'P' | 'M' | 'G';
}

// Mock Clients
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

export const clients: Client[] = [
  {
    id: 1,
    name: "Hugo Avila",
    phone: "+55 (17) 99257-3141",
    email: "hg.lavila@gmail.com",
    cpf: "123.456.789-00",
    origem: "Instagram",
    created_at: "2025-12-05",
    vehicles: [
      { id: 1, brand: "Volkswagen", model: "Golf GT", year: 2000, plate: "ABC-1234", size: "M" }
    ],
    total_spent: 1096.29,
    sales_count: 1
  },
  {
    id: 2,
    name: "Maria Silva",
    phone: "+55 (11) 98765-4321",
    email: "maria.silva@email.com",
    cpf: "987.654.321-00",
    origem: "Google",
    created_at: "2026-01-10",
    vehicles: [
      { id: 2, brand: "Toyota", model: "Corolla", year: 2022, plate: "XYZ-5678", size: "M" }
    ],
    total_spent: 850.00,
    sales_count: 2
  },
  {
    id: 3,
    name: "João Santos",
    phone: "+55 (21) 97654-3210",
    email: "joao.santos@email.com",
    cpf: null,
    origem: "Indicação",
    created_at: "2026-01-12",
    vehicles: [
      { id: 3, brand: "Honda", model: "Civic", year: 2021, plate: "QWE-9012", size: "M" },
      { id: 4, brand: "Ford", model: "Ranger", year: 2020, plate: "ASD-3456", size: "G" }
    ],
    total_spent: 2340.50,
    sales_count: 3
  },
  {
    id: 4,
    name: "Ana Paula",
    phone: "+55 (19) 96543-2109",
    email: "ana.paula@email.com",
    cpf: "456.789.123-00",
    origem: "Passante",
    created_at: "2026-01-15",
    vehicles: [
      { id: 5, brand: "Fiat", model: "Uno", year: 2018, plate: "ZXC-7890", size: "P" }
    ],
    total_spent: 320.00,
    sales_count: 1
  },
  {
    id: 5,
    name: "Pedro Costa",
    phone: "+55 (11) 95432-1098",
    email: "pedro.costa@email.com",
    cpf: "321.654.987-00",
    origem: "Instagram",
    created_at: "2025-11-20",
    vehicles: [
      { id: 6, brand: "BMW", model: "X5", year: 2023, plate: "RTY-1234", size: "G" }
    ],
    total_spent: 4500.00,
    sales_count: 2
  },
  {
    id: 6,
    name: "Fernanda Lima",
    phone: "+55 (31) 94321-0987",
    email: "fernanda.lima@email.com",
    cpf: "654.321.987-00",
    origem: "Google",
    created_at: "2025-10-05",
    vehicles: [
      { id: 7, brand: "Mercedes", model: "C200", year: 2022, plate: "FGH-5678", size: "M" }
    ],
    total_spent: 3200.00,
    sales_count: 1
  },
  {
    id: 7,
    name: "Ricardo Mendes",
    phone: "+55 (41) 93210-9876",
    email: "ricardo.mendes@email.com",
    cpf: "789.123.456-00",
    origem: "Indicação",
    created_at: "2026-01-08",
    vehicles: [
      { id: 8, brand: "Audi", model: "A4", year: 2021, plate: "JKL-9012", size: "M" }
    ],
    total_spent: 1800.00,
    sales_count: 2
  }
];

// Mock Services
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

export const services: Service[] = [
  {
    id: 1,
    name: "Vitrificação Completa",
    price: 800.00,
    description: "Vitrificação de pintura com proteção de 2 anos",
    commission_percent: 10,
    post_sale_days: 30,
    auto_schedule: true,
    sales_count: 45,
    total_revenue: 36000.00
  },
  {
    id: 2,
    name: "PPF Frontal",
    price: 2500.00,
    description: "Película de proteção frontal completa",
    commission_percent: 8,
    post_sale_days: 60,
    auto_schedule: true,
    sales_count: 20,
    total_revenue: 50000.00
  },
  {
    id: 3,
    name: "Polimento Técnico",
    price: 350.00,
    description: "Correção de pintura em 3 etapas",
    commission_percent: 12,
    post_sale_days: 15,
    auto_schedule: false,
    sales_count: 80,
    total_revenue: 28000.00
  },
  {
    id: 4,
    name: "Higienização Interna",
    price: 180.00,
    description: "Limpeza completa do interior",
    commission_percent: 15,
    post_sale_days: 0,
    auto_schedule: false,
    sales_count: 120,
    total_revenue: 21600.00
  },
  {
    id: 5,
    name: "Insulfilm",
    price: 450.00,
    description: "Aplicação de película nos vidros",
    commission_percent: 10,
    post_sale_days: 7,
    auto_schedule: true,
    sales_count: 65,
    total_revenue: 29250.00
  }
];

// Mock Sales
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

export const sales: Sale[] = [
  {
    id: 1,
    client_id: 1,
    vehicle_id: 1,
    services: [1, 4],
    date: "2026-01-09",
    subtotal: 980.00,
    discount: 50.00,
    total: 930.00,
    payment_method: "Pix",
    status: "Fechada",
    employee_id: 2
  },
  {
    id: 2,
    client_id: 2,
    vehicle_id: 2,
    services: [3],
    date: "2026-01-09",
    subtotal: 350.00,
    discount: 0,
    total: 350.00,
    payment_method: "Crédito",
    status: "Fechada",
    employee_id: 3
  },
  {
    id: 3,
    client_id: 3,
    vehicle_id: 3,
    services: [1, 3, 4],
    date: "2026-01-10",
    subtotal: 1330.00,
    discount: 100.00,
    total: 1230.00,
    payment_method: "Dinheiro",
    status: "Fechada",
    employee_id: 2
  },
  {
    id: 4,
    client_id: 5,
    vehicle_id: 6,
    services: [2],
    date: "2026-01-15",
    subtotal: 2500.00,
    discount: 0,
    total: 2500.00,
    payment_method: "Pix",
    status: "Aberta",
    employee_id: 2
  },
  {
    id: 5,
    client_id: 6,
    vehicle_id: 7,
    services: [1, 2],
    date: "2026-01-20",
    subtotal: 3300.00,
    discount: 200.00,
    total: 3100.00,
    payment_method: "Boleto",
    status: "Aberta",
    employee_id: 3
  }
];

// Mock Financial Accounts
export interface Account {
  id: number;
  name: string;
  type: 'Conta Corrente' | 'Poupança' | 'Carteira' | 'Investimento';
  balance: number;
  is_primary: boolean;
}

export const accounts: Account[] = [
  { id: 1, name: "Conta Principal", type: "Conta Corrente", balance: 15420.50, is_primary: true },
  { id: 2, name: "Reserva", type: "Poupança", balance: 8500.00, is_primary: false },
  { id: 3, name: "Caixa Loja", type: "Carteira", balance: 1250.00, is_primary: false }
];

// Mock Financial Categories
export interface Category {
  id: number;
  name: string;
  type: 'entrada' | 'saida';
  color: string;
  parent_id?: number;
}

export const categories: Category[] = [
  { id: 1, name: "Vendas de Serviços", type: "entrada", color: "#22c55e" },
  { id: 2, name: "Produtos", type: "entrada", color: "#3b82f6" },
  { id: 3, name: "Outros Recebimentos", type: "entrada", color: "#8b5cf6" },
  { id: 4, name: "Aluguel", type: "saida", color: "#ef4444" },
  { id: 5, name: "Salários", type: "saida", color: "#f97316" },
  { id: 6, name: "Materiais", type: "saida", color: "#eab308" },
  { id: 7, name: "Impostos", type: "saida", color: "#dc2626" },
  { id: 8, name: "Marketing", type: "saida", color: "#ec4899" },
  { id: 9, name: "Energia/Água", type: "saida", color: "#06b6d4" },
  { id: 10, name: "Manutenção", type: "saida", color: "#84cc16" }
];

// Mock Transactions
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

export const transactions: Transaction[] = [
  { id: 1, type: "entrada", amount: 930.00, description: "Venda #1 - Hugo Avila", category_id: 1, account_id: 1, date: "2026-01-09", status: "confirmado", sale_id: 1 },
  { id: 2, type: "entrada", amount: 350.00, description: "Venda #2 - Maria Silva", category_id: 1, account_id: 1, date: "2026-01-09", status: "confirmado", sale_id: 2 },
  { id: 3, type: "entrada", amount: 1230.00, description: "Venda #3 - João Santos", category_id: 1, account_id: 3, date: "2026-01-10", status: "confirmado", sale_id: 3 },
  { id: 4, type: "saida", amount: 2500.00, description: "Aluguel Janeiro", category_id: 4, account_id: 1, date: "2026-01-05", status: "confirmado" },
  { id: 5, type: "saida", amount: 850.00, description: "Materiais PPF", category_id: 6, account_id: 1, date: "2026-01-08", status: "confirmado" },
  { id: 6, type: "transferencia", amount: 2000.00, description: "Reserva mensal", account_id: 1, to_account_id: 2, date: "2026-01-10", status: "confirmado" },
  { id: 7, type: "entrada", amount: 2500.00, description: "Venda #4 - Pedro Costa", category_id: 1, account_id: 1, date: "2026-01-15", status: "pendente", sale_id: 4 },
  { id: 8, type: "saida", amount: 320.00, description: "Energia elétrica", category_id: 9, account_id: 1, date: "2026-01-20", status: "pendente" }
];

// Mock Slots (Vagas)
export interface Slot {
  id: number;
  name: string;
  status: 'disponivel' | 'ocupada' | 'manutencao';
  sale_id?: number;
  started_at?: string;
  checklist_photos?: string[];
  work_status?: 'em_andamento' | 'pausado' | 'em_espera' | 'finalizado';
}

export const slots: Slot[] = [
  { id: 1, name: "Vaga 01", status: "ocupada", sale_id: 4, started_at: "2026-01-26T09:30:00", work_status: "em_andamento" },
  { id: 2, name: "Vaga 02", status: "ocupada", sale_id: 5, started_at: "2026-01-26T08:00:00", work_status: "em_espera" },
  { id: 3, name: "Vaga 03", status: "disponivel" },
  { id: 4, name: "Vaga 04", status: "disponivel" },
  { id: 5, name: "Vaga 05", status: "manutencao" },
  { id: 6, name: "Vaga 06", status: "disponivel" },
  { id: 7, name: "Vaga 07", status: "disponivel" },
  { id: 8, name: "Vaga 08", status: "disponivel" },
  { id: 9, name: "Vaga 09", status: "disponivel" },
  { id: 10, name: "Vaga 10", status: "disponivel" }
];

// Mock Materials (Estoque)
export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
}

export const materials: Material[] = [
  { id: 1, name: "Película PPF Metro", category: "PPF", unit: "metro", current_stock: 50, min_stock: 20, cost_per_unit: 120.00 },
  { id: 2, name: "Vitrificador Ceramic Pro", category: "Vitrificação", unit: "ml", current_stock: 2000, min_stock: 500, cost_per_unit: 0.50 },
  { id: 3, name: "Polidor Compound", category: "Polimento", unit: "litro", current_stock: 5, min_stock: 3, cost_per_unit: 85.00 },
  { id: 4, name: "Microfibra Premium", category: "Acessórios", unit: "unidade", current_stock: 30, min_stock: 10, cost_per_unit: 15.00 },
  { id: 5, name: "Insulfilm G20", category: "Insulfilm", unit: "metro", current_stock: 8, min_stock: 15, cost_per_unit: 45.00 },
  { id: 6, name: "Desengraxante", category: "Limpeza", unit: "litro", current_stock: 12, min_stock: 5, cost_per_unit: 25.00 }
];

// Mock Consumption Rules
export interface ConsumptionRule {
  id: number;
  material_id: number;
  service_id: number;
  vehicle_size: 'P' | 'M' | 'G';
  quantity: number;
}

export const consumptionRules: ConsumptionRule[] = [
  { id: 1, material_id: 2, service_id: 1, vehicle_size: "P", quantity: 30 },
  { id: 2, material_id: 2, service_id: 1, vehicle_size: "M", quantity: 50 },
  { id: 3, material_id: 2, service_id: 1, vehicle_size: "G", quantity: 80 },
  { id: 4, material_id: 1, service_id: 2, vehicle_size: "P", quantity: 3 },
  { id: 5, material_id: 1, service_id: 2, vehicle_size: "M", quantity: 5 },
  { id: 6, material_id: 1, service_id: 2, vehicle_size: "G", quantity: 8 },
  { id: 7, material_id: 3, service_id: 3, vehicle_size: "P", quantity: 0.2 },
  { id: 8, material_id: 3, service_id: 3, vehicle_size: "M", quantity: 0.3 },
  { id: 9, material_id: 3, service_id: 3, vehicle_size: "G", quantity: 0.5 }
];

// Mock Warranty Templates
export interface WarrantyTemplate {
  id: number;
  name: string;
  service_id: number;
  validity_months: number;
  terms: string;
}

export const warrantyTemplates: WarrantyTemplate[] = [
  { id: 1, name: "Garantia Vitrificação", service_id: 1, validity_months: 24, terms: "Garantia de 2 anos contra desbotamento e perda de brilho, desde que seguidas as recomendações de manutenção." },
  { id: 2, name: "Garantia PPF", service_id: 2, validity_months: 60, terms: "Garantia de 5 anos contra amarelamento, bolhas e descolamento em condições normais de uso." },
  { id: 3, name: "Garantia Insulfilm", service_id: 5, validity_months: 36, terms: "Garantia de 3 anos contra bolhas, descoloração e descolamento." }
];

// Mock Issued Warranties
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

export const issuedWarranties: IssuedWarranty[] = [
  { id: 1, template_id: 1, sale_id: 1, client_id: 1, vehicle_id: 1, issued_at: "2026-01-09", expires_at: "2028-01-09", certificate_number: "WFE-VIT-2026-0001" },
  { id: 2, template_id: 1, sale_id: 3, client_id: 3, vehicle_id: 3, issued_at: "2026-01-10", expires_at: "2028-01-10", certificate_number: "WFE-VIT-2026-0002" }
];

// Mock Report Types
export interface ReportType {
  id: string;
  name: string;
  description: string;
  group: 'financeiro' | 'vendas' | 'operacional' | 'clientes';
  formats: ('pdf' | 'xlsx' | 'csv' | 'ofx')[];
}

export const reportTypes: ReportType[] = [
  { id: "dfc", name: "DFC - Demonstração de Fluxo de Caixa", description: "Relatório completo de entradas e saídas", group: "financeiro", formats: ["pdf", "xlsx"] },
  { id: "dre", name: "DRE - Demonstração de Resultado", description: "Resultado do exercício por período", group: "financeiro", formats: ["pdf", "xlsx"] },
  { id: "vendas_periodo", name: "Vendas por Período", description: "Todas as vendas em um intervalo de datas", group: "vendas", formats: ["pdf", "xlsx", "csv"] },
  { id: "vendas_servico", name: "Vendas por Serviço", description: "Performance de cada serviço", group: "vendas", formats: ["pdf", "xlsx"] },
  { id: "vendas_vendedor", name: "Vendas por Vendedor", description: "Comissões e performance por vendedor", group: "vendas", formats: ["pdf", "xlsx"] },
  { id: "clientes_ativos", name: "Clientes Ativos", description: "Lista de clientes com vendas recentes", group: "clientes", formats: ["pdf", "xlsx", "csv"] },
  { id: "clientes_inativos", name: "Clientes Inativos", description: "Clientes sem compras há mais de 90 dias", group: "clientes", formats: ["pdf", "xlsx"] },
  { id: "ocupacao_vagas", name: "Ocupação de Vagas", description: "Histórico de ocupação do espaço", group: "operacional", formats: ["pdf", "xlsx"] },
  { id: "estoque_movimento", name: "Movimentação de Estoque", description: "Entradas e saídas de materiais", group: "operacional", formats: ["pdf", "xlsx"] },
  { id: "extrato_conta", name: "Extrato de Conta", description: "Movimentações de uma conta específica", group: "financeiro", formats: ["pdf", "ofx"] }
];

// Mock Company Settings
export interface CompanySettings {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string | null;
  primary_color: string;
}

export const companySettings: CompanySettings = {
  name: "WFE Evolution",
  cnpj: "12.345.678/0001-90",
  phone: "+55 (17) 99999-0000",
  email: "contato@wfe.com.br",
  address: "Rua das Palmeiras, 123 - Centro, Cidade/SP",
  logo_url: null,
  primary_color: "#3b82f6"
};

// Mock Dashboard Stats
export const dashboardStats = {
  totalSales: 8110.00,
  salesCount: 5,
  averageTicket: 1622.00,
  newClients: 3,
  occupiedSlots: 2,
  totalSlots: 10,
  pendingContacts: 4,
  activeEmployees: 3,
  conversionRate: 72,
  monthlyGoal: 50000,
  monthlyProgress: 8110.00,
  paymentBreakdown: {
    pix: 3430.00,
    dinheiro: 1230.00,
    debito: 0,
    credito: 350.00,
    boleto: 3100.00,
    transferencia: 0
  }
};

// Mock Pipeline Stages
export interface PipelineItem {
  id: number;
  sale_id: number;
  stage: 'Agendados' | 'Recebidos' | 'Em Execução' | 'Controle Qualidade' | 'Pronto' | 'Entregue';
  scheduled_time?: string;
  is_urgent: boolean;
}

export const pipelineItems: PipelineItem[] = [
  { id: 1, sale_id: 4, stage: "Em Execução", scheduled_time: "14:30", is_urgent: false },
  { id: 2, sale_id: 5, stage: "Agendados", scheduled_time: "10:00", is_urgent: false }
];

// Mock Chat Messages
export interface ChatMessage {
  id: number;
  client_id: number;
  content: string;
  sender: 'client' | 'company';
  timestamp: string;
  read: boolean;
}

export const clientMessages: ChatMessage[] = [
  {
    id: 1,
    client_id: 1,
    content: "Olá! Gostaria de saber sobre o serviço de vitrificação.",
    sender: 'client',
    timestamp: "2026-01-20T10:30:00",
    read: true
  },
  {
    id: 2,
    client_id: 1,
    content: "Bom dia! Temos a vitrificação completa com garantia de 2 anos por R$ 800. Posso agendar para você?",
    sender: 'company',
    timestamp: "2026-01-20T10:35:00",
    read: true
  },
  {
    id: 3,
    client_id: 1,
    content: "Perfeito! Pode agendar para sexta às 14h?",
    sender: 'client',
    timestamp: "2026-01-20T10:40:00",
    read: true
  },
  {
    id: 4,
    client_id: 1,
    content: "Agendado! Te esperamos na sexta-feira às 14h. 🚗✨",
    sender: 'company',
    timestamp: "2026-01-20T10:42:00",
    read: true
  },
  {
    id: 5,
    client_id: 2,
    content: "Boa tarde! O carro já está pronto?",
    sender: 'client',
    timestamp: "2026-01-25T15:00:00",
    read: true
  },
  {
    id: 6,
    client_id: 2,
    content: "Oi Maria! Sim, já está finalizado. Pode passar para retirar hoje até às 18h.",
    sender: 'company',
    timestamp: "2026-01-25T15:05:00",
    read: true
  },
  {
    id: 7,
    client_id: 3,
    content: "Vocês fazem PPF completo?",
    sender: 'client',
    timestamp: "2026-01-26T09:00:00",
    read: false
  },
  {
    id: 8,
    client_id: 5,
    content: "Bom dia! Quero agendar uma manutenção preventiva.",
    sender: 'client',
    timestamp: "2026-01-27T08:30:00",
    read: false
  }
];

// Helper function to get client by ID
export const getClientById = (id: number) => clients.find(c => c.id === id);

// Helper function to get vehicle by ID
export const getVehicleById = (id: number) => {
  for (const client of clients) {
    const vehicle = client.vehicles.find(v => v.id === id);
    if (vehicle) return vehicle;
  }
  return null;
};

// Helper function to get service by ID
export const getServiceById = (id: number) => services.find(s => s.id === id);

// Helper function to get user by ID
export const getUserById = (id: number) => users.find(u => u.id === id);

// Helper function to get account by ID
export const getAccountById = (id: number) => accounts.find(a => a.id === id);

// Helper function to get category by ID
export const getCategoryById = (id: number) => categories.find(c => c.id === id);

// Helper function to get material by ID
export const getMaterialById = (id: number) => materials.find(m => m.id === id);
