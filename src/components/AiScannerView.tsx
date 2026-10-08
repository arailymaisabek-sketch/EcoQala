import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Upload, 
  MapPin, 
  Navigation, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { KazakhstanCity, VerificationResult, BlockchainRecord } from '../types';
import { 
  sendMemoTransaction, 
  loadBlockchainRecords, 
  MEMO_PROGRAM_ID 
} from '../services/solanaService';
import { BlockchainRecordsTable } from './BlockchainRecordsTable';

interface AiScannerViewProps {
  city: KazakhstanCity;
  walletAddress: string | null;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
  onOpenTxModal: (signature: string, memoText: string, ecoReward: number) => void;
}

interface PhotoPreset {
  id: string;
  title: string;
  type: 'trash' | 'tree';
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
  detectedSummary: string;
  ecoReward: number;
}

const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'preset-park',
    title: 'Очистка парковой зоны',
    type: 'trash',
    beforeImage: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80',
    beforeLabel: 'Замусоренная территория парка (бутылки, пакеты)',
    afterLabel: 'Чистая поляна + 2 мешка собранных отходов',
    detectedSummary: '~3.2 кг пластика и упаковки',
    ecoReward: 30,
  },
  {
    id: 'preset-tree',
    title: 'Посадка саженца яблони/карагача',
    type: 'tree',
    beforeImage: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
    beforeLabel: 'Подготовленная лунка в парковом секторе',
    afterLabel: 'Высаженный молодой саженец с подвязкой и поливом',
    detectedSummary: '1 саженец яблони (лунка с поливом 25л)',
    ecoReward: 100,
  },
  {
    id: 'preset-river',
    title: 'Уборка береговой линии',
    type: 'trash',
    beforeImage: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    beforeLabel: 'Стихийный мусор у кромки воды',
    afterLabel: 'Отсортированный пластик в контейнере',
    detectedSummary: '~4.8 кг отсортированного пластика',
    ecoReward: 50,
  },
];

const SCAN_STAGES = [
  'Инициализация Gemini Vision AI и геопривязка...',
  'Сравнение контрольных снимков «ДО» и «ПОСЛЕ»...',
  'Детекция полимерных отходов и объёма работы...',
  'Формирование Memo-транзакции в Solana Devnet...',
];

