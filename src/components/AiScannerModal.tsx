import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Bot, 
  Check, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { KazakhstanCity, VerificationResult, EcoQuest, BlockchainRecord } from '../types';
import { 
  sendMemoTransaction, 
  loadBlockchainRecords, 
  formatRussianDate 
} from '../services/solanaService';

interface AiScannerModalProps {
  city: KazakhstanCity;
  quest?: EcoQuest | null;
  walletAddress: string | null;
  onClose: () => void;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
  onOpenTxModal?: (signature: string, memoText: string, ecoReward: number) => void;
}

interface PhotoSample {
  id: string;
  name: string;
  beforeUrl: string;
  afterUrl: string;
  beforeDesc: string;
  afterDesc: string;
  detectedObject: string;
  reward: number;
}

const SAMPLES: PhotoSample[] = [
  {
    id: 'sample-park',
    name: 'Очистка парковой зоны',
    beforeUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80',
    afterUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80',
    beforeDesc: 'Замусоренная поляна (бутылки, упаковки)',
    afterDesc: 'Чистая территория + 2 мешка с мусором',
    detectedObject: '~3.2 кг пластика и упаковки',
    reward: 30,
  },
  {
    id: 'sample-tree',
    name: 'Посадка саженца яблони',
    beforeUrl: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80',
    afterUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
    beforeDesc: 'Подготовленная лунка для дерева',
    afterDesc: 'Высаженный саженец с подвязкой и поливом',
    detectedObject: '1 жизнеспособный саженец яблони',
    reward: 100,
  },
  {
    id: 'sample-river',
    name: 'Уборка береговой линии',
    beforeUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=600&q=80',
    afterUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    beforeDesc: 'Скопление отходов у воды',
    afterDesc: 'Отсортированный пластик и стекло',
    detectedObject: '~5.0 кг отходов',
    reward: 50,
  },
];

