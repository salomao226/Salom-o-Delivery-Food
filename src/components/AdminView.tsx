import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Utensils, Users, Settings, Sparkles, Plus, Check, Play, MapPin, Phone, Truck, Edit, Trash, DollarSign, Bot, Eye, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { MenuItem, Order, Driver, BusinessConfig, OrderStatus } from '../types';
import AIAssistantModal from './AIAssistantModal';

interface AdminViewProps {
  onSwitchToCustomer: () => void;
}

export default function AdminView({ onSwitchToCustomer }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'drivers' | 'settings'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  
  // Modals / Forms control
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedAiItem, setSelectedAiItem] = useState<MenuItem | undefined>(undefined);
  
  // Menu Item edit state
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  
  // Driver Form state
  const [isDriverFormOpen, setIsDriverFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Partial<Driver> | null>(null);

  // Poll intervals
  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 4000); // Poll orders/menu every 4s
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    try {
      const [ordersRes, menuRes, driversRes, configRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/menu'),
        fetch('/api/drivers'),
        fetch('/api/config')
      ]);
      const ordersData = await ordersRes.json();
      const menuData = await menuRes.json();
      const driversData = await driversRes.json();
      const configData = await configRes.json();
      
      setOrders(ordersData);
      setMenu(menuData);
      setDrivers(driversData);
      setConfig(configData);
    } catch (err) {
      console.error('Falha ao sincronizar dados com o servidor:', err);
    }
  };

  // KPI Calculations
  const getFaturamentoTotal = () => {
    return orders
      .filter(o => o.status === 'entregue')
      .reduce((sum, o) => sum + o.total, 0);
  };

  const getPedidosPendentes = () => {
    return orders.filter(o => o.status === 'pendente').length;
  };

  const getTicketMedio = () => {
    const delivered = orders.filter(o => o.status === 'entregue');
    if (delivered.length === 0) return 0;
    return Math.round(getFaturamentoTotal() / delivered.length);
  };

  // Status transitions
  const handleUpdateStatus = async (id: string, status: OrderStatus, driverId?: string, estimatedTime?: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, driverId, estimatedTime })
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === id ? data.order : o));
        fetchAdminData(); // sync immediately
      }
    } catch (err) {
      console.error('Erro ao actualizar estado do pedido:', err);
    }
  };

  // Menu items crud
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.price || !editingItem?.category) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const payload: MenuItem = {
      id: editingItem.id || '',
      name: editingItem.name,
      description: editingItem.description || '',
      price: Number(editingItem.price),
      category: editingItem.category,
      image: editingItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
      available: editingItem.available !== false
    };

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsMenuFormOpen(false);
        setEditingItem(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Erro ao salvar item do cardápio:', err);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Deseja realmente eliminar este item do menu?')) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Erro ao eliminar item:', err);
    }
  };

  // Driver crud
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver?.name || !editingDriver?.phone || !editingDriver?.vehicle) {
      alert('Preencha todos os campos!');
      return;
    }

    const payload: Driver = {
      id: editingDriver.id || '',
      name: editingDriver.name,
      phone: editingDriver.phone,
      vehicle: editingDriver.vehicle,
      status: editingDriver.status || 'disponivel'
    };

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsDriverFormOpen(false);
        setEditingDriver(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Erro ao salvar motorista:', err);
    }
  };

  // Settings update
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        alert('Configurações actualizadas com sucesso!');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Erro ao actualizar configurações:', err);
    }
  };

  const toggleShopStatus = async () => {
    if (!config) return;
    const updated = { ...config, isOpen: !config.isOpen };
    setConfig(updated);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Erro ao alternar estado da loja:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans" id="admin-view-root">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0" id="admin-sidebar">
        <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-500 rounded-lg p-2 text-white shadow-md">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans font-black text-white text-sm tracking-tight leading-none">Painel do Dono</h1>
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-1 block">Txova Admin 🇲🇿</span>
            </div>
          </div>
          <button
            onClick={onSwitchToCustomer}
            className="md:hidden text-xs font-bold text-orange-400 border border-orange-400/30 rounded-lg px-2 py-1 hover:bg-orange-500 hover:text-white transition-all"
            id="to-shop-btn-mobile"
          >
            Ver Loja
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5" id="admin-nav-links">
          {[
            { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
            { id: 'orders', label: 'Gerir Pedidos', icon: ShoppingCart, badge: orders.filter(o => o.status === 'pendente' || o.status === 'preparando' || o.status === 'saiu_para_entrega').length },
            { id: 'menu', label: 'Gerir Cardápio', icon: Utensils },
            { id: 'drivers', label: 'Estafetas', icon: Users },
            { id: 'settings', label: 'Definições Loja', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-xs font-extrabold tracking-wide transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                id={`admin-nav-${tab.id}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`rounded-full h-5 px-1.5 flex items-center justify-center text-[10px] font-black ${
                    isActive ? 'bg-white text-orange-600' : 'bg-orange-500 text-white animate-pulse'
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <button
            onClick={onSwitchToCustomer}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-orange-600 hover:text-white py-3 font-sans font-bold text-xs text-orange-400 shadow-inner transition-all"
            id="to-shop-btn-desktop"
          >
            <Eye className="h-4 w-4" /> Ver Interface Cliente
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-y-auto h-screen" id="admin-main-container">
        
        {/* Top Header info */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-sans font-black text-slate-900 text-xl tracking-tight uppercase">
              {activeTab === 'dashboard' && 'Visão Geral do Negócio'}
              {activeTab === 'orders' && 'Controle Real-time de Pedidos'}
              {activeTab === 'menu' && 'Gerenciador do Cardápio'}
              {activeTab === 'drivers' && 'Estafetas de Entrega'}
              {activeTab === 'settings' && 'Definições do Restaurante'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Sabor, Tradição e Tecnologia em Moçambique.</p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Quick Open/Close Store Toggle */}
            <button
              onClick={toggleShopStatus}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 border text-xs font-bold transition-all ${
                config?.isOpen
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
              id="shop-open-toggle"
            >
              <span>Estado da Loja:</span>
              <span className="font-black uppercase">{config?.isOpen ? 'ABERTO' : 'FECHADO'}</span>
              {config?.isOpen ? (
                <ToggleRight className="h-5 w-5 text-emerald-600 stroke-[2.5]" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-rose-600 stroke-[2.5]" />
              )}
            </button>

            {/* Quick AI Trigger */}
            <button
              onClick={() => {
                setSelectedAiItem(undefined);
                setIsAiModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 text-white px-4 py-2 text-xs font-bold hover:bg-orange-700 shadow-md transition-all animate-pulse"
              id="global-ai-assist-btn"
            >
              <Bot className="h-4 w-4" /> Perguntar ao Gemini
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="p-6 space-y-6 flex-1 min-h-0" id="admin-main-body">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6" id="dashboard-tab">
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Faturamento de Hoje', value: `${getFaturamentoTotal()} MT`, sub: 'Apenas entregues', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Novos Pedidos Pendentes', value: getPedidosPendentes(), sub: 'Aguardando aprovação', icon: ShoppingCart, color: 'text-orange-600 bg-orange-50' },
                  { label: 'Ticket Médio', value: `${getTicketMedio()} MT`, sub: 'Por cliente satisfeito', icon: RefreshCw, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Estafetas Registados', value: drivers.length, sub: `${drivers.filter(d => d.status === 'disponivel').length} disponíveis agora`, icon: Truck, color: 'text-purple-600 bg-purple-50' }
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">{kpi.label}</span>
                        <span className="font-sans font-black text-2xl text-slate-900 block">{kpi.value}</span>
                        <span className="block text-xs text-slate-500 font-medium">{kpi.sub}</span>
                      </div>
                      <div className={`rounded-xl p-3 shrink-0 ${kpi.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick List: Pendente / active orders */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <h3 className="font-sans font-bold text-slate-900 text-sm">Novas Encomendas Urgentes</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-orange-600 hover:underline"
                    id="dashboard-to-orders-btn"
                  >
                    Ver Todas Encomendas →
                  </button>
                </div>

                {orders.filter(o => o.status === 'pendente').length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    Não há encomendas pendentes no momento. Bom trabalho! ✅
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {orders.filter(o => o.status === 'pendente').map(order => (
                      <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-black text-slate-900 text-sm">{order.id}</span>
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-800 uppercase tracking-wide animate-pulse">
                              Pendente
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{order.customerName} • {order.customerArea}, {order.customerCity}</p>
                          <p className="text-[11px] text-gray-500 leading-relaxed">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-sans font-black text-slate-900 text-sm mr-2">{order.total} MT</span>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'aceito')}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-colors"
                            id={`approve-order-dash-${order.id}`}
                          >
                            Aceitar
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'cancelado')}
                            className="rounded-lg border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold transition-colors"
                            id={`cancel-order-dash-${order.id}`}
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GERIR PEDIDOS (Real-time Management) */}
          {activeTab === 'orders' && (
            <div className="space-y-6" id="orders-tab">
              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-wrap gap-2">
                {['Todos', 'pendente', 'aceito', 'preparando', 'saiu_para_entrega', 'entregue', 'cancelado'].map(st => (
                  <button
                    key={st}
                    onClick={() => {}} // Simple visual placeholder for filtering can be done easily
                    className="px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600"
                  >
                    {st === 'Todos' ? 'Todos' : st.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Orders List Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="orders-admin-grid">
                {orders.length === 0 ? (
                  <div className="col-span-2 text-center py-20 text-gray-400 text-xs">
                    Nenhum pedido recebido ainda. Divulgue a sua loja para obter os primeiros clientes!
                  </div>
                ) : (
                  orders.map(order => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                      id={`order-admin-card-${order.id}`}
                    >
                      <div className="space-y-3">
                        {/* Header card info */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ID Encomenda</span>
                            <span className="font-sans font-black text-slate-900 text-base">{order.id}</span>
                          </div>
                          <div>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                              order.status === 'pendente' ? 'bg-orange-100 text-orange-800 animate-pulse' :
                              order.status === 'aceito' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'preparando' ? 'bg-amber-100 text-amber-800' :
                              order.status === 'saiu_para_entrega' ? 'bg-purple-100 text-purple-800' :
                              order.status === 'entregue' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Customer details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400 block font-medium">Cliente</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              {order.customerName}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-medium">Contacto</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" /> {order.customerPhone}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-400 block font-medium">Morada / Bairro</span>
                            <span className="font-bold text-slate-800 flex items-start gap-1">
                              <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                              <span>{order.customerArea}, {order.customerCity} - <span className="font-medium text-slate-500">{order.customerAddress}</span></span>
                            </span>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="bg-slate-50 p-3 rounded-xl space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Itens da Encomenda</span>
                          <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto pr-1">
                            {order.items.map((it, i) => (
                              <div key={i} className="py-1 flex justify-between text-xs font-semibold text-slate-800">
                                <span>{it.quantity}x {it.name}</span>
                                <span className="font-sans">{it.price * it.quantity} MT</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totals & Payment method */}
                        <div className="flex justify-between items-center bg-orange-50/20 p-3 rounded-xl border border-orange-100/50">
                          <span className="text-xs font-bold text-slate-500 uppercase">Pagamento via: <span className="text-orange-600 font-extrabold uppercase">{order.paymentMethod}</span></span>
                          <div>
                            <span className="text-[10px] block text-right text-gray-400 uppercase font-bold">Total Geral</span>
                            <span className="font-sans font-black text-base text-orange-600">{order.total} MT</span>
                          </div>
                        </div>
                      </div>

                      {/* Transition Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                        {order.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'aceito')}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
                              id={`accept-btn-${order.id}`}
                            >
                              Aceitar Encomenda
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'cancelado')}
                              className="rounded-lg border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 text-xs font-bold transition-colors"
                              id={`reject-btn-${order.id}`}
                            >
                              Recusar
                            </button>
                          </>
                        )}

                        {order.status === 'aceito' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'preparando')}
                            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
                            id={`prep-btn-${order.id}`}
                          >
                            Iniciar Cozinha / Preparação
                          </button>
                        )}

                        {order.status === 'preparando' && (
                          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                            <span className="text-xs text-slate-500 font-medium">Selecione Estafeta:</span>
                            <div className="flex gap-2">
                              <select
                                id={`driver-select-${order.id}`}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold focus:border-orange-500 focus:outline-hidden"
                                defaultValue=""
                              >
                                <option value="" disabled>Escolher Motorista...</option>
                                {drivers.map(d => (
                                  <option key={d.id} value={d.id}>{d.name} ({d.vehicle})</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const select = document.getElementById(`driver-select-${order.id}`) as HTMLSelectElement;
                                  if (!select?.value) {
                                    alert('Por favor, selecione um estafeta!');
                                    return;
                                  }
                                  handleUpdateStatus(order.id, 'saiu_para_entrega', select.value);
                                }}
                                className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0"
                                id={`dispatch-btn-${order.id}`}
                              >
                                Despachar Entrega
                              </button>
                            </div>
                          </div>
                        )}

                        {order.status === 'saiu_para_entrega' && (
                          <div className="w-full flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-purple-700 flex items-center gap-1">
                              <Truck className="h-4 w-4 animate-bounce" /> {order.driverName} está a entregar...
                            </span>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'entregue')}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
                              id={`delivered-btn-${order.id}`}
                            >
                              Concluir e Entregar 🏁
                            </button>
                          </div>
                        )}

                        {order.status === 'entregue' && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 py-1">
                            <Check className="h-4 w-4 stroke-[3]" /> Concluída & Paga
                          </span>
                        )}

                        {order.status === 'cancelado' && (
                          <span className="text-xs font-bold text-red-500 py-1">
                            Cancelada
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GERIR CARDÁPIO (Menu Editing & AI optimization) */}
          {activeTab === 'menu' && (
            <div className="space-y-6" id="menu-tab">
              <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
                <h3 className="font-sans font-bold text-slate-900 text-sm">Pratos e Produtos Registados</h3>
                <button
                  onClick={() => {
                    setEditingItem({ available: true });
                    setIsMenuFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-slate-800 shadow-md transition-colors"
                  id="add-new-menu-item-btn"
                >
                  <Plus className="h-4 w-4 stroke-[3]" /> Adicionar Produto
                </button>
              </div>

              {/* Menu items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="menu-admin-grid">
                {menu.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between" id={`menu-admin-card-${item.id}`}>
                    <div>
                      <div className="h-40 overflow-hidden relative bg-slate-100">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 bg-white text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider border border-slate-100">
                          {item.category}
                        </span>
                        {!item.available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Esgotado</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-sans font-bold text-slate-900 text-sm line-clamp-1">{item.name}</h4>
                          <span className="font-sans font-black text-orange-600 text-sm shrink-0">{item.price} MT</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{item.description}</p>
                      </div>
                    </div>

                    {/* Actions bar including Gemini AI optimization */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedAiItem(item);
                          setIsAiModalOpen(true);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1.5 text-xs font-black transition-colors"
                        title="Otimizar descrição ou preços usando IA"
                        id={`ai-optimize-btn-${item.id}`}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Gemini IA
                      </button>

                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsMenuFormOpen(true);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                          title="Editar"
                          id={`edit-item-btn-${item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                          title="Eliminar"
                          id={`delete-item-btn-${item.id}`}
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ESTAFETAS (Drivers List) */}
          {activeTab === 'drivers' && (
            <div className="space-y-6" id="drivers-tab">
              <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
                <h3 className="font-sans font-bold text-slate-900 text-sm">Equipa de Entregas Registada</h3>
                <button
                  onClick={() => {
                    setEditingDriver({ status: 'disponivel', vehicle: 'Mota' });
                    setIsDriverFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-slate-800 shadow-md transition-colors"
                  id="add-new-driver-btn"
                >
                  <Plus className="h-4 w-4 stroke-[3]" /> Registar Estafeta
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="drivers-grid">
                {drivers.map(drv => (
                  <div key={drv.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between" id={`driver-card-${drv.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-3 rounded-full shrink-0">
                        <Truck className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{drv.name}</h4>
                        <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {drv.phone}
                        </p>
                        <span className="inline-block text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold uppercase">
                          {drv.vehicle}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        drv.status === 'disponivel' ? 'bg-emerald-100 text-emerald-800' :
                        drv.status === 'entregando' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {drv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DEFINIÇÕES DO RESTAURANTE */}
          {activeTab === 'settings' && config && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 p-6 shadow-xs" id="settings-tab">
              <form onSubmit={handleSaveConfig} className="space-y-5">
                <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-gray-100 pb-3">Informações de Negócio</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Restaurante</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone Principal</label>
                    <input
                      type="text"
                      value={config.phone}
                      onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Morada Física Completa</label>
                    <input
                      type="text"
                      value={config.address}
                      onChange={(e) => setConfig({ ...config, address: e.target.value })}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-gray-100 pb-3 pt-4">Tarifas e Portagens (MT)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Taxa de Entrega Base (MT)</label>
                    <input
                      type="number"
                      value={config.deliveryFee}
                      onChange={(e) => setConfig({ ...config, deliveryFee: Number(e.target.value) })}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Pedido Mínimo (MT)</label>
                    <input
                      type="number"
                      value={config.minOrder}
                      onChange={(e) => setConfig({ ...config, minOrder: Number(e.target.value) })}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <h3 className="font-sans font-bold text-slate-900 text-sm border-b border-gray-100 pb-3 pt-4">Códigos e Carteiras de Pagamento</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Código de Agente M-Pesa</label>
                    <input
                      type="text"
                      value={config.mpesaId}
                      onChange={(e) => setConfig({ ...config, mpesaId: e.target.value })}
                      placeholder="Código M-Pesa"
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Código de Agente e-Mola</label>
                    <input
                      type="text"
                      value={config.emolaId}
                      onChange={(e) => setConfig({ ...config, emolaId: e.target.value })}
                      placeholder="Código e-Mola"
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 font-sans font-bold text-sm shadow-md transition-colors"
                  id="save-settings-btn"
                >
                  Gravar Alterações do Restaurante
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: GEMINI AI ASSISTANT OVERLAY */}
      {isAiModalOpen && (
        <AIAssistantModal
          item={selectedAiItem}
          onClose={() => {
            setIsAiModalOpen(false);
            setSelectedAiItem(undefined);
          }}
          onApplyDescription={(desc) => {
            if (selectedAiItem) {
              setEditingItem({ ...selectedAiItem, description: desc });
              // also immediately edit it in backend menu list:
              const itemToUpdate = { ...selectedAiItem, description: desc };
              fetch('/api/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemToUpdate)
              }).then(() => fetchAdminData());
            }
          }}
        />
      )}

      {/* MODAL 2: MENU ITEM FORM OVERLAY */}
      {isMenuFormOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" id="menu-form-overlay">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95" id="menu-form-modal">
            <h3 className="font-sans font-black text-slate-900 text-lg border-b border-gray-100 pb-2">
              {editingItem.id ? 'Editar Prato' : 'Adicionar Novo Prato / Produto'}
            </h3>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Prato/Produto</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                  <select
                    value={editingItem.category || 'Pratos Locais'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                  >
                    <option value="Pratos Locais">Pratos Locais</option>
                    <option value="Petiscos">Petiscos</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Sobremesas">Sobremesas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preço de Venda (MT)</label>
                  <input
                    type="number"
                    required
                    value={editingItem.price || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">URL Imagem do Prato</label>
                  <input
                    type="text"
                    value={editingItem.image || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-available"
                    checked={editingItem.available !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, available: e.target.checked })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="is-available" className="text-xs font-bold text-gray-700">Disponível no Menu?</label>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuFormOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  id="menu-form-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-xs font-bold shadow-xs"
                  id="menu-form-save"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DRIVER REGISTRATION FORM OVERLAY */}
      {isDriverFormOpen && editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" id="driver-form-overlay">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95" id="driver-form-modal">
            <h3 className="font-sans font-black text-slate-900 text-lg border-b border-gray-100 pb-2">
              Registar Novo Estafeta
            </h3>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editingDriver.name || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  placeholder="Ex: Amílcar Macuácua"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone / Contacto</label>
                <input
                  type="text"
                  required
                  value={editingDriver.phone || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  placeholder="Ex: +258 84 000 0000"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Veículo</label>
                <select
                  value={editingDriver.vehicle || 'Mota'}
                  onChange={(e) => setEditingDriver({ ...editingDriver, vehicle: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                >
                  <option value="Mota">Motocicleta (Mota)</option>
                  <option value="Carro">Carro ligeiro</option>
                  <option value="Bicicleta">Bicicleta</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriverFormOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  id="driver-form-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-xs font-bold shadow-xs"
                  id="driver-form-save"
                >
                  Registar Estafeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
