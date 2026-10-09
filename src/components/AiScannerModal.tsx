import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Bot, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Clock,
  HelpCircle,
  FileWarning,
  Eye,
  Trash2
} from 'lucide-react';
import { KazakhstanCity, VerificationResult, EcoQuest, BlockchainRecord } from '../types';
import { 
  sendMemoTransaction, 
  loadBlockchainRecords, 
} from '../services/solanaService';
import { 
  validateImageFile, 
  fileToBase64, 
  requestPhotoVerification 
} from '../services/clientImageService';
import { EcoVerificationStatus, VerifyImageResult } from '../services/imageVerificationService';

interface AiScannerModalProps {
  city: KazakhstanCity;
  quest?: EcoQuest | null;
  walletAddress: string | null;
  onClose: () => void;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
  onOpenTxModal?: (signature: string, memoText: string, ecoReward: number) => void;
}

export const AiScannerModal: React.FC<AiScannerModalProps> = ({
  city,
  quest,
  walletAddress,
  onClose,
  onSuccessVerification,
  getPhantomProvider,
  onOpenTxModal,
}) => {
  // Uploaded photo state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileValidationErr, setFileValidationErr] = useState<string | null>(null);

  // Status check states:
  // 'idle' | 'checking_ai' | 'ai_rejected' | 'ai_needs_review' | 'recording_blockchain' | 'confirmed' | 'error'
  const [status, setStatus] = useState<
    'idle' | 'checking_ai' | 'ai_rejected' | 'ai_needs_review' | 'recording_blockchain' | 'confirmed' | 'error'
  >('idle');

  const [aiResult, setAiResult] = useState<VerifyImageResult | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<VerificationResult | null>(null);
  const [blockchainSignature, setBlockchainSignature] = useState<string>('');
  const [blockchainMemoText, setBlockchainMemoText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // List of all blockchain records
  const [allRecords, setAllRecords] = useState<BlockchainRecord[]>([]);

  useEffect(() => {
    setAllRecords(loadBlockchainRecords());
  }, []);

  const rewardAmount = quest ? quest.rewardEco : 50;
  const taskTitle = quest ? quest.title : 'Қалалық сенбілік және қоқыс жинау';
  const taskCategory = quest ? quest.category : 'trash';

  // Handle image file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationErr(null);
    setAiResult(null);

    const file = e.target.files?.[0];
    if (!file) {
      setUploadedFile(null);
      setPreviewUrl(null);
      return;
    }

    // 1. Client-side file validation (JPG, JPEG, PNG, WEBP, max 10MB, real image header)
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

  // Submit and verify photo with Gemini AI + Record on Solana Devnet
  const handleStartVerification = async () => {
    setErrorMessage(null);
    setFileValidationErr(null);

    // Rule 1: Фотосуретті жүктеу міндетті
    if (!uploadedFile || !previewUrl) {
      setFileValidationErr('Алдымен фотосуретті жүктеңіз');
      return;
    }

    // Indicator: «Фото тексерілуде...»
    setStatus('checking_ai');

    try {
      // Rule 3: AI-тексеру (Netlify Functions / API)
      const verification = await requestPhotoVerification({
        taskTitle,
        category: taskCategory,
        cityName: city.name,
        imageB64: previewUrl,
        mimeType: uploadedFile.type,
      });

      setAiResult(verification);

      // Rule 4: Нәтиже мәртебелері
      if (verification.status === 'REJECTED') {
        setStatus('ai_rejected');
        return;
      }

      if (verification.status === 'NEEDS_REVIEW') {
        setStatus('ai_needs_review');
        return;
      }

      if (verification.status === 'NO_PHOTO') {
        setFileValidationErr('Алдымен фотосуретті жүктеңіз');
        setStatus('idle');
        return;
      }

      // If approved («Фото тексеруден өтті»), write to Solana devnet
      setStatus('recording_blockchain');

      const memoText = `[EcoQala] Тапсырма: ${taskTitle} (${city.name}) | Сыйақы: +${rewardAmount} ECO | Тексеру: Фото тексеруден өтті`;
      setBlockchainMemoText(memoText);

      const txResult = await sendMemoTransaction(memoText, {
        ecoReward: rewardAmount,
        walletAddress,
      });

      if (!txResult.success) {
        setErrorMessage(txResult.errorMessage || 'Solana Devnet желісіне жазу барысында қате шықты.');
        setStatus('error');
        return;
      }

      const sig = txResult.signature!;
      setBlockchainSignature(sig);

      // Reload updated blockchain records
      const updatedRecords = loadBlockchainRecords();
      setAllRecords(updatedRecords);

      const res: VerificationResult = {
        id: `proof-${Date.now()}`,
        questTitle: taskTitle,
        rewardEco: rewardAmount,
        confidenceScore: verification.confidenceScore,
        analyzedObjects: verification.detectedObjects,
        estimatedWeightOrCount: verification.metricsSummary,
        city: city.name,
        timestamp: Date.now(),
        solanaTxSignature: sig,
        status: 'APPROVED',
        statusLabelKz: 'Фото тексеруден өтті',
        reasonKz: verification.reasonKz,
      };

      setVerifiedResult(res);
      setStatus('confirmed');
      onSuccessVerification(res);
    } catch (err: any) {
      console.error('Verification flow error:', err);
      setErrorMessage('Фотосуретті тексеруде техникалық ақау шықты. Қайталап көріңіз.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:px-7 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                AI Фото-тексеру және EcoQala есебі
              </h2>
              <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{city.name} · Netlify AI + Solana Devnet Memo</span>
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
        <div className="p-4 sm:p-7 overflow-y-auto space-y-5 flex-1">
          {/* Task Info */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-150 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-stone-900">
                {taskTitle}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                Орындалған жұмыстың нақты фотосуретін жүктеңіз
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100">
                +{rewardAmount} ECO
              </span>
            </div>
          </div>

          {/* Error / Validation Banner */}
          {fileValidationErr && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">{fileValidationErr}</span>
            </div>
          )}

          {/* IDLE state: Upload and Preview */}
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                  <span>Тапсырманың фотосуреті (міндетті):</span>
                  <span className="text-[11px] font-normal text-stone-500">
                    JPG, JPEG, PNG, WEBP · 10 МБ дейін
                  </span>
                </label>

                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-3xl bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-emerald-300 flex items-center justify-center text-stone-500 group-hover:text-emerald-600 transition-colors shadow-2xs mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700">
                      Фотосуретті таңдаңыз немесе осында сүйреңіз
                    </span>
                    <span className="text-[11px] text-stone-500 mt-1">
                      Селфи немесе кездейсоқ суреттер тексеруден өтпейді
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-video shadow-xs group">
                    <img
                      src={previewUrl}
                      alt="Жүктелген сурет"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer backdrop-blur shadow-sm"
                        title="Фотоны өшіру"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/65 backdrop-blur text-white text-xs flex items-center justify-between">
                      <span className="truncate">{uploadedFile?.name}</span>
                      <span className="text-[11px] text-emerald-300 shrink-0 font-mono ml-2">
                        {(uploadedFile?.size ? (uploadedFile.size / 1024 / 1024).toFixed(2) : '0')} МБ
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirements Note */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-150 text-[11px] text-stone-600 space-y-1">
                <div className="font-bold text-stone-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI фото-тексеру ережелері:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-stone-500 pl-1">
                  <li>Фотосуретте нақты экологиялық іс-қимыл (жинау, сұрыптау, көшет) көрінуі тиіс.</li>
                  <li>Селфи, мем, скриншот және интернеттен алынған суреттер қабылданбайды.</li>
                  <li>Тек қоқыс бар жерді түсіру жеткіліксіз — тазалау нәтижесі қажет.</li>
                </ul>
              </div>
            </div>
          )}

          {/* CHECKING AI state: «Фото тексерілуде...» */}
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
                  Фото тексерілуде...
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Netlify және Gemini Vision AI фотосурет мазмұнын талдап, экологиялық тапсырмаға сәйкестігін тексеруде.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>AI-инспекция жүріп жатыр</span>
              </div>
            </motion.div>
          )}

          {/* REJECTED: «Фото сәйкес келмейді» */}
          {status === 'ai_rejected' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
                <FileWarning className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-200">
                  Фото сәйкес келмейді
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Өтінім қабылданбады
                </h3>
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-xs text-red-800 max-w-md mx-auto text-left leading-relaxed">
                  <strong>Себебі: </strong>
                  {aiResult?.reasonKz || 'Фотосурет экологиялық тапсырма талаптарына сәйкес келмейді.'}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClearPhoto();
                    setStatus('idle');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Басқа фотосурет жүктеу
                </button>
              </div>
            </motion.div>
          )}

          {/* NEEDS REVIEW: «Қосымша тексеру қажет» */}
          {status === 'ai_needs_review' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                <HelpCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200">
                  Қосымша тексеру қажет
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Дәлелдер жеткіліксіз
                </h3>
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 max-w-md mx-auto text-left leading-relaxed">
                  <strong>Нәтиже түсіндірмесі: </strong>
                  {aiResult?.reasonKz || 'Бір фотосурет бойынша тапсырманың орындалғанын 100% растау мүмкін емес. Модератор қарауы қажет.'}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClearPhoto();
                    setStatus('idle');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Анығырақ фотосурет жүктеу
                </button>
              </div>
            </motion.div>
          )}

          {/* RECORDING ON-CHAIN: «Записываем в блокчейн…» */}
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
                  Фото тексеруден өтті! Транзакция Solana Devnet желісіне Phantom әмияны арқылы жіберілуде.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 max-w-md mx-auto text-left text-xs space-y-1">
                <div className="text-[11px] text-stone-400 font-mono">Жазылатын мәтін:</div>
                <div className="p-2 rounded-xl bg-white border border-stone-200 font-mono text-[11px] text-stone-800 break-words">
                  {blockchainMemoText}
                </div>
              </div>
            </motion.div>
          )}

          {/* ERROR: «Не удалось записать в блокчейн» */}
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
                  Қате орын алды
                </h3>
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 max-w-md mx-auto text-xs text-red-800 font-medium leading-relaxed">
                  {errorMessage || 'Транзакция жіберу кезінде қате шықты.'}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartVerification}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Қайталау</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Артқа қайту
                </button>
              </div>
            </motion.div>
          )}

          {/* CONFIRMED: «Фото тексеруден өтті» + «Записано в блокчейн» + explorer link + all records */}
          {status === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  Фото тексеруден өтті
                </div>
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Записано в блокчейн
                </h3>
                <p className="text-xs text-stone-500">
                  Эко-әрекет расталды! Награда: +{rewardAmount} ECO
                </p>
              </div>

              {/* Reward & Link */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Берілген эко-бонус:</span>
                  <span className="text-base font-mono font-bold text-emerald-700">
                    +{rewardAmount} ECO
                  </span>
                </div>

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

              {/* Blockchain records list */}
              <div className="space-y-2.5 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
                    Барлық жазбалар тізімі ({allRecords.length})
                  </h4>
                  <span className="text-[11px] text-stone-400">мәтін, уақыт, сілтеме</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {allRecords.map((item) => (
                    <div
                      key={item.id || item.signature}
                      className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5"
                    >
                      <div className="text-stone-800 font-mono text-[11px] break-words bg-white/70 p-2 rounded-xl border border-stone-200/60">
                        {item.text}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Уақыты: <strong>{item.formattedTime}</strong></span>
                        </div>
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
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-7 border-t border-stone-100 bg-[#F8FAF9]/80 flex items-center justify-between gap-3">
          {status === 'idle' && (
            <button
              type="button"
              disabled={!uploadedFile}
              onClick={handleStartVerification}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                uploadedFile
                  ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{uploadedFile ? 'AI тексеруге жіберу' : 'Алдымен фотосуретті жүктеңіз'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {status === 'checking_ai' && (
            <div className="w-full py-3 px-6 rounded-2xl bg-stone-100 text-stone-600 font-semibold text-xs flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 border-t-emerald-600 animate-spin" />
              <span>Фото тексерілуде...</span>
            </div>
          )}

          {status === 'recording_blockchain' && (
            <div className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm animate-pulse">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Записываем в блокчейн…</span>
            </div>
          )}

          {(status === 'ai_rejected' || status === 'ai_needs_review' || status === 'error') && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Жабу
            </button>
          )}

          {status === 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Жабу
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
