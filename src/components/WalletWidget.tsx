import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Coins, 
  Copy, 
  Check, 
  RefreshCw, 
  LogOut, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface WalletWidgetProps {
  walletAddress: string | null;
  solBalance: string | null;
  ecoBalance: number;
  isConnecting: boolean;
  isLoadingSol: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshSol: () => void;
  onRequestAirdrop: () => void;
  isRequestingAirdrop: boolean;
  airdropSuccess: boolean;
}

export const WalletWidget: React.FC<WalletWidgetProps> = ({
  walletAddress,
  solBalance,
  ecoBalance,
  isConnecting,
  isLoadingSol,
  onConnect,
  onDisconnect,
  onRefreshSol,
  onRequestAirdrop,
  isRequestingAirdrop,
  airdropSuccess,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedSol = isLoadingSol ? '...' : (solBalance !== null ? solBalance : '0.1538');

  return (
    <div className="relative">
      {/* Compact Combined Balance Pill: 120 ECO | 0.1538 SOL */}
      <button
        type="button"
        onClick={() => {
          if (!walletAddress) {
            onConnect();
          } else {
            setIsMenuOpen((prev) => !prev);
          }
        }}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/40 text-stone-800 shadow-sm hover:shadow transition-all cursor-pointer text-xs"
        title={walletAddress ? `Кошелек: ${walletAddress}` : 'Подключить кошелёк'}
      >
        {/* Eco balance */}
        <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{ecoBalance} ECO</span>
        </div>

        <span className="text-stone-300 font-light">|</span>

        {/* SOL balance */}
        <div className="font-mono text-stone-600 font-medium">
          {formattedSol} SOL
        </div>

        <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Wallet Details Menu */}
      <AnimatePresence>
        {isMenuOpen && walletAddress && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-72 p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xl z-50 text-xs space-y-3"
          >
            <div className="flex items-center justify-between text-stone-500 pb-1 border-b border-stone-100">
              <span className="font-semibold text-stone-800">Phantom Кошелёк</span>
              <button
                type="button"
                onClick={onRefreshSol}
                className="hover:text-stone-900 transition-colors cursor-pointer p-1"
                title="Обновить баланс"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSol ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Balances breakdown */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/70">
              <div>
                <div className="text-[10px] text-stone-500">Эко-бонусы</div>
                <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                  {ecoBalance} ECO
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-500">Баланс Devnet</div>
                <div className="text-sm font-bold text-stone-800 font-mono mt-0.5">
                  {formattedSol} SOL
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/80 font-mono text-[11px] text-stone-600 break-all select-all">
              {walletAddress}
            </div>

            {/* Airdrop 1 SOL */}
            <button
              type="button"
              onClick={onRequestAirdrop}
              disabled={isRequestingAirdrop}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
            >
              <Coins className={`w-3.5 h-3.5 ${isRequestingAirdrop ? 'animate-spin' : ''}`} />
              <span>{isRequestingAirdrop ? 'Запрос airdrop...' : 'Запросить 1 SOL (Devnet)'}</span>
            </button>

            {airdropSuccess && (
              <div className="text-[11px] text-emerald-600 text-center font-medium">
                ✓ 1 SOL успешно начислен на баланс!
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors py-1 px-2 rounded-lg hover:bg-stone-50 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Копировать</span>
              </button>

              <a
                href={`https://explorer.solana.com/address/${walletAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-stone-500 hover:text-emerald-600 transition-colors py-1 px-2 rounded-lg hover:bg-stone-50"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDisconnect();
                }}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors py-1 px-2 rounded-lg hover:bg-stone-50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
