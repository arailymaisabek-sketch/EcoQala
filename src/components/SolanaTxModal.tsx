import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ExternalLink, Copy, Check, X, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import { loadBlockchainRecords } from '../services/solanaService';
import { BlockchainRecord } from '../types';

interface SolanaTxModalProps {
  signature: string;
  memoText: string;
  ecoAmount: number;
  walletAddress?: string;
  onClose: () => void;
}

export const SolanaTxModal: React.FC<SolanaTxModalProps> = ({
  signature,
  memoText,
  ecoAmount,
  walletAddress,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [allRecords, setAllRecords] = useState<BlockchainRecord[]>([]);

  useEffect(() => {
    setAllRecords(loadBlockchainRecords());
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(signature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl max-h-[90vh] bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-2xl relative flex flex-col overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-stone-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto space-y-5 pr-1 flex-1">
          {/* Header: Записано в блокчейн */}
          <div className="text-center space-y-1.5 pt-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
              Записано в блокчейн
            </h3>
            <p className="text-xs text-stone-500">
              Транзакция успешно подтверждена валидаторами в сети Solana Devnet
            </p>
          </div>

          {/* Reward pill */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-900 font-semibold">Начислено за эко-дело:</span>
            </div>
            <span className="font-mono text-emerald-700 font-bold text-base">
              +{ecoAmount} ECO
            </span>
          </div>

          {/* Memo Content */}
          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono">
              Текст текущей записи (Memo):
            </div>
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 font-mono break-words leading-relaxed">
              {memoText}
            </div>
          </div>

          {/* Signature Box & Primary Link: Посмотреть запись */}
          <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Сигнатура транзакции:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 font-mono text-xs text-stone-700 hover:text-stone-900 cursor-pointer font-medium"
              >
                <span>{signature.slice(0, 8)}...{signature.slice(-8)}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-stone-200/80 pt-2">
              <span className="text-stone-500">Программа:</span>
              <span className="font-mono text-[11px] text-stone-600">
                MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr
              </span>
            </div>

            {/* Prominent Button: «Посмотреть запись» */}
            <div className="pt-1">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Посмотреть запись</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Ниже веди список всех записей: текст, время, ссылка */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
                Список всех записей в блокчейне ({allRecords.length})
              </h4>
              <span className="text-[11px] text-stone-400">текст, время, ссылка</span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {allRecords.map((item) => (
                <div
                  key={item.id || item.signature}
                  className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2"
                >
                  {/* Текст */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                      Текст:
                    </span>
                    <div className="text-stone-800 font-mono text-[11px] break-words bg-white/70 p-2 rounded-xl border border-stone-200/60">
                      {item.text}
                    </div>
                  </div>

                  {/* Время и Ссылка */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="text-stone-400 font-mono">Время:</span>
                      <strong>{item.formattedTime}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400 font-mono">Ссылка:</span>
                      <a
                        href={item.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
                      >
                        <span>Посмотреть запись</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-4 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </div>
  );
};
