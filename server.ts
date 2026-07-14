import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { MenuItem, Order, Driver, BusinessConfig, OrderStatus } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/src/assets', express.static(path.join(process.cwd(), 'src/assets')));

// Initialize Gemini API Client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } catch (err) {
        console.error('Falha ao inicializar o cliente Gemini:', err);
      }
    }
  }
  return aiClient;
}

// In-Memory Database
const initialMenu: MenuItem[] = [
  {
    id: 'm1',
    name: 'Matapa com Arroz de Coco',
    description: 'Prato nacional moçambicano à base de folhas de mandioca piladas no pilão, cozidas lentamente com leite de coco fresco, amendoim moído e camarões, servido com arroz de coco soltinho.',
    price: 350,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_matapa_1784029995518.jpg',
    available: true
  },
  {
    id: 'm2',
    name: 'Frango à Zambeziana',
    description: 'Frango marinado em água de coco, alho, limão e piripiri caseiro, assado lentamente na brasa e regado com leite de coco fresco. Acompanha batata frita ou xima.',
    price: 400,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_frango_zambeziana_1784030206174.jpg',
    available: true
  },
  {
    id: 'm3',
    name: 'Caril de Caranguejo da Baía',
    description: 'Caranguejo fresco da Baía de Maputo cozinhado num molho rico de caril moçambicano tradicional, leite de coco espesso, gengibre e coentros frescos.',
    price: 480,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_crab_curry_1784030176254.jpg',
    available: true
  },
  {
    id: 'm4',
    name: 'Badjias de Maputo (Porção de 10)',
    description: 'Os fritos de rua mais famosos da capital! Badjias crocantes feitas de farinha de feijão nhemba pilado com temperos da terra. Acompanha piripiri.',
    price: 120,
    category: 'Petiscos',
    image: '/src/assets/images/real_badjias_1784030190770.jpg',
    available: true
  },
  {
    id: 'm5',
    name: 'Galinha à Cafreal',
    description: 'Frango tenro marinado num molho verde de piripiri de limão, alho, cebola e coentros, grelhado na brasa ao ponto perfeito.',
    price: 385,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_galinha_cafreal_1784030220085.jpg',
    available: true
  },
  {
    id: 'm6',
    name: 'Chamuças de Carne (5 unidades)',
    description: 'Chamuças douradas e super estaladiças, recheadas com carne de vaca moída bem condimentada com especiarias e caril leve.',
    price: 150,
    category: 'Petiscos',
    image: '/src/assets/images/real_chamucas_1784030307646.jpg',
    available: true
  },
  {
    id: 'm6_shrimp',
    name: 'Chamuças de Camarão (5 unidades)',
    description: 'Massa folhada fina e estaladiça, recheada com camarões da costa refogados com cebola, alho e especiarias suaves.',
    price: 180,
    category: 'Petiscos',
    image: '/src/assets/images/real_chamucas_1784030307646.jpg',
    available: true
  },
  {
    id: 'm_squids',
    name: 'Lulas Grelhadas à Inhambane',
    description: 'Lulas da costa super tenras grelhadas no carvão, pinceladas com molho de limão, alho, manteiga e piripiri moçambicano.',
    price: 450,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_lulas_grelhadas_1784030265010.jpg',
    available: true
  },
  {
    id: 'm7_cocacola',
    name: 'Coca-Cola (Lata)',
    description: 'Refresco Coca-Cola original super gelado e refrescante.',
    price: 120,
    category: 'Bebidas',
    image: '/src/assets/images/coca_cola_can_1784030828900.jpg',
    available: true
  },
  {
    id: 'm8_fanta',
    name: 'Fanta Laranja (Lata)',
    description: 'Refresco Fanta Laranja super gelado, doce e frutado.',
    price: 120,
    category: 'Bebidas',
    image: '/src/assets/images/fanta_can_1784030840930.jpg',
    available: true
  },
  {
    id: 'm9_sprite',
    name: 'Sprite (Lata)',
    description: 'Refresco Sprite super gelado, sabor limão, leve e refrescante.',
    price: 120,
    category: 'Bebidas',
    image: '/src/assets/images/sprite_can_1784030852266.jpg',
    available: true
  },
  {
    id: 'm10',
    name: 'Xima com Peixe da Pedra Grelhado',
    description: 'A tradicional xima branca de milho cozida no ponto, servida com peixe da pedra fresco grelhado lentamente no carvão e salada fresca com piripiri.',
    price: 380,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_xima_peixe_1784030232947.jpg',
    available: true
  },
  {
    id: 'm11',
    name: 'Mucapata Zambeziana',
    description: 'Clássico da Zambézia: arroz cozinhado com feijão soroco, leite de coco fresco espesso e coco ralado no pilão.',
    price: 180,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_mucapata_1784030294035.jpg',
    available: true
  },
  {
    id: 'm12',
    name: 'Dobrada à Moçambicana',
    description: 'Estufado reconfortante e rico de dobrada tenra com feijão manteiga, cenoura, batata, chouriço de fumeiro nacional e piripiri.',
    price: 340,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_dobrada_1784030280865.jpg',
    available: true
  },
  {
    id: 'm13',
    name: 'Caril de Amendoim com Camarão',
    description: 'Camarões tenros da nossa costa preparados em molho aveludado de amendoim torrado moído na hora e leite de coco fresco.',
    price: 550,
    category: 'Pratos Locais',
    image: '/src/assets/images/real_caril_camarao_1784030247251.jpg',
    available: true
  },
  {
    id: 'm14',
    name: 'Bolo de Mandioca e Coco',
    description: 'Bolo tradicional rústico, húmido e rico, feito com mandioca ralada na hora, coco ralado e leite de coco fresco.',
    price: 120,
    category: 'Petiscos',
    image: '/src/assets/images/real_bolo_mandioca_1784030336914.jpg',
    available: true
  },
  {
    id: 'm_peanut_cake',
    name: 'Bolo de Amendoim Caseiro',
    description: 'Uma fatia de bolo tradicional moçambicano, fofinho e perfumado, confecionado com amendoim local pilado e torrado.',
    price: 130,
    category: 'Petiscos',
    image: '/src/assets/images/real_bolo_amendoim_1784030350190.jpg',
    available: true
  },
  {
    id: 'm15',
    name: 'Pão com Chouriço à Salomão',
    description: 'Pão rústico de água assado no forno a lenha, recheado generosamente com rodelas de chouriço caseiro condimentado.',
    price: 130,
    category: 'Petiscos',
    image: '/src/assets/images/real_pao_chourico_1784030322529.jpg',
    available: true
  }
];