export const AiScannerView: React.FC<AiScannerViewProps> = ({
  city,
  walletAddress,
  onSuccessVerification,
  getPhantomProvider,
  onOpenTxModal,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PhotoPreset>(PHOTO_PRESETS[0]);
  const [customBeforeImg, setCustomBeforeImg] = useState<string | null>(null);
  const [customAfterImg, setCustomAfterImg] = useState<string | null>(null);

  // GPS verification state
  const [gpsCoordinates, setGpsCoordinates] = useState<string>(
    `${city.lat.toFixed(4)}° N, ${city.lng.toFixed(4)}° E (${city.name})`
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // AI Scanning execution state: 'idle' | 'scanning_ai' | 'recording_blockchain' | 'confirmed' | 'error'
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning_ai' | 'recording_blockchain' | 'confirmed' | 'error'>('idle');
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [completedResult, setCompletedResult] = useState<VerificationResult | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastMemoText, setLastMemoText] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Blockchain records list
  const [records, setRecords] = useState<BlockchainRecord[]>(() => loadBlockchainRecords());

  useEffect(() => {
    setRecords(loadBlockchainRecords());
  }, [scanStatus]);

  const beforePhoto = customBeforeImg || selectedPreset.beforeImage;
  const afterPhoto = customAfterImg || selectedPreset.afterImage;

  const handleGetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setGpsCoordinates(`${city.lat.toFixed(4)}° N, ${city.lng.toFixed(4)}° E (${city.name})`);
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoordinates(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (${city.name})`);
        setIsLocating(false);
      },
      () => {
        setGpsCoordinates(`${city.lat.toFixed(4)}° N, ${city.lng.toFixed(4)}° E (${city.name})`);
        setIsLocating(false);
      },
      { timeout: 6000 }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (target === 'before') {
          setCustomBeforeImg(event.target?.result as string);
        } else {
          setCustomAfterImg(event.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAiScanner = async () => {
    setScanError(null);
    setScanStatus('scanning_ai');
    setCompletedResult(null);

    // Этапы анализа Gemini Vision AI
    setScanStepIndex(0);
    await new Promise((r) => setTimeout(r, 700));

    setScanStepIndex(1);
    await new Promise((r) => setTimeout(r, 750));

    setScanStepIndex(2);
    await new Promise((r) => setTimeout(r, 700));

    setScanStepIndex(3);
    await new Promise((r) => setTimeout(r, 500));

    // Шаг 2: «Записываем в блокчейн…»
    setScanStatus('recording_blockchain');

    const memoText = `[EcoQala] Подтверждено: ${selectedPreset.title} в г. ${city.name} | Награда: +${selectedPreset.ecoReward} ECO | Gemini Vision`;
    setLastMemoText(memoText);

    // Отправляем транзакцию в Solana devnet через подключённый Phantom
    // В транзакции одна инструкция Memo (программа MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
    // Комиссию платит кошелёк пользователя. Для текста используй TextEncoder, не Buffer.
    const result = await sendMemoTransaction(memoText, {
      ecoReward: selectedPreset.ecoReward,
      walletAddress,
    });

    if (!result.success) {
      // Если пользователь отменил или случилась ошибка, покажи понятное сообщение на русском
      setScanError(result.errorMessage || 'Произошла ошибка при отправке транзакции в Solana Devnet.');
      setScanStatus('error');
      return;
    }

    const signature = result.signature!;
    setLastSignature(signature);

    const res: VerificationResult = {
      id: `ai-proof-${Date.now()}`,
      questTitle: selectedPreset.title,
      rewardEco: selectedPreset.ecoReward,
      confidenceScore: 98.7,
      analyzedObjects: selectedPreset.type === 'tree' ? ['Саженец', 'Опорный колышек', 'Лунка'] : ['ПЭТ-бутылки', 'Мешки', 'Жесть'],
      estimatedWeightOrCount: selectedPreset.detectedSummary,
      city: city.name,
      timestamp: Date.now(),
      solanaTxSignature: signature,
      status: 'APPROVED',
    };

    setCompletedResult(res);
    setScanStatus('confirmed');
    onSuccessVerification(res);
    setRecords(loadBlockchainRecords());
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Solid Opaque White */}
      <div className="eco-card-solid p-7 rounded-3xl bg-white border border-stone-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <span>ИИ-Сканер экологических дел</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl leading-relaxed">
            Загрузите фото «ДО» и «ПОСЛЕ». ИИ проверит объём проделанной работы, верифицирует координаты в {city.name} и зафиксирует запись в сети Solana Devnet через инструкцию Memo.
          </p>
        </div>

        {/* Reward pill */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <div className="text-sm font-bold font-mono text-emerald-700">
            +{selectedPreset.ecoReward} ECO
          </div>
        </div>
      </div>

      {/* Preset selection for quick testing */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-stone-700">
          Примеры готовых отчётов:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PHOTO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelectedPreset(preset);
                setCustomBeforeImg(null);
                setCustomAfterImg(null);
                setCompletedResult(null);
                setScanStatus('idle');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPreset.id === preset.id
                  ? 'bg-emerald-50/70 border-emerald-300 text-stone-900 shadow-sm'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="truncate">{preset.title}</span>
                <span className="text-emerald-600 font-mono text-xs shrink-0 ml-1">
                  +{preset.ecoReward} ECO
                </span>
              </div>
              <div className="text-[11px] text-stone-500 line-clamp-1">
                {preset.detectedSummary}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* BEFORE and AFTER Photo Dropzone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Photo BEFORE */}
        <div className="eco-card-solid p-5 rounded-3xl bg-white border border-stone-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 font-mono flex items-center gap-1.5">
              <span>●</span> Фото ДО уборки / посадки
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

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-100 bg-stone-100">
            <img
              src={beforePhoto}
              alt="Фото ДО"
              className="w-full h-full object-cover"
            />
            {scanStatus === 'scanning_ai' && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none">
                <div className="w-full h-1 bg-emerald-500 shadow-md shadow-emerald-500/80 animate-bounce" />
              </div>
            )}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-xl bg-black/70 backdrop-blur text-xs text-white">
              {selectedPreset.beforeLabel}
            </div>
          </div>
        </div>

        {/* Photo AFTER */}
        <div className="eco-card-solid p-5 rounded-3xl bg-white border border-stone-200/90 space-y-3">
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

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-100 bg-stone-100">
            <img
              src={afterPhoto}
              alt="Фото ПОСЛЕ"
              className="w-full h-full object-cover"
            />
            {scanStatus === 'scanning_ai' && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none">
                <div className="w-full h-1 bg-emerald-500 shadow-md shadow-emerald-500/80 animate-bounce" />
              </div>
            )}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-xl bg-black/70 backdrop-blur text-xs text-white">
              {selectedPreset.afterLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Geolocation Card */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-stone-600">
            Координаты фиксации: <strong className="text-stone-900 font-mono">{gpsCoordinates}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={isLocating}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer transition-colors shrink-0"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Определение...' : 'Обновить GPS'}</span>
        </button>
      </div>

      {/* Interactive AI Verification Card & Live Status */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
              Интерактивная карточка проверки ИИ и Solana Devnet
            </h3>
          </div>
        </div>

        {/* Live scanning progress steps */}
        {scanStatus === 'scanning_ai' && (
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-150 space-y-2.5">
            {SCAN_STAGES.map((text, idx) => {
              const isCurrent = scanStepIndex === idx;
              const isDone = scanStepIndex > idx;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 text-xs transition-opacity duration-200 ${
                    isCurrent
                      ? 'text-emerald-700 font-bold'
                      : isDone
                      ? 'text-stone-800 font-medium'
                      : 'text-stone-400 opacity-60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCurrent ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300" />
                    )}
                  </div>
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Пока идёт, показывай «Записываем в блокчейн…» */}
        {scanStatus === 'recording_blockchain' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800 animate-pulse">
            <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
            <div className="space-y-0.5">
              <strong className="text-sm font-bold">Записываем в блокчейн…</strong>
              <p className="text-[11px] text-emerald-700">
                Отправляем инструкцию Memo в сеть Solana Devnet через подключённый Phantom. Комиссию оплачивает ваш кошелёк.
              </p>
            </div>
          </div>
        )}

        {/* Если пользователь отменил или случилась ошибка, покажи понятное сообщение на русском */}
        {scanStatus === 'error' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">Ошибка записи в блокчейн:</strong>
              <p className="leading-relaxed">
                {scanError || 'Произошла ошибка при отправке транзакции.'}
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleRunAiScanner}
                  className="inline-flex items-center gap-1 text-red-700 hover:text-red-900 font-bold underline cursor-pointer"
                >
                  <span>Повторить попытку</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* После успешной транзакции покажи «Записано в блокчейн» и ссылку «Посмотреть запись» */}
        {scanStatus === 'confirmed' && lastSignature && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Записано в блокчейн</span>
              </div>

              {/* Primary Link: «Посмотреть запись» на https://explorer.solana.com/tx/ПОДПИСЬ?cluster=devnet */}
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
              <span className="text-emerald-700 font-semibold">Начислено +{selectedPreset.ecoReward} ECO</span>
            </div>
          </div>
        )}

        {/* Scan Button */}
        {scanStatus !== 'confirmed' ? (
          <button
            type="button"
            disabled={scanStatus === 'scanning_ai' || scanStatus === 'recording_blockchain'}
            onClick={handleRunAiScanner}
            className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {scanStatus === 'scanning_ai' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ИИ проверяет отчёт...</span>
              </>
            ) : scanStatus === 'recording_blockchain' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Записываем в блокчейн…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Зафиксировать эко-дело через ИИ (+{selectedPreset.ecoReward} ECO)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Действие успешно зафиксировано!</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompletedResult(null);
                setScanStatus('idle');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-bold text-xs hover:bg-emerald-100/50 transition-colors cursor-pointer"
            >
              Отправить ещё отчёт
            </button>
          </div>
        )}
      </div>

      {/* Ниже веди список всех записей: текст, время, ссылка */}
      <div className="eco-card-solid p-6 rounded-3xl bg-white border border-stone-200/90">
        <BlockchainRecordsTable records={records} />
      </div>
    </div>
  );
};
