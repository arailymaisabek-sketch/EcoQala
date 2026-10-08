import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  TreePine, 
  Coins, 
  MapPin, 
  ArrowRight, 
  Award,
  Users,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  RefreshCw
} from 'lucide-react';
import { KazakhstanCity, EcoQuest, PersonalProgress, BlockchainRecord } from '../types';
import { getCityProgress } from '../data/cityStats';
import { sendMemoTransaction, loadBlockchainRecords } from '../services/solanaService';
import { BlockchainRecordsTable } from './BlockchainRecordsTable';

interface DashboardViewProps {
  city: KazakhstanCity;
  personalProgress: PersonalProgress;
  activeQuests: EcoQuest[];
  walletAddress: string | null;
  onNavigateToScanner: () => void;
  onSelectQuestForScan: (quest: EcoQuest) => void;
  onNavigateToQuests: () => void;
  onNavigateToShop: () => void;
  onRecordSuccess?: (record: BlockchainRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  city,
  personalProgress,
  activeQuests,
  walletAddress,
  onNavigateToScanner,
  onSelectQuestForScan,
  onNavigateToQuests,
  onNavigateToShop,
  onRecordSuccess,
}) => {
  const cityProgress = getCityProgress(city);

  const percentTrash = Math.min(
    100,
    Math.round((cityProgress.monthlyTrashKg / cityProgress.targetTrashKg) * 100)
  );

  // Blockchain direct recording states
  const [memoInput, setMemoInput] = useState(
    `[EcoQala] Эко-дело: Уборка и сортировка вторсырья (${city.name}) | Награда: +30 ECO | Верифицировано`
  );
  const [txStatus, setTxStatus] = useState<'idle' | 'recording' | 'success' | 'error'>('idle');
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastMemoText, setLastMemoText] = useState<string>('');
  const [txError, setTxError] = useState<string | null>(null);
  const [records, setRecords] = useState<BlockchainRecord[]>(() => loadBlockchainRecords());

  const handleSendBlockchainMemo = async () => {
    setTxError(null);
    setTxStatus('recording');
    setLastMemoText(memoInput);

    const result = await sendMemoTransaction(memoInput, {
      ecoReward: 30,
      walletAddress,
    });

    if (!result.success) {
      setTxError(result.errorMessage || 'Ошибка записи в Solana Devnet.');
      setTxStatus('error');
      return;
    }

    const sig = result.signature!;
    setLastSignature(sig);
    setTxStatus('success');

    const updated = loadBlockchainRecords();
    setRecords(updated);

    if (result.record && onRecordSuccess) {
      onRecordSuccess(result.record);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section: Solid Opaque White with One-line Slogan */}
      <div className="eco-card-solid p-8 sm:p-10 bg-white border border-stone-200/90 rounded-3xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-sparkle-twinkle" />
            <span>Эко-платформа · {city.name}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
            EcoQala
          </h1>

          {/* Short one-line slogan as requested */}
          <p className="text-base sm:text-lg text-emerald-700 font-medium">
            Убирай мусор, сажай деревья и получай эко-бонусы!
          </p>

          {/* Big bright primary CTA button with animated leaf & sparkles icon */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToScanner}
              className="eco-btn-interactive group inline-flex items-center gap-3.5 px-8 py-4.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
            >
              {/* Animated eco-badge inside button: floating green leaf + twinkling AI sparkles */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 text-white shadow-xs">
                {/* Floating Swaying Leaf SVG */}
                <svg
                  className="w-5 h-5 text-white animate-leaf-pulse-float"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3 11 0 14-14 14-14s-3 1-5 2z" />
                </svg>
                {/* Twinkling AI sparkles on top */}
                <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-sparkle-twinkle" />
              </div>

              <span className="tracking-tight">Зафиксировать эко-дело через ИИ</span>
              <ArrowRight className="w-5 h-5 text-emerald-100 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Soft decorative background circles */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      </div>

      {/* Progress Cards: Personal & City Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Progress Card */}
        <div className="eco-card-interactive p-7 rounded-3xl bg-white border border-stone-200/90 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Личный эко-прогресс
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/60">
              Активист
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Trash */}
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-100">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs mb-1">
                <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Мусор</span>
              </div>
              <div className="text-xl font-bold font-mono text-stone-900">
                {personalProgress.trashKg} кг
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">собрано</div>
            </div>

            {/* Trees */}
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-100">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs mb-1">
                <TreePine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Деревья</span>
              </div>
              <div className="text-xl font-bold font-mono text-stone-900">
                {personalProgress.treesPlanted} шт
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">высажено</div>
            </div>

            {/* Eco tokens earned */}
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-100">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs mb-1">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Бонусы</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600">
                +{personalProgress.earnedEco}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">ECO всего</div>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100">
            <span>Эко-рейтинг пользователя:</span>
            <span className="font-semibold text-emerald-700">Топ-10% волонтёров</span>
          </div>
        </div>

        {/* City Contribution Card */}
        <div className="eco-card-interactive p-7 rounded-3xl bg-white border border-stone-200/90 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Вклад города: {city.name}
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/60">
              Месячная цель
            </span>
          </div>

          {/* Sprouting tree seedling animation badge */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                <svg
                  className="w-6 h-6 animate-sapling-sprout origin-bottom"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22v-9" className="stroke-emerald-700" strokeWidth="2.5" />
                  <path d="M12 13C12 9 8 8 6 9c-1 3 2 6 6 4" className="fill-emerald-500 stroke-emerald-600" />
                  <path d="M12 10c0-4 4-5 6-4 1 3-2 6-6 4" className="fill-emerald-400 stroke-emerald-500" />
                  <path d="M7 22h10" className="stroke-stone-400" strokeWidth="2" />
                </svg>
              </div>

              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                Жители <span className="text-emerald-700 font-bold">{city.name}</span> собрали{' '}
                <strong className="text-stone-900 font-mono font-bold">{cityProgress.monthlyTrashKg.toLocaleString('ru-RU')} кг</strong>{' '}
                мусора за этот месяц и высадили{' '}
                <strong className="text-stone-900 font-mono font-bold">{cityProgress.monthlyTrees} деревьев</strong>.
              </p>
            </div>

            {/* Shimmering progress bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-stone-500 font-mono">
                <span>Цель месяца: {cityProgress.targetTrashKg.toLocaleString('ru-RU')} кг</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {percentTrash}% выполнено
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-stone-200/80 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full animate-progress-shimmer transition-all duration-700 shadow-xs"
                  style={{ width: `${percentTrash}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>{cityProgress.activeVolunteers} активных участников</span>
            </span>
            <span className="font-semibold text-emerald-600">
              +{Math.round(cityProgress.monthlyTrashKg * 0.4)} кг CO₂ спасено
            </span>
          </div>
        </div>
      </div>

      {/* Dedicated Section: Запись в блокчейн Solana (Devnet) с Memo программой */}
      <div className="eco-card-solid p-7 rounded-3xl bg-white border border-stone-200/90 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                Фиксация эко-дел в блокчейне Solana Devnet
              </h2>
              <p className="text-xs text-stone-500">
                Инструкция Memo (программа MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr). Текст кодируется через TextEncoder.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold font-mono border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Solana Devnet</span>
          </div>
        </div>

        {/* Input & Action */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700">
              Текст для записи в Memo-инструкцию:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                type="text"
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="Введите эко-дело для блокчейна..."
                className="flex-1 px-4 py-3 text-xs font-mono rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-stone-400"
              />

              {/* Main Action Button */}
              {txStatus !== 'recording' ? (
                <button
                  type="button"
                  onClick={handleSendBlockchainMemo}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Записать в блокчейн Solana</span>
                </button>
              ) : (
                /* Пока идёт, показывай «Записываем в блокчейн…» */
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 shrink-0 animate-pulse cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Записываем в блокчейн…</span>
                </button>
              )}
            </div>
          </div>

          {/* Статус выполнения транзакции */}
          {/* Пока идёт, показывай «Записываем в блокчейн…» */}
          {txStatus === 'recording' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800 animate-pulse">
              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <div>
                <strong>Записываем в блокчейн…</strong>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Транзакция отправляется в Solana Devnet через подключённый кошелёк Phantom. Комиссию оплачивает ваш кошелёк.
                </p>
              </div>
            </div>
          )}

          {/* После успешной транзакции покажи «Записано в блокчейн» и ссылку «Посмотреть запись» на explorer */}
          {txStatus === 'success' && lastSignature && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Записано в блокчейн</span>
                </div>

                {/* Primary Link: «Посмотреть запись» */}
                <a
                  href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Посмотреть запись</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 font-mono text-[11px] text-stone-800 break-words">
                {lastMemoText}
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono pt-1">
                <span>Сигнатура: {lastSignature.slice(0, 12)}...{lastSignature.slice(-12)}</span>
                <span className="text-emerald-700 font-semibold">✓ Подтверждено</span>
              </div>
            </div>
          )}

          {/* Если пользователь отменил или случилась ошибка, покажи понятное сообщение на русском */}
          {txStatus === 'error' && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold">Ошибка записи в блокчейн:</strong>
                <p className="leading-relaxed">
                  {txError || 'Произошла ошибка при отправке транзакции.'}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSendBlockchainMemo}
                    className="inline-flex items-center gap-1 text-red-700 hover:text-red-900 font-bold underline cursor-pointer"
                  >
                    <span>Повторить попытку</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ниже веди список всех записей: текст, время, ссылка */}
        <div className="pt-2">
          <BlockchainRecordsTable records={records} />
        </div>
      </div>

      {/* Minimalist Quest Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">
            Актуальные эко-задания в {city.name}
          </h2>
          <button
            type="button"
            onClick={onNavigateToQuests}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
          >
            Все задания ({activeQuests.length}) →
          </button>
        </div>

        {/* Minimalist Cards Grid: large white blocks with green icons & bright buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeQuests.slice(0, 3).map((quest) => (
            <div
              key={quest.id}
              className="eco-card-interactive p-6 rounded-3xl bg-white border border-stone-200/80 shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    {quest.category === 'trees' ? (
                      <TreePine className="w-6 h-6 stroke-[2] animate-tree-sway origin-bottom" />
                    ) : (
                      <Trash2 className="w-6 h-6 stroke-[2]" />
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100">
                      +{quest.rewardEco} ECO
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-stone-900 mb-2 leading-snug group-hover:text-emerald-700 transition-colors">
                  {quest.title}
                </h3>
                <p className="text-xs text-stone-700 font-normal leading-relaxed mb-5 line-clamp-2">
                  {quest.description}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <span className="text-xs text-stone-600 truncate flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{quest.locationName.split(' и ')[0]}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectQuestForScan(quest)}
                  className="eco-btn-interactive py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  Выполнить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
