import React, { useState } from 'react';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  Search,
  Database
} from 'lucide-react';
import { BlockchainRecord } from '../types';

interface BlockchainRecordsTableProps {
  records: BlockchainRecord[];
  title?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}

export const BlockchainRecordsTable: React.FC<BlockchainRecordsTableProps> = ({
  records,
  title = 'Реестр записей в блокчейне Solana Devnet',
  subtitle = 'История всех транзакций с Memo-инструкциями, подтвержденных валидаторами сети',
  className = '',
  compact = false,
}) => {
  const [copiedSig, setCopiedSig] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopy = (signature: string) => {
    navigator.clipboard.writeText(signature);
    setCopiedSig(signature);
    setTimeout(() => setCopiedSig(null), 2000);
  };

  const filteredRecords = records.filter((r) => 
    r.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.formattedTime.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                {records.length} {records.length === 1 ? 'запись' : records.length < 5 ? 'записи' : 'записей'}
              </span>
            </h3>
            {subtitle && (
              <p className="text-[11px] text-stone-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Search filter if there are several records */}
        {records.length > 2 && (
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по тексту или сигнатуре..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-stone-400"
            />
          </div>
        )}
      </div>

      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-stone-50 border border-stone-200/80 text-stone-500 text-xs">
          Записи не найдены
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((item, idx) => (
            <div
              key={item.id || item.signature || idx}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/40 hover:shadow-xs transition-all space-y-2.5 text-xs"
            >
              {/* Record content grid: Текст, Время, Ссылка */}
              <div className="space-y-2">
                {/* Текст */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold font-mono">
                    Текст:
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/80 text-stone-800 font-mono text-xs break-words leading-relaxed select-all">
                    {item.text}
                  </div>
                </div>

                {/* Время и Ссылка */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-stone-400 font-mono text-[11px]">Время:</span>
                    <strong className="font-medium text-stone-800">{item.formattedTime}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-400 font-mono text-[11px]">Ссылка:</span>
                    <a
                      href={item.explorerUrl || `https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-semibold text-xs transition-colors border border-emerald-200/80 shadow-2xs"
                    >
                      <span>Посмотреть запись</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom row: signature & memo program info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[11px] text-stone-500">
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-stone-400">Сигнатура:</span>
                  <span className="text-stone-700 font-medium">
                    {item.signature.slice(0, 10)}...{item.signature.slice(-10)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.signature)}
                    className="p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                    title="Скопировать сигнатуру"
                  >
                    {copiedSig === item.signature ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="text-stone-400 font-mono text-[10px] hidden sm:block">
                  Memo: MemoSq4gqABAXKb...
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