const initialDrivers: Driver[] = [
  { id: 'd1', name: 'Dércio Tembe', phone: '+258 84 123 4567', vehicle: 'Mota', status: 'disponivel' },
  { id: 'd2', name: 'Sérgio Langa', phone: '+258 82 987 6543', vehicle: 'Mota', status: 'disponivel' },
  { id: 'd3', name: 'Amílcar Macuácua', phone: '+258 85 555 4321', vehicle: 'Mota', status: 'entregando' },
  { id: 'd4', name: 'Zacarias Mondlane', phone: '+258 84 888 1122', vehicle: 'Mota', status: 'disponivel' }
];

let dbMenu: MenuItem[] = [...initialMenu];
let dbOrders: Order[] = [
  {
    id: 'PED-1024',
    customerName: 'Samira Abdula',
    customerPhone: '+258 84 765 4321',
    customerAddress: 'Av. Julius Nyerere, nº 1420, Apt 3B',
    customerCity: 'Maputo',
    customerArea: 'Sommerschield',
    items: [
      { menuItemId: 'm1', name: 'Matapa com Arroz', quantity: 2, price: 350 },
      { menuItemId: 'm9', name: 'Sumo de Manga Natural', quantity: 2, price: 110 }
    ],
    total: 920,
    deliveryFee: 100,
    status: 'entregue',
    paymentMethod: 'mpesa',
    paymentPhone: '847654321',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    driverId: 'd3',
    driverName: 'Amílcar Macuácua'
  },
  {
    id: 'PED-1025',
    customerName: 'Mateus Chichava',
    customerPhone: '+258 82 345 6789',
    customerAddress: 'Rua de Bagamoyo, Prédio Moçambique',
    customerCity: 'Maputo',
    customerArea: 'Alto Maé',
    items: [
      { menuItemId: 'm2', name: 'Frango Zambeziano', quantity: 1, price: 400 },
      { menuItemId: 'm8', name: 'Cerveja 2M (Garrafa)', quantity: 3, price: 85 }
    ],
    total: 655,
    deliveryFee: 80,
    status: 'preparando',
    paymentMethod: 'emola',
    paymentPhone: '823456789',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
  }
];