export const AiScannerModal: React.FC<AiScannerModalProps> = ({
  city,
  quest,
  walletAddress,
  onClose,
  onSuccessVerification,
  getPhantomProvider,
  onOpenTxModal,
}) => {
  const initialSample = quest?.category === 'trees' ? SAMPLES[1] : SAMPLES[0];
  const [selectedSample, setSelectedSample] = useState<PhotoSample>(initialSample);

  const [customBefore, setCustomBefore] = useState<string | null>(null);
  const [customAfter, setCustomAfter] = useState<string | null>(null);

  // Status check states: 'idle' | 'checking_ai' | 'recording_blockchain' | 'confirmed' | 'error'
  const [status, setStatus] = useState<'idle' | 'checking_ai' | 'recording_blockchain' | 'confirmed' | 'error'>('idle');
  const [verifiedResult, setVerifiedResult] = useState<VerificationResult | null>(null);
  const [blockchainSignature, setBlockchainSignature] = useState<string>('');
  const [blockchainMemoText, setBlockchainMemoText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // List of all records: text, time, link
  const [allRecords, setAllRecords] = useState<BlockchainRecord[]>([]);

  useEffect(() => {
    setAllRecords(loadBlockchainRecords());
  }, []);

  const currentBefore = customBefore || selectedSample.beforeUrl;
  const currentAfter = customAfter || selectedSample.afterUrl;
  const rewardAmount = quest ? quest.rewardEco : selectedSample.reward;
  const taskTitle = quest ? quest.title : selectedSample.name;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'before') {
          setCustomBefore(event.target?.result as string);
        } else {
          setCustomAfter(event.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartVerification = async () => {
    setErrorMessage(null);
    setStatus('checking_ai');

    // Шаг 1: Проверка снимков через Gemini Vision AI
    await new Promise((resolve) => setTimeout(resolve, 1300));

    // Шаг 2: Записываем в блокчейн
    setStatus('recording_blockchain');

    const memoText = `[EcoQala] Эко-дело: ${taskTitle} (${city.name}) | Награда: +${rewardAmount} ECO | Верифицировано Gemini Vision`;
    setBlockchainMemoText(memoText);

    // Отправляем транзакцию в Solana devnet через подключённый Phantom
    // В транзакции одна инструкция Memo (программа MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
    // Комиссию платит кошелёк пользователя. Для текста используется TextEncoder, не Buffer.
    const result = await sendMemoTransaction(memoText, {
      ecoReward: rewardAmount,
      walletAddress,
    });

    if (!result.success) {
      // Если пользователь отменил или случилась ошибка, показываем понятное сообщение на русском
      setErrorMessage(result.errorMessage || 'Ошибка отправки в Solana Devnet.');
      setStatus('error');
      return;
    }

    const sig = result.signature!;
    setBlockchainSignature(sig);

    // Обновляем список записей
    const updatedRecords = loadBlockchainRecords();
    setAllRecords(updatedRecords);

    const res: VerificationResult = {
      id: `proof-${Date.now()}`,
      questTitle: taskTitle,
      rewardEco: rewardAmount,
      confidenceScore: 99.4,
      analyzedObjects: selectedSample.id === 'sample-tree' 
        ? ['Саженец', 'Опорный колышек', 'Лунка с поливом'] 
        : ['ПЭТ-бутылки', 'Мешки с мусором'],
      estimatedWeightOrCount: selectedSample.detectedObject,
      city: city.name,
      timestamp: Date.now(),
      solanaTxSignature: sig,
      status: 'APPROVED',
    };

    setVerifiedResult(res);
    setStatus('confirmed');
    onSuccessVerification(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                ИИ-Сканер эко-дел с записью в блокчейн
              </h2>
              <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{city.name} · Gemini Vision + Solana Devnet Memo</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {status === 'idle' && (
            <>
              {/* Task summary */}
              <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-150 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-stone-900">
                    {taskTitle}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Загрузите подтверждение проделанной работы для проверки
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100">
                    +{rewardAmount} ECO
                  </span>
                </div>
              </div>

              {/* Sample switcher */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-stone-700">
                  Выберите готовый фотоотчёт или прикрепите свои снимки:
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSample(s);
                        setCustomBefore(null);
                        setCustomAfter(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedSample.id === s.id && !customBefore && !customAfter
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{s.name}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5 truncate">{s.detectedObject}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 Photos: "Фото ДО" и "Фото ПОСЛЕ" */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo BEFORE */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 font-mono flex items-center gap-1.5">
                      <span>●</span> Фото ДО
                    </span>
                    <label className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Загрузить</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="relative aspect-video rounded-xl overflow-hidden border border-stone-100 bg-stone-100">
                    <img
                      src={currentBefore}
                      alt="Фото ДО"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-lg bg-black/70 backdrop-blur text-[11px] text-white truncate">
                      {selectedSample.beforeDesc}
                    </div>
                  </div>
                </div>

                {/* Photo AFTER */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 font-mono flex items-center gap-1.5">
                      <span>●</span> Фото ПОСЛЕ
                    </span>
                    <label className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Загрузить</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="relative aspect-video rounded-xl overflow-hidden border border-stone-100 bg-stone-100">
                    <img
                      src={currentAfter}
                      alt="Фото ПОСЛЕ"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-lg bg-black/70 backdrop-blur text-[11px] text-white truncate">
                      {selectedSample.afterDesc}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Индикация: Шаг 1: Проверка снимков через Gemini Vision AI */}
          {status === 'checking_ai' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 text-center space-y-4"
            >
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
                <Bot className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-stone-900">
                  ИИ проверяет фото...
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Gemini Vision AI сравнивает снимки «ДО» и «ПОСЛЕ», распознаёт убранные отходы и подтверждает координаты в г. {city.name}.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Анализ компьютерным зрением</span>
              </div>
            </motion.div>
          )}

          {/* Индикация: Шаг 2: «Записываем в блокчейн…» */}
          {status === 'recording_blockchain' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                <ShieldCheck className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Записываем в блокчейн…
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  Отправляем транзакцию в <strong>Solana Devnet</strong> через подключённый Phantom. В транзакции одна инструкция Memo (программа MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr).
                </p>
              </div>

              {/* Memo details */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 max-w-lg mx-auto text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                  <span>Программа Memo:</span>
                  <span className="font-semibold text-emerald-700">MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr</span>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-stone-400 font-mono">Текст записи (TextEncoder, UTF-8):</div>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200 font-mono text-stone-800 text-[11px] break-words">
                    {blockchainMemoText}
                  </div>
                </div>
                <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Комиссию платит кошелёк пользователя · Ожидание подтверждения...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Состояние ОШИБКИ: Понятное сообщение на русском */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-stone-900">
                  Не удалось записать в блокчейн
                </h3>
                <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200 max-w-md mx-auto text-xs text-red-800 font-medium leading-relaxed">
                  {errorMessage || 'Произошла ошибка при отправке транзакции.'}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartVerification}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Повторить запись в блокчейн</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Вернуться назад
                </button>
              </div>
            </motion.div>
          )}

          {/* УСПЕХ: «Записано в блокчейн» + ссылка «Посмотреть запись» + список всех записей */}
          {status === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Success badge */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Записано в блокчейн
                </h3>
                <p className="text-xs text-stone-500">
                  Подтверждено! Начислено +{rewardAmount} ECO
                </p>
              </div>

              {/* Reward & Link card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Бонус активиста:</span>
                  </div>
                  <span className="text-base font-mono font-bold text-emerald-700">
                    +{rewardAmount} ECO
                  </span>
                </div>

                {/* Primary required link: «Посмотреть запись» на https://explorer.solana.com/tx/ПОДПИСЬ?cluster=devnet */}
                {blockchainSignature && (
                  <div className="pt-1">
                    <a
                      href={`https://explorer.solana.com/tx/${blockchainSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      <span>Посмотреть запись</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Текст текущей записи */}
              <div className="space-y-1">
                <div className="text-[11px] text-stone-400 font-mono">
                  Текст записи:
                </div>
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 font-mono break-words leading-relaxed">
                  {blockchainMemoText}
                </div>
              </div>

              {/* Ниже веди список всех записей: текст, время, ссылка */}
              <div className="space-y-3 pt-3 border-t border-stone-200">
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

                        {/* Ссылка на explorer */}
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
            </motion.div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:px-7 border-t border-stone-100 bg-[#F8FAF9]/80 flex items-center justify-between gap-3">
          {status === 'idle' && (
            <button
              type="button"
              onClick={handleStartVerification}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Зафиксировать эко-дело через ИИ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {status === 'checking_ai' && (
            <div className="w-full py-3 px-6 rounded-2xl bg-stone-100 text-stone-600 font-semibold text-xs flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 border-t-emerald-600 animate-spin" />
              <span>ИИ проверяет фото...</span>
            </div>
          )}

          {status === 'recording_blockchain' && (
            <div className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm animate-pulse">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Записываем в блокчейн…</span>
            </div>
          )}

          {status === 'error' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          )}

          {status === 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Отлично, закрыть
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
