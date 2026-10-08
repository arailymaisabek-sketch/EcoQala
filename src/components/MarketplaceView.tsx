import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Sparkles, 
  Check, 
  Copy, 
  X, 
  Gift, 
  Bike, 
  ShoppingCart, 
  Coffee, 
  Bus, 
  TreePine, 
  Package
} from 'lucide-react';
import { MarketplaceItem } from '../types';
import { MARKETPLACE_ITEMS } from '../data/marketplace';

interface MarketplaceViewProps {
  ecoBalance: number;
  onSpendEco: (amount: number) => boolean;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  ecoBalance,
  onSpendEco,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [redeemedItem, setRedeemedItem] = useState<{
    item: MarketplaceItem;
    voucherCode: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredItems = MARKETPLACE_ITEMS.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'bike': return <Bike className="w-5 h-5 text-emerald-600" />;
      case 'shopping-cart': return <ShoppingCart className="w-5 h-5 text-emerald-600" />;
      case 'cup': return <Coffee className="w-5 h-5 text-emerald-600" />;
      case 'bus': return <Bus className="w-5 h-5 text-emerald-600" />;
      case 'tree': return <TreePine className="w-5 h-5 text-emerald-600 animate-tree-sway origin-bottom" />;
      case 'package': return <Package className="w-5 h-5 text-emerald-600" />;
      default: return <Gift className="w-5 h-5 text-emerald-600" />;
    }
  };

  const handleRedeem = (item: MarketplaceItem) => {
    setErrorMessage(null);
    if (ecoBalance < item.ecoCost) {
      setErrorMessage(`Недостаточно бонусов! Требуется ${item.ecoCost} ECO, ваш баланс: ${ecoBalance} ECO.`);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const success = onSpendEco(item.ecoCost);
    if (success) {
      const code = `ECO-KZ-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setRedeemedItem({ item, voucherCode: code });
    }
  };

  const handleCopyVoucher = () => {
    if (redeemedItem) {
      navigator.clipboard.writeText(redeemedItem.voucherCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Solid Opaque White */}
      <div className="eco-card-solid p-7 rounded-3xl bg-white border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span>Эко-Маркетплейс</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Обменивайте заработанные ECO-бонусы на купоны в кофейнях, инвентарь и саженцы
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <div className="text-sm font-bold font-mono text-emerald-700">
            Баланс: {ecoBalance} ECO
          </div>
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Все награды' },
          { id: 'voucher', label: 'Купоны и кофейни' },
          { id: 'product', label: 'Инвентарь и товары' },
          { id: 'green', label: 'Саженцы' },
          { id: 'transport', label: 'Транспорт' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`py-2 px-4 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedCategory === tab.id
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const canAfford = ecoBalance >= item.ecoCost;
          return (
            <div
              key={item.id}
              className="eco-card-interactive p-6 rounded-3xl bg-white border border-stone-200/80 shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.iconName)}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100">
                      {item.discountValue || 'Бонус'}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-stone-900 mb-2 leading-snug group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-700 font-normal leading-relaxed line-clamp-3 mb-5">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-stone-500 font-medium">Партнёр: {item.partner}</div>
                  <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                    {item.ecoCost} ECO
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRedeem(item)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    canAfford
                      ? 'eco-btn-interactive bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/15'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }`}
                >
                  {canAfford ? 'Обменять на бонусы' : `Нужно ${item.ecoCost} ECO`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Redemption Success Modal */}
      <AnimatePresence>
        {redeemedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-7 shadow-2xl relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setRedeemedItem(null)}
                className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Бонус успешно получен!
                </h3>
                <p className="text-xs text-stone-500">
                  {redeemedItem.item.title} ({redeemedItem.item.partner})
                </p>
              </div>

              {/* Voucher Code Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-2">
                <div className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">
                  Ваш уникальный промокод / ваучер
                </div>
                <div className="text-xl font-mono font-bold text-emerald-700 tracking-wider">
                  {redeemedItem.voucherCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyVoucher}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 font-medium py-1.5 px-3 rounded-xl bg-white border border-stone-200 shadow-sm cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                  )}
                  <span>{copiedCode ? 'Скопировано!' : 'Скопировать промокод'}</span>
                </button>
              </div>

              <p className="text-xs text-stone-400 text-center leading-relaxed">
                Покажите промокод на кассе партнёра или введите при оформлении заказа.
              </p>

              <button
                type="button"
                onClick={() => setRedeemedItem(null)}
                className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Готово
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