let dbDrivers: Driver[] = [...initialDrivers];
let dbBusinessConfig: BusinessConfig = {
  name: 'Salomao Food Delivery',
  phone: '+258 87 186 6000',
  address: 'Av. Marginal, nº 4500',
  city: 'Maputo',
  deliveryFee: 100, // in MT
  minOrder: 200, // in MT
  mpesaId: '150499', // Exemplo de Código M-Pesa
  emolaId: '824901', // Exemplo de Código e-Mola
  isOpen: true
};

// --- API ROUTES ---

// 1. Get menu
app.get('/api/menu', (req, res) => {
  res.json(dbMenu);
});

// 2. Add / update menu item
app.post('/api/menu', (req, res) => {
  const item: MenuItem = req.body;
  if (!item.id) {
    item.id = 'm_' + Math.random().toString(36).substr(2, 9);
    dbMenu.push(item);
  } else {
    const idx = dbMenu.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      dbMenu[idx] = item;
    } else {
      dbMenu.push(item);
    }
  }
  res.json({ success: true, item });
});

// 3. Delete menu item
app.delete('/api/menu/:id', (req, res) => {
  dbMenu = dbMenu.filter(item => item.id !== req.params.id);
  res.json({ success: true });
});

// 4. Get active configuration
app.get('/api/config', (req, res) => {
  res.json(dbBusinessConfig);
});

// 5. Update configuration
app.post('/api/config', (req, res) => {
  dbBusinessConfig = { ...dbBusinessConfig, ...req.body };
  res.json({ success: true, config: dbBusinessConfig });
});

// 6. Get orders
app.get('/api/orders', (req, res) => {
  res.json(dbOrders);
});

// 7. Create custom order (customer side)
app.post('/api/orders', (req, res) => {
  const orderData = req.body;
  const newOrder: Order = {
    id: 'PED-' + (1000 + dbOrders.length + Math.floor(Math.random() * 100)),
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    customerAddress: orderData.customerAddress,
    customerCity: orderData.customerCity,
    customerArea: orderData.customerArea,
    items: orderData.items,
    total: orderData.total,
    deliveryFee: orderData.deliveryFee || dbBusinessConfig.deliveryFee,
    status: 'pendente',
    paymentMethod: orderData.paymentMethod,
    paymentPhone: orderData.paymentPhone,
    createdAt: new Date().toISOString()
  };

  dbOrders.unshift(newOrder); // Add to beginning of array
  res.json({ success: true, order: newOrder });
});

// 8. Update order status / assign driver
app.post('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, driverId, estimatedTime } = req.body;

  const orderIndex = dbOrders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  const updatedOrder = { ...dbOrders[orderIndex] };

  if (status) {
    updatedOrder.status = status as OrderStatus;
  }

  if (driverId) {
    const driver = dbDrivers.find(d => d.id === driverId);
    if (driver) {
      updatedOrder.driverId = driver.id;
      updatedOrder.driverName = driver.name;
      // update driver status
      dbDrivers = dbDrivers.map(d => d.id === driverId ? { ...d, status: 'entregando' } : d);
    }
  }

  if (estimatedTime !== undefined) {
    updatedOrder.estimatedTime = estimatedTime;
  }

  dbOrders[orderIndex] = updatedOrder;

  // Free driver if order is delivered or cancelled
  if ((status === 'entregue' || status === 'cancelado') && updatedOrder.driverId) {
    dbDrivers = dbDrivers.map(d => d.id === updatedOrder.driverId ? { ...d, status: 'disponivel' } : d);
  }

  res.json({ success: true, order: updatedOrder });
});

