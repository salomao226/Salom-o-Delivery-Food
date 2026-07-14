import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, Phone, CreditCard, ChevronRight, X, Plus, Minus, ArrowLeft, Clock, Info, Check, CheckCircle2, Navigation, Smartphone, Receipt, Shield } from 'lucide-react';
import { MenuItem, CartItem, Order, BusinessConfig } from '../types';

interface CustomerViewProps {
  onSwitchToAdmin: () => void;
}

export default function CustomerView({ onSwitchToAdmin }: CustomerViewProps) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tudo');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('Maputo');
  const [customerArea, setCustomerArea] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'emola' | 'mkesh' | 'dinheiro'>('mpesa');
  const [paymentPhone, setPaymentPhone] = useState('');
  
  // Checkout flow control
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment_sim' | 'tracking'>('cart');
  const [paymentStage, setPaymentStage] = useState<'enter_pin' | 'processing' | 'success'>('enter_pin');
  const [pinValue, setPinValue] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [simStepText, setSimStepText] = useState('Iniciando comunicação com a operadora...');
  const [simTxnId, setSimTxnId] = useState('');
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [simulatedPINEntered, setSimulatedPINEntered] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Phone number prefix validation for Mozambique Mobile Money
  const getPaymentPhoneValidationError = () => {
    if (!paymentPhone) return '';
    if (paymentPhone.length !== 9) {
      return 'O número deve ter exatamente 9 dígitos (ex: 84XXXXXXX).';
    }
    const prefix = paymentPhone.substring(0, 2);
    if (paymentMethod === 'mpesa' && !['84', '85'].includes(prefix)) {
      return 'Número M-Pesa inválido! Deve começar com 84 ou 85.';
    }
    if (paymentMethod === 'emola' && !['86', '87'].includes(prefix)) {
      return 'Número e-Mola inválido! Deve começar com 86 ou 87.';
    }
    if (paymentMethod === 'mkesh' && !['82', '83'].includes(prefix)) {
      return 'Número mKesh inválido! Deve começar com 82 ou 83.';
    }
    return '';
  };
  
  // Categories in Mozambican App
  const categories = ['Tudo', 'Pratos Locais', 'Petiscos', 'Bebidas'];

  // Popular Bairros (Neighborhoods) in Maputo & Matola
  const popularBairros: Record<string, string[]> = {
    Maputo: ['Sommerschield', 'Polana Cimento', 'Coop', 'Alto Maé', 'Malhangalene', 'Central', 'Triunfo', 'Zimpeto', 'Costa do Sol', 'Aeroporto'],
    Matola: ['Matola C', 'Machava', 'Fomento', 'Liberdade', 'Tsalala', 'Kongolote', 'Nkobe']
  };

  useEffect(() => {
    fetchMenuAndConfig();
  }, []);

  // Poll active order if exists
  useEffect(() => {
    if (!activeOrder) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/orders');
        const orders: Order[] = await res.json();
        const updated = orders.find(o => o.id === activeOrder.id);
        if (updated && updated.status !== activeOrder.status) {
          setActiveOrder(updated);
        }
      } catch (err) {
        console.error('Erro ao actualizar pedido:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  const fetchMenuAndConfig = async () => {
    try {
      const [menuRes, configRes] = await Promise.all([
        fetch('/api/menu'),
        fetch('/api/config')
      ]);
      const menuData = await menuRes.json();
      const configData = await configRes.json();
      setMenu(menuData);
      setBusinessConfig(configData);
    } catch (err) {
      console.error('Falha ao buscar dados:', err);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQ = i.quantity + delta;
          return newQ > 0 ? { ...i, quantity: newQ } : null;
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    return businessConfig ? businessConfig.deliveryFee : 100;
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  const handlePlaceOrderClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerArea || !customerAddress) {
      alert('Por favor, preencha todos os campos obrigatórios de entrega!');
      return;
    }
    
    // If mobile money is selected, do a simulated USSD push modal first
    if (paymentMethod !== 'dinheiro') {
      if (!paymentPhone) {
        alert('Por favor, introduza o seu número de telemóvel para pagamento!');
        return;
      }
      const valErr = getPaymentPhoneValidationError();
      if (valErr) {
        alert(valErr);
        return;
      }
      setCheckoutStep('payment_sim');
      setPaymentStage('enter_pin');
      setPinValue('');
      setPaymentError('');
      setSimulatingPayment(true);
      
      // Simulate receipt of USSD after 1.2s
      setTimeout(() => {
        setSimulatingPayment(false);
      }, 1200);
    } else {
      submitOrder().then((ord) => {
        if (ord) {
          setCheckoutStep('tracking');
        }
      });
    }
  };

  const confirmSimulatedPayment = async () => {
    if (pinValue.length !== 4 || !/^\d+$/.test(pinValue)) {
      setPaymentError('Por favor, introduza um PIN válido de 4 dígitos!');
      return;
    }
    
    setPaymentError('');
    setPaymentStage('processing');
    setSimStepText('Iniciando comunicação com a operadora...');
    
    const steps = [
      { text: 'Conectando ao gateway de pagamento seguro...', delay: 800 },
      { text: 'Validando PIN de segurança introduzido...', delay: 1600 },
      { text: `Processando transação de ${getTotal()} MT...`, delay: 2400 },
      { text: 'Gerando comprovativo de transação (TX ID)...', delay: 3200 }
    ];
    
    steps.forEach((s) => {
      setTimeout(() => {
        setSimStepText(s.text);
      }, s.delay);
    });
    
    setTimeout(async () => {
      // Register order in database
      const createdOrder = await submitOrder();
      if (createdOrder) {
        const prefix = paymentMethod === 'mpesa' ? 'MP' : paymentMethod === 'emola' ? 'EM' : 'MK';
        const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSimTxnId(`TXN-${prefix}-${randStr}`);
        setPaymentStage('success');
        setSimulatedPINEntered(true);
      } else {
        setPaymentStage('enter_pin');
        setPaymentError('Erro ao submeter pedido. Tente novamente.');
      }
    }, 4000);
  };

  const handleKeypadPress = (num: string) => {
    setPinValue(prev => {
      if (prev.length < 4) {
        setPaymentError('');
        return prev + num;
      }
      return prev;
    });
  };

  const handleKeypadDelete = () => {
    setPinValue(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPinValue('');
  };

  const submitOrder = async () => {
    const orderItems = cart.map(i => ({
      menuItemId: i.menuItem.id,
      name: i.menuItem.name,
      quantity: i.quantity,
      price: i.menuItem.price
    }));

    const orderPayload = {
      customerName,
      customerPhone,
      customerCity,
      customerArea,
      customerAddress,
      items: orderItems,
      total: getTotal(),
      deliveryFee: getDeliveryFee(),
      paymentMethod,
      paymentPhone: paymentMethod !== 'dinheiro' ? paymentPhone : undefined
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (data.success) {
        setActiveOrder(data.order);
        setCart([]); // clear cart
        setIsCartOpen(false);
        return data.order;
      } else {
        alert('Houve um erro ao registar o pedido no servidor.');
        return null;
      }
    } catch (err) {
      console.error('Erro de rede ao enviar pedido:', err);
      alert('Não foi possível contactar o servidor.');
      return null;
    }
  };

  const handleWhatsAppCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerArea || !customerAddress) {
      alert('Por favor, preencha todos os campos obrigatórios de entrega!');
      return;
    }
    if (paymentMethod !== 'dinheiro' && !paymentPhone) {
      alert('Por favor, introduza o seu número de telemóvel para pagamento!');
      return;
    }

    const orderItems = cart.map(i => ({
      menuItemId: i.menuItem.id,
      name: i.menuItem.name,
      quantity: i.quantity,
      price: i.menuItem.price
    }));

    const orderPayload = {
      customerName,
      customerPhone,
      customerCity,
      customerArea,
      customerAddress,
      items: orderItems,
      total: getTotal(),
      deliveryFee: getDeliveryFee(),
      paymentMethod,
      paymentPhone: paymentMethod !== 'dinheiro' ? paymentPhone : undefined
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      
      const itemsText = cart.map(i => `• ${i.quantity}x *${i.menuItem.name}* (${i.menuItem.price} MT)`).join('%0A');
      const text = `*Salomao Food Delivery* 🍔🏍%0A%0A*NOVO PEDIDO* ${data.success ? `(ID: ${data.order.id})` : ''}%0A%0A` +
        `*Cliente:* ${customerName}%0A` +
        `*Contacto:* ${customerPhone}%0A` +
        `*Entrega:* ${customerCity} - ${customerArea}, ${customerAddress}%0A%0A` +
        `*Detalhes do Pedido:*%0A${itemsText}%0A%0A` +
        `*Subtotal:* ${getSubtotal()} MT%0A` +
        `*Taxa de Entrega:* ${getDeliveryFee()} MT%0A` +
        `*Total Geral:* *${getTotal()} MT*%0A%0A` +
        `*Pagamento:* ${paymentMethod.toUpperCase()}${paymentMethod !== 'dinheiro' ? ` (+258 ${paymentPhone})` : ''}%0A%0A` +
        `Aguardando confirmação do pedido!`;

      const whatsappNumber = '258871866000'; // +258 87 186 6000
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${text}`;

      if (data.success) {
        setActiveOrder(data.order);
        setCheckoutStep('tracking');
        setCart([]); // clear cart
        setIsCartOpen(false);
      }

      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error('Erro de rede ao enviar pedido:', err);
      
      // Mesmo se o servidor falhar, redireciona para o WhatsApp com os dados
      const itemsText = cart.map(i => `• ${i.quantity}x *${i.menuItem.name}* (${i.menuItem.price} MT)`).join('%0A');
      const text = `*Salomao Food Delivery* 🍔🏍%0A%0A*NOVO PEDIDO*%0A%0A` +
        `*Cliente:* ${customerName}%0A` +
        `*Contacto:* ${customerPhone}%0A` +
        `*Entrega:* ${customerCity} - ${customerArea}, ${customerAddress}%0A%0A` +
        `*Detalhes do Pedido:*%0A${itemsText}%0A%0A` +
        `*Subtotal:* ${getSubtotal()} MT%0A` +
        `*Taxa de Entrega:* ${getDeliveryFee()} MT%0A` +
        `*Total Geral:* *${getTotal()} MT*%0A%0A` +
        `*Pagamento:* ${paymentMethod.toUpperCase()}${paymentMethod !== 'dinheiro' ? ` (+258 ${paymentPhone})` : ''}`;

      const whatsappNumber = '258871866000';
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ['pendente', 'aceito', 'preparando', 'saiu_para_entrega', 'entregue'];
    return steps.indexOf(status);
  };

  const getStatusTextAndDesc = (status: string) => {
    switch (status) {
      case 'pendente':
        return { title: 'Aguardando Aprovação', desc: 'A loja está a analisar o seu pedido.' };
      case 'aceito':
        return { title: 'Pedido Aceite', desc: 'O seu pedido foi aceite e já está na fila.' };
      case 'preparando':
        return { title: 'Na Cozinha', desc: 'Os chefs estão a cozinhar a sua deliciosa comida.' };
      case 'saiu_para_entrega':
        return { title: 'Saiu para Entrega', desc: `O estafeta ${activeOrder?.driverName || ''} está a caminho da sua morada.` };
      case 'entregue':
        return { title: 'Pedido Entregue', desc: 'Bom apetite! Obrigado por escolher os nossos sabores.' };
      case 'cancelado':
        return { title: 'Pedido Cancelado', desc: 'Infelizmente, o seu pedido foi cancelado pela loja.' };
      default:
        return { title: 'Em Processamento', desc: 'O seu pedido está a ser processado.' };
    }
  };

  const filteredMenu = selectedCategory === 'Tudo'
    ? menu
    : menu.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="customer-view-root">
      {/* Top Banner & Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 text-white rounded-xl p-2.5 shadow-md">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-sans font-black text-lg text-slate-900 tracking-tight">
              {businessConfig?.name || 'Salomao Food Delivery'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Clock className="h-3 w-3 text-orange-500" /> 30-45 min
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
              {businessConfig?.isOpen ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  ● Aberto Agora
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wide">
                  ● Fechado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToAdmin}
            className="hidden md:inline-flex rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            id="to-admin-btn-desktop"
          >
            Aceder ao Painel de Dono 🔑
          </button>
          <button
            onClick={onSwitchToAdmin}
            className="md:hidden rounded-xl bg-slate-900 hover:bg-slate-800 p-2.5 text-xs font-bold text-white shadow-xs transition-colors"
            title="Painel Admin"
            id="to-admin-btn-mobile"
          >
            🔑
          </button>
        </div>
      </header>

      {/* Main Content (Changes when tracking order) */}
      {checkoutStep === 'tracking' && activeOrder ? (
        /* --- TRACKING SCREEN --- */
        <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6 space-y-6" id="tracking-view">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Acompanhar Encomenda</span>
                <h2 className="font-sans font-black text-2xl text-slate-900 mt-1">{activeOrder.id}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Criado em {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
                <span className="block text-[10px] font-black uppercase text-orange-700 tracking-wider">Tempo Estimado</span>
                <span className="font-sans font-black text-xl text-orange-600 block mt-0.5">{activeOrder.estimatedTime || '35-50 min'}</span>
              </div>
            </div>

            {/* Current status highlighted */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg flex items-start gap-4">
              <div className="bg-orange-500 rounded-full p-2.5 text-white animate-bounce mt-1">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-lg text-white">
                  {getStatusTextAndDesc(activeOrder.status).title}
                </h3>
                <p className="text-slate-300 text-xs mt-1">
                  {getStatusTextAndDesc(activeOrder.status).desc}
                </p>
              </div>
            </div>

            {/* Visual Progress Steps */}
            {activeOrder.status !== 'cancelado' ? (
              <div className="py-4 space-y-6">
                {[
                  { step: 'pendente', label: 'Pedido Recebido', desc: 'Aguardando que o dono do restaurante aprove.' },
                  { step: 'aceito', label: 'Pedido Confirmado', desc: 'Confirmado e enviado para a fila de confeção.' },
                  { step: 'preparando', label: 'A Cozinhar', desc: 'A sua refeição está a ser cozinhada com carinho.' },
                  { step: 'saiu_para_entrega', label: 'Saiu para Entrega', desc: activeOrder.driverName ? `Estafeta: ${activeOrder.driverName} (${activeOrder.estimatedTime || 'A caminho'})` : 'O estafeta está a recolher o seu pedido.' },
                  { step: 'entregue', label: 'Entregue', desc: 'Partilhe a sua experiência e bom apetite!' }
                ].map((item, idx) => {
                  const currentStepIdx = getStatusStep(activeOrder.status);
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={item.step} className="flex gap-4 relative">
                      {idx < 4 && (
                        <div className={`absolute left-4.5 top-9 w-0.5 h-12 -ml-px ${idx < currentStepIdx ? 'bg-orange-500' : 'bg-gray-200'}`} />
                      )}
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                        isCompleted
                          ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-300'
                      }`}>
                        {idx < currentStepIdx ? (
                          <Check className="h-4.5 w-4.5 stroke-[3]" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="pt-1.5">
                        <h4 className={`font-sans font-bold text-sm ${isCurrent ? 'text-slate-900 font-extrabold text-base' : isCompleted ? 'text-slate-700' : 'text-gray-400'}`}>
                          {item.label}
                        </h4>
                        <p className={`text-xs mt-0.5 leading-relaxed ${isCurrent ? 'text-slate-600 font-medium' : isCompleted ? 'text-gray-500' : 'text-gray-300'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 text-center text-rose-800 font-semibold text-sm">
                Esta encomenda foi cancelada. Entre em contacto com o restaurante para mais detalhes.
              </div>
            )}

            {/* Delivery Info Box */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="font-sans font-bold text-slate-900 text-sm">Dados de Entrega</h4>
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="block text-gray-400 font-medium">Cliente</span>
                  <span className="font-bold text-slate-800">{activeOrder.customerName}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-medium">Contacto</span>
                  <span className="font-bold text-slate-800">{activeOrder.customerPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-gray-400 font-medium">Endereço (Bairro / Cidade)</span>
                  <span className="font-bold text-slate-800">{activeOrder.customerArea}, {activeOrder.customerCity}</span>
                  <span className="block text-slate-600 font-medium mt-0.5">{activeOrder.customerAddress}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-medium">Pagamento</span>
                  <span className="font-bold text-slate-800 uppercase">{activeOrder.paymentMethod}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-medium">Total Pago</span>
                  <span className="font-bold text-orange-600 text-sm font-sans">{activeOrder.total} MT</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCheckoutStep('cart');
                setActiveOrder(null);
              }}
              className="w-full rounded-xl bg-slate-900 py-3 font-sans font-bold text-white hover:bg-slate-800 shadow-md transition-colors text-center block text-sm"
              id="back-to-shop-btn"
            >
              Fazer Nova Encomenda 🍕
            </button>
          </div>
        </main>
      ) : checkoutStep === 'payment_sim' ? (
        /* --- PAYMENT SIMULATION SCREEN --- */
        <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col items-center justify-center" id="payment-simulation-view">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center space-y-6 w-full animate-in fade-in zoom-in-95" id="payment-simulation-card">
            {/* Header with Operator brand and title */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center">
                {paymentMethod === 'mpesa' && (
                  <div className="bg-red-600 text-white px-5 py-2.5 rounded-2xl font-black text-xl shadow-lg tracking-wider">
                    M-PESA VODACOM
                  </div>
                )}
                {paymentMethod === 'emola' && (
                  <div className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-black text-xl shadow-lg tracking-wider">
                    E-MOLA MOVITEL
                  </div>
                )}
                {paymentMethod === 'mkesh' && (
                  <div className="bg-yellow-400 text-slate-950 px-5 py-2.5 rounded-2xl font-black text-xl shadow-lg tracking-wider">
                    mKesh TMCEL
                  </div>
                )}
              </div>
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" /> Gateway de Pagamento Seguro
              </p>
            </div>

            {simulatingPayment ? (
              /* Waiting for USSD Push Delivery simulation */
              <div className="space-y-4 py-8">
                <div className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="font-sans font-bold text-lg text-slate-900">A iniciar Push USSD...</h3>
                <p className="text-gray-500 text-xs max-w-xs mx-auto">
                  Estamos a enviar o pedido de autorização de pagamento para o telemóvel <strong className="font-mono text-slate-800">+258 {paymentPhone}</strong>.
                </p>
              </div>
            ) : paymentStage === 'enter_pin' ? (
              /* Stage 1: Enter PIN Screen */
              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Destinatário</span>
                    <span className="text-xs font-black text-slate-800">{businessConfig?.name || 'Salomao Food Delivery'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Valor do Pedido</span>
                    <span className="text-sm font-black text-orange-600">{getTotal()} MT</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Telemóvel Autorizado</span>
                    <span className="text-xs font-mono font-bold text-slate-800">+258 {paymentPhone}</span>
                  </div>
                </div>

                {/* Smartphone Screen Simulator */}
                <div className="bg-slate-950 text-white rounded-2xl p-5 text-left font-mono text-xs space-y-3 shadow-inner relative overflow-hidden border-4 border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pb-1 border-b border-white/5">
                    <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> USSD PUSH</span>
                    <span>Agora</span>
                  </div>
                  <p className="font-bold text-slate-100 text-xs">
                    Deseja pagar {getTotal()} MT a Salomao Food Delivery?
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Introduza o seu PIN de 4 dígitos para confirmar:
                  </p>

                  {/* Pin Dots Display */}
                  <div className="flex justify-center gap-3 my-4">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`h-4 w-4 rounded-full border-2 transition-all ${
                          pinValue.length > index
                            ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                            : 'border-white/20 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {paymentError && (
                    <p className="text-rose-400 text-center font-sans font-bold text-xs animate-shake">
                      ⚠️ {paymentError}
                    </p>
                  )}
                </div>

                {/* Interactive Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-sans font-bold text-base border border-slate-100 active:scale-95 transition-all shadow-xs"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="h-12 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-sans font-bold text-xs border border-rose-100 active:scale-95 transition-all"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-sans font-bold text-base border border-slate-100 active:scale-95 transition-all shadow-xs"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadDelete}
                    className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-sans font-black text-sm active:scale-95 transition-all"
                  >
                    ⌫
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={confirmSimulatedPayment}
                    className="w-full rounded-2xl bg-slate-900 hover:bg-orange-600 text-white py-3.5 font-sans font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    id="confirm-sim-payment-btn"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" /> Confirmar e Pagar
                  </button>
                  <button
                    onClick={() => {
                      setCheckoutStep('cart');
                      setPinValue('');
                    }}
                    className="w-full rounded-xl border border-gray-100 bg-white py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    id="cancel-sim-payment-btn"
                  >
                    Cancelar / Voltar
                  </button>
                </div>
              </div>
            ) : paymentStage === 'processing' ? (
              /* Stage 2: Processing Payment Screen */
              <div className="space-y-5 py-8 animate-in fade-in duration-300">
                <div className="relative flex justify-center">
                  <div className="h-16 w-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-orange-500 font-bold text-xs">
                    {paymentMethod === 'mpesa' ? 'VM' : 'MV'}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-sans font-black text-lg text-slate-900">A processar transação...</h3>
                  <p className="text-slate-500 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-xs mx-auto">
                    {simStepText}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Por favor, não feche esta página nem recarregue. A comunicação com a operadora está em curso.
                </p>
              </div>
            ) : (
              /* Stage 3: Payment Success Receipt Screen */
              <div className="space-y-5 animate-in zoom-in-95 duration-300 text-left">
                {/* Big Animated Success Badge */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                    <Check className="h-10 w-10 stroke-[3] animate-bounce" />
                  </div>
                  <h3 className="font-sans font-black text-2xl text-emerald-600 text-center">Pagamento Confirmado!</h3>
                  <p className="text-slate-500 text-xs text-center">A sua transação foi concluída e aprovada com sucesso.</p>
                </div>

                {/* Official Mobile Money Receipt */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Receipt className="h-3 w-3" /> Comprovativo de Pagamento
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase">
                      Sucesso
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">ID da Transação:</span>
                      <span className="font-mono font-black text-slate-900">{simTxnId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Método Utilizado:</span>
                      <span className="font-bold text-slate-800 uppercase">{paymentMethod === 'mpesa' ? 'M-Pesa (Vodacom)' : paymentMethod === 'emola' ? 'e-Mola (Movitel)' : 'mKesh (Tmcel)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Conta de Pagamento:</span>
                      <span className="font-mono font-bold text-slate-800">+258 {paymentPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Beneficiário:</span>
                      <span className="font-bold text-slate-800">{businessConfig?.name || 'Salomao Food Delivery'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 border-dashed pt-2.5">
                      <span className="text-slate-900 font-black">Valor Total Pago:</span>
                      <span className="text-orange-600 font-black text-base">{getTotal()} MT</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Notification / SMS Box */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-1 shadow-md border border-slate-800 relative overflow-hidden font-mono text-[11px]">
                  <div className="flex justify-between items-center text-[9px] text-emerald-400 pb-1.5 border-b border-white/5 font-sans font-bold">
                    <span>💬 SMS NOTIFICAÇÃO</span>
                    <span>Agora</span>
                  </div>
                  {paymentMethod === 'mpesa' ? (
                    <p className="text-slate-200 leading-relaxed pt-1.5">
                      <strong className="text-white">M-Pesa:</strong> {simTxnId} Confirmada. Pagou {getTotal()} MT a Salomao Food Delivery para a conta de serviços do restaurante. Novo saldo M-Pesa disponivel. Obrigado.
                    </p>
                  ) : paymentMethod === 'emola' ? (
                    <p className="text-slate-200 leading-relaxed pt-1.5">
                      <strong className="text-white">e-Mola:</strong> Transaccao {simTxnId} de {getTotal()} MT para Salomao Food Delivery efectuada com sucesso em {new Date().toLocaleDateString()}.
                    </p>
                  ) : (
                    <p className="text-slate-200 leading-relaxed pt-1.5">
                      <strong className="text-white">mKesh:</strong> Transacao {simTxnId} realizada. Debitado {getTotal()} MT para pagamento de servicos em Salomao Food Delivery.
                    </p>
                  )}
                </div>

                {/* Complete Button to go to Tracking */}
                <button
                  onClick={() => {
                    setCheckoutStep('tracking');
                  }}
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 font-sans font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 animate-pulse"
                  id="complete-checkout-btn"
                >
                  Concluir e Acompanhar Encomenda <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            )}
          </div>
        </main>
      ) : (
        /* --- MAIN CUSTOMER STORE VIEW --- */
        <>
          {/* Hero Promo Section */}
          <section className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-8 md:py-12 relative overflow-hidden shrink-0" id="customer-hero">
            <div className="absolute right-0 bottom-0 top-0 opacity-15 pointer-events-none">
              <svg width="400" height="400" viewBox="0 0 100 100" fill="currentColor">
                <path d="M10 80 Q 52.5 10, 95 80" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="52.5" cy="45" r="8" />
              </svg>
            </div>
            <div className="max-w-5xl mx-auto space-y-2 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-amber-50">
                Delivery de Comida em Moçambique 🇲🇿
              </span>
              <h2 className="font-sans font-black text-3xl md:text-5xl leading-tight text-white tracking-tight">
                Os Sabores Mais Autênticos <br />Entregues em Minutos!
              </h2>
              <p className="text-orange-100 text-xs md:text-sm max-w-md font-medium">
                Encomende Matapa, Frango Zambeziano, Caranguejo e muito mais. Pague de forma simples com M-Pesa ou e-Mola.
              </p>
            </div>
          </section>

          {/* Category Filters */}
          <div className="sticky top-[73px] z-30 bg-white border-b border-gray-100 shadow-xs px-4 py-3 shrink-0" id="customer-category-filters">
            <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  id={`cat-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6" id="customer-main">
            {filteredMenu.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Info className="h-12 w-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">Não há produtos nesta categoria</h3>
                <p className="text-slate-400 text-xs">Por favor selecione outra opção ou regresse mais tarde.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="menu-grid">
                {filteredMenu.map(item => (
                  <div
                    key={item.id}
                    className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                    id={`menu-item-card-${item.id}`}
                  >
                    {/* Item Image */}
                    <div className="h-48 overflow-hidden relative bg-slate-100">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider border border-slate-100">
                        {item.category}
                      </span>
                      {!item.available && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-rose-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                            Esgotado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <h4 className="font-sans font-bold text-slate-900 group-hover:text-orange-600 transition-colors text-base line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço</span>
                          <span className="font-sans font-black text-lg text-orange-600">{item.price} MT</span>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!item.available}
                          className="rounded-xl bg-slate-900 hover:bg-orange-600 text-white disabled:bg-slate-100 disabled:text-slate-300 px-4 py-2 text-xs font-bold shadow-xs hover:shadow-md transition-all duration-150 flex items-center gap-1"
                          id={`add-to-cart-btn-${item.id}`}
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[3]" /> Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Floating Shopping Cart Button (Mobile only) */}
          {cart.length > 0 && (
            <div className="fixed bottom-4 inset-x-4 md:hidden z-40 animate-bounce">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-slate-900 text-white rounded-2xl py-4 px-6 flex items-center justify-between shadow-xl font-bold text-sm"
                id="floating-cart-trigger"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 rounded-full h-6 w-6 flex items-center justify-center text-xs text-white">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                  <span>Ver Carrinho</span>
                </div>
                <span>{getSubtotal()} MT</span>
              </button>
            </div>
          )}

          {/* Cart Sidebar / Drawer (Overlay on all screens) */}
          {isCartOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs" id="cart-drawer-overlay">
              <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" id="cart-drawer">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-orange-600" />
                    <h3 className="font-sans font-black text-slate-900 text-lg">O Meu Pedido</h3>
                    <span className="bg-orange-100 text-orange-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)} itens
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    id="close-cart-btn"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body scroll */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {cart.length === 0 ? (
                    <div className="text-center py-20 space-y-3">
                      <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto" />
                      <h4 className="font-bold text-slate-500 text-sm">O seu carrinho está vazio</h4>
                      <p className="text-gray-400 text-xs">Adicione os deliciosos sabores do menu para iniciar!</p>
                    </div>
                  ) : (
                    <>
                      {/* Cart Items List */}
                      <div className="space-y-4">
                        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-400">Itens Selecionados</h4>
                        <div className="divide-y divide-gray-100">
                          {cart.map(item => (
                            <div key={item.menuItem.id} className="py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img src={item.menuItem.image} alt={item.menuItem.name} className="h-10 w-10 rounded-lg object-cover" />
                                <div>
                                  <h5 className="font-bold text-slate-900 text-sm line-clamp-1">{item.menuItem.name}</h5>
                                  <p className="text-orange-600 font-bold text-xs font-sans">{item.menuItem.price} MT</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 border border-slate-100 bg-slate-50/50 rounded-xl p-1 shrink-0">
                                <button
                                  onClick={() => updateQuantity(item.menuItem.id, -1)}
                                  className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-600 shadow-xs transition-colors"
                                  id={`qty-minus-${item.menuItem.id}`}
                                >
                                  <Minus className="h-3 w-3 stroke-[3]" />
                                </button>
                                <span className="font-sans font-bold text-sm px-2 text-slate-800">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.menuItem.id, 1)}
                                  className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-600 shadow-xs transition-colors"
                                  id={`qty-plus-${item.menuItem.id}`}
                                >
                                  <Plus className="h-3 w-3 stroke-[3]" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Form */}
                      <form onSubmit={handlePlaceOrderClick} className="space-y-4 pt-4 border-t border-gray-100" id="checkout-form">
                        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-400">Morada de Entrega</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">O seu Nome completo</label>
                            <input
                              type="text"
                              required
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Ex: Salomão Samuel"
                              className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:outline-hidden transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Contacto Telefónico</label>
                              <input
                                type="tel"
                                required
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Ex: 841234567"
                                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:outline-hidden transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cidade</label>
                              <select
                                value={customerCity}
                                onChange={(e) => {
                                  setCustomerCity(e.target.value);
                                  setCustomerArea('');
                                }}
                                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:outline-hidden transition-all"
                              >
                                <option value="Maputo">Maputo</option>
                                <option value="Matola">Matola</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Bairro / Zona</label>
                            <input
                              type="text"
                              required
                              list="bairros-list"
                              value={customerArea}
                              onChange={(e) => setCustomerArea(e.target.value)}
                              placeholder="Ex: Sommerschield"
                              className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:outline-hidden transition-all"
                            />
                            <datalist id="bairros-list">
                              {popularBairros[customerCity]?.map(b => (
                                <option key={b} value={b} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Morada de Detalhe e Ponto de Referência</label>
                            <input
                              type="text"
                              required
                              value={customerAddress}
                              onChange={(e) => setCustomerAddress(e.target.value)}
                              placeholder="Ex: Av. Mao Tse Tung, Prédio do banco, 1º andar"
                              className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-slate-50/50 focus:bg-white focus:border-orange-500 focus:outline-hidden transition-all"
                            />
                          </div>
                        </div>

                        {/* Payment Selector */}
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-400">Método de Pagamento</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'mpesa', label: 'M-Pesa MZN', color: 'border-red-500 text-red-600 bg-red-50/10' },
                              { id: 'emola', label: 'e-Mola MZN', color: 'border-orange-500 text-orange-600 bg-orange-50/10' },
                              { id: 'mkesh', label: 'mKesh MZN', color: 'border-yellow-500 text-yellow-600 bg-yellow-50/10' },
                              { id: 'dinheiro', label: 'Dinheiro', color: 'border-slate-800 text-slate-800 bg-slate-50' }
                            ].map(method => (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setPaymentMethod(method.id as any)}
                                className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${
                                  paymentMethod === method.id
                                    ? method.color
                                    : 'border-gray-100 text-gray-500 hover:bg-slate-50'
                                }`}
                                id={`pay-method-select-${method.id}`}
                              >
                                {paymentMethod === method.id && <Check className="h-3.5 w-3.5" />}
                                {method.label}
                              </button>
                            ))}
                          </div>

                          {paymentMethod !== 'dinheiro' && (
                            <div className="space-y-1 animate-in fade-in duration-150">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Número do Telemóvel do Pagamento</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 font-mono text-xs font-bold">+258</span>
                                <input
                                  type="text"
                                  required
                                  maxLength={9}
                                  value={paymentPhone}
                                  onChange={(e) => setPaymentPhone(e.target.value.replace(/\D/g, ''))}
                                  placeholder={paymentMethod === 'mpesa' ? "Ex: 841234567" : paymentMethod === 'emola' ? "Ex: 861234567" : "Ex: 821234567"}
                                  className={`w-full text-sm rounded-xl border pl-14 pr-3 py-2 bg-slate-50/50 focus:bg-white focus:outline-hidden transition-all font-mono ${
                                    getPaymentPhoneValidationError()
                                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/5'
                                      : paymentPhone.length === 9
                                      ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/5'
                                      : 'border-gray-200 focus:border-orange-500'
                                  }`}
                                />
                              </div>
                              {getPaymentPhoneValidationError() ? (
                                <p className="text-[11px] text-rose-500 font-bold font-sans mt-1 animate-pulse">
                                  ⚠️ {getPaymentPhoneValidationError()}
                                </p>
                              ) : paymentPhone.length === 9 ? (
                                <p className="text-[11px] text-emerald-600 font-bold font-sans mt-1">
                                  ✓ Número {paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'emola' ? 'e-Mola' : 'mKesh'} válido.
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-sans mt-1">
                                  {paymentMethod === 'mpesa' && "O número de M-Pesa deve começar com 84 ou 85"}
                                  {paymentMethod === 'emola' && "O número de e-Mola deve começar com 86 ou 87"}
                                  {paymentMethod === 'mkesh' && "O número de mKesh deve começar com 82 ou 83"}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </form>
                    </>
                  )}
                </div>

                {/* Footer totals */}
                {cart.length > 0 && (
                  <div className="p-4 border-t border-gray-100 bg-slate-50/50 space-y-4 shrink-0">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-semibold font-sans">{getSubtotal()} MT</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Taxa de Entrega</span>
                        <span className="font-semibold font-sans">{getDeliveryFee()} MT</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-black text-sm pt-1.5 border-t border-dashed border-gray-200">
                        <span>Total Geral</span>
                        <span className="text-orange-600 font-sans">{getTotal()} MT</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleWhatsAppCheckout}
                        type="button"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 px-4 font-sans font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        id="whatsapp-order-btn"
                      >
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.387 2.016 13.912.993 11.99.993c-5.442 0-9.87 4.372-9.874 9.802-.001 1.774.471 3.511 1.365 5.06l-.99 3.613 3.69-.954zm10.742-7.234c-.29-.145-1.711-.845-1.977-.94-.266-.097-.46-.145-.653.145-.193.29-.75.94-.917 1.13-.167.195-.335.218-.626.072-.29-.145-1.226-.452-2.335-1.44-1.258-1.121-1.435-1.637-1.634-2.016-.2-.378-.02-.58.162-.76.166-.164.335-.386.502-.58.166-.193.222-.33.334-.55.112-.22.056-.412-.028-.557-.084-.146-.653-1.575-.895-2.155-.236-.572-.496-.494-.679-.504-.175-.01-.376-.01-.577-.01-.2 0-.527.075-.803.376-.277.301-1.057 1.033-1.057 2.52 0 1.488 1.082 2.923 1.232 3.125.15.2 2.13 3.253 5.16 4.56.72.311 1.282.496 1.72.636.724.23 1.382.197 1.902.12.58-.087 1.712-.7 1.953-1.376.242-.676.242-1.255.17-1.376-.073-.12-.266-.194-.556-.34z" />
                        </svg>
                        <span>Comprar pelo WhatsApp • {getTotal()} MT</span>
                      </button>

                      <button
                        onClick={handlePlaceOrderClick}
                        type="button"
                        className="w-full text-slate-500 hover:text-slate-800 text-xs font-medium py-1.5 hover:underline transition-all flex items-center justify-center gap-1"
                        id="place-order-submit-btn"
                      >
                        <span>Encomendar apenas pela Aplicação</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Persistent Desktop Shopping Cart Panel (Visible only on medium/large screens next to menu) */}
          {cart.length > 0 && (
            <div className="hidden md:block fixed bottom-6 right-6 z-40">
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-slate-900 hover:bg-orange-600 text-white rounded-2xl py-4 px-6 flex items-center gap-4 shadow-2xl font-bold text-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                id="floating-cart-trigger-desktop"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 rounded-full h-6 w-6 flex items-center justify-center text-xs text-white">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                  <span>Ver Carrinho</span>
                </div>
                <span className="h-4 w-px bg-white/20"></span>
                <span className="text-orange-400">{getSubtotal()} MT</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
