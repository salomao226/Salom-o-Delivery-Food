export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in Meticais (MT)
  category: string;
  image: string;
  available: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export type OrderStatus = 'pendente' | 'aceito' | 'preparando' | 'saiu_para_entrega' | 'entregue' | 'cancelado';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerArea: string; // bairro
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  deliveryFee: number;
  status: OrderStatus;
  paymentMethod: 'mpesa' | 'emola' | 'mkesh' | 'dinheiro';
  paymentPhone?: string;
  createdAt: string;
  driverId?: string;
  driverName?: string;
  estimatedTime?: string; // e.g. "30-40 min"
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string; // "mota" | "carro" | "bicicleta"
  status: 'disponivel' | 'entregando' | 'indisponivel';
}

export interface BusinessConfig {
  name: string;
  phone: string;
  address: string;
  city: string;
  deliveryFee: number;
  minOrder: number;
  mpesaId: string; // Código de agente/Merchant M-Pesa
  emolaId: string; // Código e-Mola
  isOpen: boolean;
}