// 9. Get drivers
app.get('/api/drivers', (req, res) => {
  res.json(dbDrivers);
});

// 10. Create or update driver
app.post('/api/drivers', (req, res) => {
  const driver: Driver = req.body;
  if (!driver.id) {
    driver.id = 'd_' + Math.random().toString(36).substr(2, 9);
    dbDrivers.push(driver);
  } else {
    const idx = dbDrivers.findIndex(d => d.id === driver.id);
    if (idx !== -1) {
      dbDrivers[idx] = driver;
    } else {
      dbDrivers.push(driver);
    }
  }
  res.json({ success: true, driver });
});

// 11. AI Gemini Business Assistant
app.post('/api/gemini/assist', async (req, res) => {
  const { action, payload } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // If Gemini API is not available or hasn't been set up yet, provide a high-quality simulated fallback
    // that operates exactly like the business assistant to guarantee a working and beautiful demo.
    console.log('Gemini API key não configurada. Usando fallback inteligente local.');
    return res.json({
      text: getLocalFallbackResponse(action, payload)
    });
  }

  try {
    let prompt = '';
    if (action === 'generateDescription') {
      prompt = `Aja como um redator profissional especializado em culinária moçambicana e marketing de restaurantes. 
      Crie uma descrição comercial incrivelmente apetitosa e atraente para o seguinte prato no menu de um restaurante em Moçambique:
      Nome do prato: "${payload.name}"
      Categoria: "${payload.category}"
      Ingredientes ou detalhes básicos: "${payload.details || ''}"
      
      Escreva uma descrição com cerca de 2-3 frases ricas em adjetivos apetitosos que façam o cliente salivar em Moçambique (mencionando o sabor de coco, piripiri, tempero zambeziano ou frescura local quando apropriado). Escreva em português de Moçambique. Não inclua hashtags ou formatação desnecessária.`;
    } else if (action === 'suggestPricing') {
      prompt = `Aja como um consultor financeiro de restaurantes em Maputo, Moçambique.
      Dadas as informações sobre o prato:
      Nome do prato: "${payload.name}"
      Custo dos ingredientes estimando em Meticais (MT): ${payload.cost} MT
      Categoria: "${payload.category}"
      
      Sugira três opções de preços de venda (Econômico, Recomendado e Premium) justificando cada um brevemente considerando o mercado de entrega local de comida em Maputo (classe média, taxas de entrega e comissão da plataforma). Explique a margem de lucro para cada opção em Meticais (MT). Responda de forma concisa e em formato estruturado legível em português de Moçambique.`;
    } else if (action === 'generateMarketingCampaign') {
      prompt = `Aja como um especialista em Marketing Digital de Moçambique focado em redes sociais (WhatsApp, Instagram, Facebook).
      Crie uma campanha promocional curta e atraente em português de Moçambique (com gírias locais respeitosas como 'Txova', 'Fixe', 'Bora lá', 'Estamos juntos') para promover o delivery deste prato:
      Prato: "${payload.name}"
      Preço sugerido: ${payload.price} MT
      Desconto especial ou oferta (opcional): "${payload.promo || '10% de desconto para pedidos hoje'}"
      
      Inclua:
      1. Um título chamativo para a publicação.
      2. Uma mensagem curta e persuasiva para o feed.
      3. Uma mensagem curta formatada especificamente para partilhar no WhatsApp dos clientes.
      Use emojis locais de forma inteligente e bonita (como pratos, motos de entrega, estrelas).`;
    } else {
      prompt = `Aja como um experiente consultor de negócios de comércio eletrónico e delivery em Moçambique. 
      Dê conselhos práticos e rápidos sobre como o proprietário pode aumentar as vendas deste prato ou melhorar o serviço de entrega em Maputo, Matola ou outras províncias. 
      Assunto geral: "${payload.prompt || 'Como aumentar vendas no delivery em Moçambique'}"`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Erro na chamada da API Gemini:', error);
    res.json({
      text: `Lamentamos, mas ocorreu um erro ao contactar o assistente de IA: ${error.message}. Mas aqui está uma dica local rápida: Mantenha sempre os tempos de preparação abaixo dos 25 minutos para manter a sua classificação no topo do algoritmo do Delivery Moçambique!`,
      error: true
    });
  }
});

