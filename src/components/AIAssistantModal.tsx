import React, { useState } from 'react';
import { Sparkles, TrendingUp, Megaphone, Loader2, X, Bot, AlertCircle } from 'lucide-react';
import { MenuItem } from '../types';

interface AIAssistantModalProps {
  item?: MenuItem;
  onClose: () => void;
  onApplyDescription?: (desc: string) => void;
}

export default function AIAssistantModal({ item, onClose, onApplyDescription }: AIAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<'desc' | 'price' | 'marketing'>('desc');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form states
  const [priceCost, setPriceCost] = useState<string>(item ? String(Math.round(item.price * 0.4)) : '150');
  const [promoText, setPromoText] = useState<string>('15% de desconto para pedidos hoje pelo M-Pesa!');
  const [customDishName, setCustomDishName] = useState<string>(item?.name || '');
  const [customCategory, setCustomCategory] = useState<string>(item?.category || 'Pratos Locais');
  const [customIngredients, setCustomIngredients] = useState<string>('');

  const handleGenerate = async (type: 'desc' | 'price' | 'marketing') => {
    setLoading(true);
    setResult('');
    setErrorMsg('');

    const dishName = item?.name || customDishName;
    const category = item?.category || customCategory;

    if (!dishName) {
      setErrorMsg('Por favor, indique o nome do prato/produto.');
      setLoading(false);
      return;
    }

    let payload = {};
    if (type === 'desc') {
      payload = {
        name: dishName,
        category: category,
        details: customIngredients || item?.description
      };
    } else if (type === 'price') {
      payload = {
        name: dishName,
        category: category,
        cost: priceCost
      };
    } else if (type === 'marketing') {
      payload = {
        name: dishName,
        price: item?.price || '350',
        promo: promoText
      };
    }

    try {
      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'desc' ? 'generateDescription' : type === 'price' ? 'suggestPricing' : 'generateMarketingCampaign',
          payload
        })
      });

      const data = await response.json();
      if (data.text) {
        setResult(data.text);
      } else {
        setErrorMsg('Não foi possível obter resposta do Assistente Gemini.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de ligação ao servidor de Inteligência Artificial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" id="ai-assistant-overlay">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150" id="ai-assistant-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-50 bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 animate-pulse" />
            <div>
              <h3 className="font-sans font-bold text-lg">Assistente de Negócios Gemini</h3>
              <p className="text-orange-100 text-xs font-medium">Potencialize as vendas do seu delivery em Moçambique com IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
            title="Fechar"
            id="close-ai-modal-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Tabs Selector */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2" id="ai-tabs-container">
          <button
            onClick={() => { setActiveTab('desc'); setResult(''); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'desc'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-gray-500 hover:bg-white/50 hover:text-gray-900'
            }`}
            id="ai-tab-desc"
          >
            <Sparkles className="h-4 w-4" />
            Criador de Descrições
          </button>
          <button
            onClick={() => { setActiveTab('price'); setResult(''); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'price'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-gray-500 hover:bg-white/50 hover:text-gray-900'
            }`}
            id="ai-tab-price"
          >
            <TrendingUp className="h-4 w-4" />
            Estudo de Preços (MT)
          </button>
          <button
            onClick={() => { setActiveTab('marketing'); setResult(''); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'marketing'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-gray-500 hover:bg-white/50 hover:text-gray-900'
            }`}
            id="ai-tab-marketing"
          >
            <Megaphone className="h-4 w-4" />
            Campanha WhatsApp
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4" id="ai-modal-body">
          {/* Target Item Display */}
          {item ? (
            <div className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/30 p-3">
              <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
                <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                <p className="text-xs text-gray-500">Preço atual: {item.price} MT</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Prato/Produto</label>
                <input
                  type="text"
                  value={customDishName}
                  onChange={(e) => setCustomDishName(e.target.value)}
                  placeholder="Ex: Caril de Peixe da Costa"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-hidden"
                >
                  <option value="Pratos Locais">Pratos Locais</option>
                  <option value="Petiscos">Petiscos</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Sobremesas">Sobremesas</option>
                </select>
              </div>
            </div>
          )}

          {/* Form Fields Depending on Tab */}
          {activeTab === 'desc' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Ingredientes Chave ou Notas (Opcional)
                </label>
                <textarea
                  value={customIngredients}
                  onChange={(e) => setCustomIngredients(e.target.value)}
                  placeholder="Ex: piripiri moçambicano, bastante leite de coco fresco, cebola pilada, alho..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-orange-500 focus:outline-hidden"
                />
              </div>
              <p className="text-gray-500 text-xs">
                O Gemini irá redigir um texto de alta conversão usando termos culinários moçambicanos apelativos.
              </p>
            </div>
          )}

          {activeTab === 'price' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Custo Estimado dos Ingredientes (Meticais - MT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">MT</span>
                  <input
                    type="number"
                    value={priceCost}
                    onChange={(e) => setPriceCost(e.target.value)}
                    placeholder="Ex: 120"
                    className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-gray-500 text-xs">
                Análise baseada na margem de contribuição média recomendada para restauração em Maputo e Matola, considerando custos operacionais de entrega.
              </p>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Oferta Promocional do Dia (Opcional)
                </label>
                <input
                  type="text"
                  value={promoText}
                  onChange={(e) => setPromoText(e.target.value)}
                  placeholder="Ex: Pague via M-Pesa e a entrega é grátis na Sommerschield!"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-hidden"
                />
              </div>
              <p className="text-gray-500 text-xs">
                Cria cópias curtas prontas para WhatsApp com emojis locais e gírias amigáveis (como "Txova!") de Moçambique.
              </p>
            </div>
          )}

          {/* Action Trigger */}
          <button
            onClick={() => handleGenerate(activeTab)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 font-sans font-bold text-white shadow-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
            id="ai-generate-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando no cérebro do Gemini...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                {activeTab === 'desc' && 'Gerar Descrição Irresistível'}
                {activeTab === 'price' && 'Calcular Preço Recomendado'}
                {activeTab === 'marketing' && 'Criar Campanhas de Redes Sociais'}
              </>
            )}
          </button>

          {/* Results Area */}
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold">Houve um problema</h5>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border border-orange-100 bg-orange-50/10 p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between border-b border-orange-50 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" /> Sugestão da Inteligência Artificial
                </span>
                {activeTab === 'desc' && onApplyDescription && (
                  <button
                    onClick={() => {
                      onApplyDescription(result);
                      onClose();
                    }}
                    className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-200 transition-colors"
                    id="apply-ai-desc-btn"
                  >
                    Usar no Prato
                  </button>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-line text-sm leading-relaxed font-sans">
                {result}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            id="close-ai-modal-footer-btn"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
