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
    phone: "+55 (17) 99999-0000"
  },
  {
    id: 2,
    name: "Carlos Vendedor",
    email: "vendedor1@wfe.com.br",
    password: "vend123",
    role: "vendedor",
    avatar: null,
    created_at: "2025-08-20",
    phone: "+55 (11) 98888-1111"
  },
  {
    id: 3,
    name: "Ana Vendedora",
    email: "vendedor2@wfe.com.br",
    password: "vend123",
    role: "vendedor",
    avatar: null,
    created_at: "2025-09-10",
    phone: "+55 (21) 97777-2222"
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