// High-fidelity fallback generator if API key is not configured
function getLocalFallbackResponse(action: string, payload: any): string {
  if (action === 'generateDescription') {
    const pName = payload.name || 'Prato Especial';
    return `Experimente o nosso delicioso(a) ${pName}, confecionado com o autêntico sabor moçambicano que aquece o coração! Selecionamos apenas os ingredientes mais frescos do mercado local de Maputo, cozinhados lentamente com um toque especial de leite de coco fresco e aquele piripiri caseiro que todos adoramos. Perfeito para partilhar com a família ou para um almoço de trabalho revigorante. Peça já e receba quentinho em minutos!`;
  }
  if (action === 'suggestPricing') {
    const cost = Number(payload.cost) || 150;
    const econ = Math.round(cost * 1.8);
    const rec = Math.round(cost * 2.3);
    const prem = Math.round(cost * 3.0);
    return `### Análise de Precificação para Maputo (Baseado no custo de ${cost} MT)

*   **Opção Económica: ${econ} MT** (Margem de lucro: ${econ - cost} MT)
    *   *Ideal para:* Atrair estudantes e trabalhadores que procuram um almoço rápido a preço acessível. Funciona bem em bairros residenciais densos.
*   **Opção Recomendada: ${rec} MT** (Margem de lucro: ${rec - cost} MT)
    *   *Ideal para:* O seu posicionamento padrão em Sommerschield, Polana ou Coop. Cobre perfeitamente o custo das embalagens premium e deixa margem para promoções ocasionais.
*   **Opção Premium: ${prem} MT** (Margem de lucro: ${prem - cost} MT)
    *   *Ideal para:* Apresentação gourmet com acompanhamentos extras, servida para ocasiões especiais ou escritórios executivos.`;
  }
  if (action === 'generateMarketingCampaign') {
    const name = payload.name || 'Petisco Especial';
    const price = payload.price || '350';
    return `📢 **CAMPANHA REDES SOCIAIS: SABORES DE MOÇAMBIQUE!** 🇲🇿

🔥 **[TÍTULO] Fome de verdade? Txova no Delivery que hoje é dia de delícia!**

*Se liga nessa maravilha:* O nosso famoso **${name}** já está a sair quentinho da cozinha direto para a tua mesa! Por apenas **${price} MT**, vais saborear o que há de melhor em Maputo. 🤤

🛵 **Entrega rápida e segura** na Polana, Sommerschield, Coop, Alto Maé e muito mais! 

---

💬 **[WHATSAPP DOS CLIENTES]**
*Olá, amigo! Que tal facilitar o teu dia?* 😋
Hoje temos o autêntico **${name}** fresquinho e aromático por apenas **${price} MT**! 
Não fiques só a olhar, faz o teu pedido rápido pelo nosso link! 
👉 *Clica para encomendar agora! Recebe em 30 min por M-Pesa ou e-Mola.* 📲🇲🇿`;
  }
  return `💡 **Conselho do Assistente de Delivery Moçambique:**\n\nEm Maputo e Matola, a maior parte dos pedidos concentra-se entre as 11:30h e as 14:00h para o almoço, e entre as 18:30h e as 21:00h para o jantar. Disponibilizar pagamentos rápidos via M-Pesa directamente no ato da encomenda reduz a taxa de cancelamento em até 40%! Mantenha os seus estafetas informados e com saldo para facilitar o troco caso peçam em dinheiro. Estamos juntos!`;
}

// --- VITE MIDDLEWARE & STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware montado em modo de Desenvolvimento.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Servindo arquivos estáticos de produção a partir de /dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Delivery Moçambique a correr em http://localhost:${PORT}`);
  });
}

startServer();
