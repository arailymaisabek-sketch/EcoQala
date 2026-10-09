import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Upload, 
  MapPin, 
  Navigation, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Clock,
  HelpCircle,
  FileWarning,
  Trash2
} from 'lucide-react';
import { KazakhstanCity, VerificationResult, BlockchainRecord } from '../types';
import { 
  sendMemoTransaction, 
  loadBlockchainRecords, 
} from '../services/solanaService';
import { 
  validateImageFile, 
  fileToBase64, 
  requestPhotoVerification 
} from '../services/clientImageService';
import { VerifyImageResult } from '../services/imageVerificationService';
import { BlockchainRecordsTable } from './BlockchainRecordsTable';

interface AiScannerViewProps {
  city: KazakhstanCity;
  walletAddress: string | null;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
  onOpenTxModal: (signature: string, memoText: string, ecoReward: number) => void;
}

export const AiScannerView: React.FC<AiScannerViewProps> = ({
  city,
  walletAddress,
  onSuccessVerification,
  getPhantomProvider,
  onOpenTxModal,
}) => {
  // Selected Eco Task category
  const [selectedCategory, setSelectedCategory] = useState<'trash' | 'trees' | 'patrol'>('trash');
  const [taskTitle, setTaskTitle] = useState<string>('Қалалық саябақты қоқыстан тазарту');
  const [taskReward, setTaskReward] = useState<number>(50);

  // Real Uploaded Photo State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileValidationErr, setFileValidationErr] = useState<string | null>(null);

  // GPS coordinates state
  const [gpsCoordinates, setGpsCoordinates] = useState<string>(
    `${city.lat.toFixed(4)}° N, ${city.lng.toFixed(4)}° E (${city.name})`
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Scanner statuses:
  // 'idle' | 'checking_ai' | 'ai_rejected' | 'ai_needs_review' | 'recording_blockchain' | 'confirmed' | 'error'
  const [scanStatus, setScanStatus] = useState<
    'idle' | 'checking_ai' | 'ai_rejected' | 'ai_needs_review' | 'recording_blockchain' | 'confirmed' | 'error'
  >('idle');

  const [aiResult, setAiResult] = useState<VerifyImageResult | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastMemoText, setLastMemoText] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Blockchain records list
  const [records, setRecords] = useState<BlockchainRecord[]>(() => loadBlockchainRecords());

  useEffect(() => {
    setRecords(loadBlockchainRecords());
  }, [scanStatus]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationErr(null);
    setAiResult(null);

    const file = e.target.files?.[0];
    if (!file) {
      setUploadedFile(null);
      setPreviewUrl(null);
      return;
    }

    const check = await validateImageFile(file);
    if (!check.isValid) {
      setFileValidationErr(check.errorMessageKz || 'Файл форматы немесе өлшемі жарамсыз.');
      setUploadedFile(null);
      setPreviewUrl(null);
      return;
    }

    setUploadedFile(file);
    const dataUrl = await fileToBase64(file);
    setPreviewUrl(dataUrl);
  };

  const handleClearPhoto = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setFileValidationErr(null);
    setAiResult(null);
  };

  const handleCategorySelect = (cat: 'trash' | 'trees' | 'patrol', title: string, reward: number) => {
    setSelectedCategory(cat);
    setTaskTitle(title);
    setTaskReward(reward);
    setScanStatus('idle');
  };

  // Direct transaction without AI verification
  const handleDirectTransactionWithoutAi = async () => {
    setScanError(null);
    setFileValidationErr(null);
    setScanStatus('recording_blockchain');

    try {
      const memoText = `[EcoQala] Расталды: ${taskTitle} (${city.name}) | Сыйақы: +${taskReward} ECO | Транзакция: ИИ-сіз тікелей расталды`;
      setLastMemoText(memoText);

      const txResult = await sendMemoTransaction(memoText, {
        ecoReward: taskReward,
        walletAddress,
      });

      if (!txResult.success) {
        setScanError(txResult.errorMessage || 'Solana Devnet желісіне жазу барысында қате шықты.');
        setScanStatus('error');
        return;
      }

      const signature = txResult.signature!;
      setLastSignature(signature);

      const res: VerificationResult = {
        id: `ai-proof-${Date.now()}`,
        questTitle: taskTitle,
        rewardEco: taskReward,
        confidenceScore: 100,
        analyzedObjects: ['Экологиялық тапсырма', 'Тікелей транзакция'],
        estimatedWeightOrCount: `${taskReward} ECO қосылды`,
        city: city.name,
        timestamp: Date.now(),
        solanaTxSignature: signature,
        status: 'APPROVED',
        statusLabelKz: 'Транзакция расталды (ИИ-сіз)',
        reasonKz: 'Транзакция Solana Devnet желісіне ИИ-сіз тікелей сәтті жазылды.',
      };

      setScanStatus('confirmed');
      onSuccessVerification(res);
      setRecords(loadBlockchainRecords());
    } catch (err: any) {
      console.error('Direct scan error:', err);
      setScanError('Транзакцияны блокчейнге жіберу кезінде қате шықты.');
      setScanStatus('error');
    }
  };

  const handleRunAiScanner = async () => {
    setScanError(null);
    setFileValidationErr(null);

    // Rule 1: Фотосуретті жүктеу міндетті
    if (!uploadedFile || !previewUrl) {
      setFileValidationErr('Алдымен фотосуретті жүктеңіз');
      return;
    }

    // Indicator: «Фото тексерілуде...»
    setScanStatus('checking_ai');

    try {
      // Netlify Functions / API verify
      const verification = await requestPhotoVerification({
        taskTitle,
        category: selectedCategory,
        cityName: city.name,
        imageB64: previewUrl,
        mimeType: uploadedFile.type,
      });

      setAiResult(verification);

      if (verification.status === 'REJECTED') {
        setScanStatus('ai_rejected');
        return;
      }

      if (verification.status === 'NEEDS_REVIEW') {
        setScanStatus('ai_needs_review');
        return;
      }

      if (verification.status === 'NO_PHOTO') {
        setFileValidationErr('Алдымен фотосуретті жүктеңіз');
        setScanStatus('idle');
        return;
      }

      // If approved («Фото тексеруден өтті»), write to Solana devnet
      setScanStatus('recording_blockchain');

      const memoText = `[EcoQala] Расталды: ${taskTitle} (${city.name}) | Сыйақы: +${taskReward} ECO | Фото тексеруден өтті`;
      setLastMemoText(memoText);

      const txResult = await sendMemoTransaction(memoText, {
        ecoReward: taskReward,
        walletAddress,
      });

      if (!txResult.success) {
        setScanError(txResult.errorMessage || 'Solana Devnet желісіне жазу барысында қате шықты.');
        setScanStatus('error');
        return;
      }

      const signature = txResult.signature!;
      setLastSignature(signature);

      const res: VerificationResult = {
        id: `ai-proof-${Date.now()}`,
        questTitle: taskTitle,
        rewardEco: taskReward,
        confidenceScore: verification.confidenceScore,
        analyzedObjects: verification.detectedObjects,
        estimatedWeightOrCount: verification.metricsSummary,
        city: city.name,
        timestamp: Date.now(),
        solanaTxSignature: signature,
        status: 'APPROVED',
        statusLabelKz: 'Фото тексеруден өтті',
        reasonKz: verification.reasonKz,
      };

      setScanStatus('confirmed');
      onSuccessVerification(res);
      setRecords(loadBlockchainRecords());
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError('Тексеру кезінде күтпеген қате шықты.');
      setScanStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="eco-card-solid p-6 sm:p-7 rounded-3xl bg-white border border-stone-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <span>AI Фото-тексеру және сараптама жүйесі</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl leading-relaxed">
            Нақты экологиялық іс-әрекеттің суретін жүктеңіз. Netlify серверлік AI функциясы оның тапсырмаға сәйкестігін тексеріп, Solana Devnet желісіне жазады.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <div className="text-sm font-bold font-mono text-emerald-700">
            +{taskReward} ECO
          </div>
        </div>
      </div>

      {/* Task Selection */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-stone-700">
          Орындалған экологиялық тапсырма түрі:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'trash',
              title: 'Қалалық саябақты қоқыстан тазарту',
              reward: 50,
              desc: 'Қоқыс жиналған қаптар, сұрыпталған пластик немесе таза аумақ',
            },
            {
              id: 'trees',
              title: 'Жас ағаш немесе көшет отырғызу',
              reward: 100,
              desc: 'Отырғызылған жас көшет, қазылған шұңқыр, су құйылған белгілері',
            },
            {
              id: 'patrol',
              title: 'Өзен немесе жағалау бойын тазарту',
              reward: 60,
              desc: 'Су жиегінен жиналған қалдықтар, қайталама шикізат контейнері',
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCategorySelect(item.id as any, item.title, item.reward)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedCategory === item.id
                  ? 'bg-emerald-50/70 border-emerald-300 text-stone-900 shadow-sm'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="truncate">{item.title}</span>
                <span className="text-emerald-600 font-mono text-xs shrink-0 ml-1">
                  +{item.reward} ECO
                </span>
              </div>
              <div className="text-[11px] text-stone-500 line-clamp-2">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Photo Upload & Preview Card */}
      <div className="eco-card-solid p-5 sm:p-6 rounded-3xl bg-white border border-stone-200/90 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 font-mono flex items-center gap-1.5">
            <span>●</span> Фотосуретті жүктеу (міндетті)
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            JPG, JPEG, PNG, WEBP (макс. 10 МБ)
          </span>
        </div>

        {fileValidationErr && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{fileValidationErr}</span>
          </div>
        )}

        {!previewUrl ? (
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-emerald-300 flex items-center justify-center text-stone-500 group-hover:text-emerald-600 transition-colors shadow-2xs mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700">
              Тапсырманың фотосуретін таңдаңыз
            </span>
            <span className="text-[11px] text-stone-500 mt-1">
              Селфи, мем немесе кездейсоқ суреттер тексеруден өтпейді
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs max-h-96">
              <img
                src={previewUrl}
                alt="Жүктелген сурет"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer backdrop-blur shadow-sm"
                  title="Фотоны өшіру"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/70 backdrop-blur text-white text-xs flex items-center justify-between">
                <span className="truncate">{uploadedFile?.name}</span>
                <span className="text-[11px] text-emerald-300 shrink-0 font-mono">
                  {(uploadedFile?.size ? (uploadedFile.size / 1024 / 1024).toFixed(2) : '0')} МБ
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Geolocation bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-stone-150">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-stone-600">
              Фиксация орны: <strong className="text-stone-900 font-mono">{gpsCoordinates}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer transition-colors shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Анықталуда...' : 'GPS жаңарту'}</span>
          </button>
        </div>
      </div>

      {/* AI Verification Results & Status Block */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-sm space-y-4">
        {/* CHECKING AI */}
        {scanStatus === 'checking_ai' && (
          <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-base font-bold text-stone-900">
              Фото тексерілуде...
            </div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Gemini Vision AI сурет мазмұнын талдап, экологиялық тапсырмаға сәйкестігін тексеруде.
            </p>
          </div>
        )}

        {/* REJECTED */}
        {scanStatus === 'ai_rejected' && (
          <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3 text-xs text-red-900">
            <div className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-red-600 shrink-0" />
              <strong className="text-sm font-bold">Фото сәйкес келмейді</strong>
            </div>
            <p className="leading-relaxed">
              <strong>Себебі: </strong>
              {aiResult?.reasonKz || 'Фотосурет экологиялық тапсырма талаптарына сай емес.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDirectTransactionWithoutAi}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ИИ-сіз транзакция жасау (+{taskReward} ECO)</span>
              </button>
              <button
                type="button"
                onClick={handleClearPhoto}
                className="px-4 py-2 rounded-xl bg-stone-200 text-stone-800 font-bold hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Басқа фотосурет жүктеу
              </button>
            </div>
          </div>
        )}

        {/* NEEDS REVIEW */}
        {scanStatus === 'ai_needs_review' && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <strong className="text-sm font-bold">Қосымша тексеру қажет</strong>
            </div>
            <p className="leading-relaxed">
              <strong>Түсіндірме: </strong>
              {aiResult?.reasonKz || 'Бір фотосурет бойынша тапсырманың толық орындалғанына сенімділік жеткіліксіз.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDirectTransactionWithoutAi}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ИИ-сіз транзакция жасау (+{taskReward} ECO)</span>
              </button>
              <button
                type="button"
                onClick={handleClearPhoto}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Анығырақ фотосурет жүктеу
              </button>
            </div>
          </div>
        )}

        {/* RECORDING ON-CHAIN */}
        {scanStatus === 'recording_blockchain' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800 animate-pulse">
            <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
            <div className="space-y-0.5">
              <strong className="text-sm font-bold">Записываем в блокчейн…</strong>
              <p className="text-[11px] text-emerald-700">
                Solana Devnet желісіне транзакция жіберілуде...
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {scanStatus === 'error' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <strong className="font-bold">Қате орын алды:</strong>
              <p>{scanError || 'Транзакция жіберу барысында қате шықты.'}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ИИ-сіз транзакция жасау (+{taskReward} ECO)</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunAiScanner}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Қайталау
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMED */}
        {scanStatus === 'confirmed' && lastSignature && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Транзакция расталды · Записано в блокчейн</span>
              </div>
              <a
                href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-2xs"
              >
                <span>Посмотреть запись</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-100 font-mono text-[11px] text-stone-800 break-words">
              {lastMemoText}
            </div>
          </div>
        )}

        {/* Action Button */}
        {scanStatus !== 'confirmed' ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              disabled={scanStatus === 'checking_ai' || scanStatus === 'recording_blockchain'}
              onClick={handleDirectTransactionWithoutAi}
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {scanStatus === 'recording_blockchain' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Записываем в блокчейн…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ИИ-сіз транзакция жасау (+{taskReward} ECO)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {uploadedFile && (
              <button
                type="button"
                disabled={scanStatus === 'checking_ai' || scanStatus === 'recording_blockchain'}
                onClick={handleRunAiScanner}
                className="py-4 px-5 rounded-2xl font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                {scanStatus === 'checking_ai' ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-emerald-600 rounded-full animate-spin" />
                    <span>Фото тексерілуде...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <span>AI тексерумен</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs">
            <span className="text-emerald-800 font-semibold">Жұмыс сәтті қабылданды және блокчейнге жазылды!</span>
            <button
              type="button"
              onClick={() => {
                handleClearPhoto();
                setScanStatus('idle');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100/50 transition-colors cursor-pointer"
            >
              Жаңа фото жүктеу
            </button>
          </div>
        )}
      </div>

      {/* Blockchain Records List */}
      <div className="eco-card-solid p-6 rounded-3xl bg-white border border-stone-200/90">
        <BlockchainRecordsTable records={records} />
      </div>
    </div>
  );
};
