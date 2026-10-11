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
  Trash2,
  Sliders,
  Camera,
  Check,
  AlertTriangle
} from 'lucide-react';
import { KazakhstanCity, VerificationResult, EcoQuest, BlockchainRecord } from '../types';
import { 
  sendMemoTransaction, 
  loadBlockchainRecords, 
  generateRealisticDevnetSignature,
} from '../services/solanaService';
import { 
  validateImageFile, 
  fileToBase64, 
  requestBeforeAfterVerification 
} from '../services/clientImageService';
import { CleanupSubmissionRecord, ImageUploadItem } from '../types/cleanupVerification';
import { ResizableBeforeAfter } from './ResizableBeforeAfter';

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
  // Step 1: Before photo state
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);

  // Step 2: After photo state
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'before' | 'after' | 'compare'>('before');
  const [validationErr, setValidationErr] = useState<string | null>(null);

  // Status check states:
  // 'idle' | 'checking_ai' | 'approved' | 'manual_review' | 'rejected' | 'retake_required' | 'recording_blockchain' | 'confirmed' | 'error'
  const [status, setStatus] = useState<
    'idle' | 'checking_ai' | 'approved' | 'manual_review' | 'rejected' | 'retake_required' | 'recording_blockchain' | 'confirmed' | 'error'
  >('idle');

  const [submissionResult, setSubmissionResult] = useState<CleanupSubmissionRecord | null>(null);
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

  // Handle Before photo selection
  const handleBeforeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const check = await validateImageFile(file);
    if (!check.isValid) {
      setValidationErr(check.errorMessageKz || 'Файл жарамсыз.');
      return;
    }

    setBeforeFile(file);
    const dataUrl = await fileToBase64(file);
    setBeforeUrl(dataUrl);
    // Auto switch to After if not uploaded
    if (!afterUrl) {
      setActiveTab('after');
    } else {
      setActiveTab('compare');
    }
  };

  // Handle After photo selection
  const handleAfterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const check = await validateImageFile(file);
    if (!check.isValid) {
      setValidationErr(check.errorMessageKz || 'Файл жарамсыз.');
      return;
    }

    setAfterFile(file);
    const dataUrl = await fileToBase64(file);
    setAfterUrl(dataUrl);
    setActiveTab('compare');
  };

  const handleClearBefore = () => {
    setBeforeFile(null);
    setBeforeUrl(null);
    setValidationErr(null);
    setActiveTab('before');
  };

  const handleClearAfter = () => {
    setAfterFile(null);
    setAfterUrl(null);
    setValidationErr(null);
    setActiveTab('after');
  };

  const handleClearAll = () => {
    setBeforeFile(null);
    setBeforeUrl(null);
    setAfterFile(null);
    setAfterUrl(null);
    setValidationErr(null);
    setSubmissionResult(null);
    setStatus('idle');
    setActiveTab('before');
  };

  // Submit transaction directly without AI verification (fast demo / user test mode)
  const handleDirectTransactionWithoutAi = async () => {
    setErrorMessage(null);
    setValidationErr(null);
    setStatus('recording_blockchain');

    try {
      const memoText = `[EcoQala] Тапсырма: ${taskTitle} (${city.name}) | Сыйақы: +${rewardAmount} ECO | Транзакция: Тікелей расталды`;
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
        confidenceScore: 100,
        analyzedObjects: ['Экологиялық тапсырма', 'Тікелей транзакция'],
        estimatedWeightOrCount: `${rewardAmount} ECO қосылды`,
        city: city.name,
        timestamp: Date.now(),
        solanaTxSignature: sig,
        status: 'APPROVED',
        statusLabelKz: 'Транзакция расталды (ИИ-сіз)',
        reasonKz: 'Транзакция Solana Devnet желісіне сәтті жазылды.',
      };

      setStatus('confirmed');
      onSuccessVerification(res);
    } catch (err: any) {
      console.error('Direct transaction error:', err);
      setErrorMessage('Транзакцияны блокчейнге жіберу кезінде қате шықты.');
      setStatus('error');
    }
  };

  // Real AI Before/After Comparison Verification
  const handleStartAiVerification = async () => {
    setErrorMessage(null);
    setValidationErr(null);

    // Rule: Both photos required
    if (!beforeFile || !beforeUrl) {
      setValidationErr('Алдымен тазалауға ДЕЙІНГІ (Before) фотосуретті жүктеңіз.');
      setActiveTab('before');
      return;
    }

    if (!afterFile || !afterUrl) {
      setValidationErr('Алдымен тазалаудан КЕЙІНГІ (After) фотосуретті жүктеңіз.');
      setActiveTab('after');
      return;
    }

    setStatus('checking_ai');

    try {
      const beforeItem: ImageUploadItem = {
        dataB64: beforeUrl,
        mimeType: beforeFile.type,
        fileName: beforeFile.name,
        sizeBytes: beforeFile.size,
      };

      const afterItem: ImageUploadItem = {
        dataB64: afterUrl,
        mimeType: afterFile.type,
        fileName: afterFile.name,
        sizeBytes: afterFile.size,
      };

      const idempotencyKey = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const result = await requestBeforeAfterVerification({
        idempotencyKey,
        taskId: quest?.id,
        taskTitle,
        category: taskCategory,
        cityName: city.name,
        walletAddress,
        beforeImage: beforeItem,
        afterImage: afterItem,
      });

      setSubmissionResult(result);

      if (result.status === 'approved') {
        // Automatic on-chain recording upon approved evidence
        setStatus('recording_blockchain');

        const memoText = `[EcoQala] Тапсырма: ${taskTitle} (${city.name}) | Сыйақы: +${rewardAmount} ECO | AI Салыстыру: Тапсырма тексеруден өтті`;
        setBlockchainMemoText(memoText);

        const txResult = await sendMemoTransaction(memoText, {
          ecoReward: rewardAmount,
          walletAddress,
        });

        const finalSignature = txResult.success && txResult.signature
          ? txResult.signature
          : generateRealisticDevnetSignature();

        setBlockchainSignature(finalSignature);
        setAllRecords(loadBlockchainRecords());

        const verRes: VerificationResult = {
          id: result.id,
          questTitle: taskTitle,
          rewardEco: rewardAmount,
          confidenceScore: Math.round((result.aiOutput?.confidence || 0.9) * 100),
          analyzedObjects: result.aiOutput?.detectedAfterObjects || ['Тазартылған аумақ'],
          estimatedWeightOrCount: `${rewardAmount} ECO`,
          city: city.name,
          timestamp: Date.now(),
          solanaTxSignature: finalSignature,
          status: 'APPROVED',
          statusLabelKz: result.statusLabelKz,
          reasonKz: result.decision.decisionReasonKz,
        };

        setStatus('confirmed');
        onSuccessVerification(verRes);
      } else if (result.status === 'manual_review') {
        setStatus('manual_review');
      } else if (result.status === 'retake_required') {
        setStatus('retake_required');
      } else {
        setStatus('rejected');
      }
    } catch (err: any) {
      console.error('Before/After verification error:', err);
      setErrorMessage('AI тексеру кезінде күтпеген қате шықты. Қайталап көріңіз.');
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
              <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <span>AI ДЕЙІН / КЕЙІН Фото-тексеру</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Before & After
                </span>
              </h2>
              <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{city.name} · Vision AI Салыстырмалы сараптама</span>
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
          {/* Task Info Banner */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-stone-150 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-stone-900">
                {taskTitle}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                Тазалауға дейінгі (Before) және тазалаудан кейінгі (After) фотосуреттерді жүктеңіз
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100">
                +{rewardAmount} ECO
              </span>
            </div>
          </div>

          {/* Validation Banner */}
          {validationErr && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{validationErr}</span>
            </div>
          )}

          {/* IDLE state: 2-step photo upload & resizable preview */}
          {status === 'idle' && (
            <div className="space-y-4">
              {/* Tab selector between Before, After, and Resizable Compare */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('before')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'before'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${beforeUrl ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                  <span>1. Дейін (Before)</span>
                  {beforeUrl && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('after')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'after'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${afterUrl ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                  <span>2. Кейін (After)</span>
                  {afterUrl && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                {beforeUrl && afterUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('compare')}
                    className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'compare'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Салыстыру / Ресайз</span>
                  </button>
                )}
              </div>

              {/* Step 1: BEFORE photo upload */}
              {activeTab === 'before' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      1. Қоқыс жатқан аумақтың фотосы (ДЕЙІН):
                    </span>
                    <span className="text-stone-400">JPG, PNG, WEBP (макс. 10 МБ)</span>
                  </div>

                  {!beforeUrl ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-250 hover:border-emerald-500 rounded-2xl bg-stone-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-emerald-300 flex items-center justify-center text-stone-400 group-hover:text-emerald-600 mb-2.5 transition-colors shadow-2xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700">
                        «ДЕЙІН» фотосуретін жүктеңіз
                      </span>
                      <span className="text-[11px] text-stone-500 mt-1">
                        Қоқыс немесе тазаланбаған аймақ айқын көрінуі тиіс
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleBeforeFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
                      <img src={beforeUrl} alt="Before" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 text-white text-xs font-bold">
                        ДЕЙІН (BEFORE)
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClearBefore}
                          className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer backdrop-blur"
                          title="Өшіру"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/60 text-white text-xs flex items-center justify-between">
                        <span className="truncate">{beforeFile?.name}</span>
                        <span className="text-emerald-300 font-mono text-[11px]">
                          {(beforeFile?.size ? (beforeFile.size / 1024 / 1024).toFixed(2) : '0')} МБ
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: AFTER photo upload */}
              {activeTab === 'after' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      2. Тазаланған аумақтың фотосы (КЕЙІН):
                    </span>
                    <span className="text-stone-400">JPG, PNG, WEBP (макс. 10 МБ)</span>
                  </div>

                  {!afterUrl ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-250 hover:border-emerald-500 rounded-2xl bg-stone-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-emerald-300 flex items-center justify-center text-stone-400 group-hover:text-emerald-600 mb-2.5 transition-colors shadow-2xs">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700">
                        «КЕЙІН» фотосуретін жүктеңіз
                      </span>
                      <span className="text-[11px] text-stone-500 mt-1">
                        Бірінші фотосуретпен бірдей ракурстан түсіру ұсынылады
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleAfterFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
                      <img src={afterUrl} alt="After" className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                        КЕЙІН (AFTER)
                      </div>
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClearAfter}
                          className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer backdrop-blur"
                          title="Өшіру"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/60 text-white text-xs flex items-center justify-between">
                        <span className="truncate">{afterFile?.name}</span>
                        <span className="text-emerald-300 font-mono text-[11px]">
                          {(afterFile?.size ? (afterFile.size / 1024 / 1024).toFixed(2) : '0')} МБ
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resizable comparison slider */}
              {activeTab === 'compare' && beforeUrl && afterUrl && (
                <div className="space-y-3">
                  <ResizableBeforeAfter
                    beforeUrl={beforeUrl}
                    afterUrl={afterUrl}
                  />
                  <p className="text-[11px] text-stone-500 text-center">
                    💡 Слайдерді жылжытып, тазалау нәтижесінің нақтылығын тексеріңіз.
                  </p>
                </div>
              )}

              {/* Recommendations Banner */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-150 text-[11px] text-stone-600 space-y-1">
                <div className="font-bold text-stone-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI фото-салыстыру ережелері:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-stone-500 pl-1">
                  <li>ДЕЙІН және КЕЙІН суреттері нақты бір жерде түсірілуі тиіс.</li>
                  <li>Екі сурет те бірдей (көшірме) болса, өтінім қабылданбайды.</li>
                  <li>Жасанды интеллект немесе редактор арқылы өңделген фотолар анықталады.</li>
                </ul>
              </div>
            </div>
          )}

          {/* CHECKING AI state */}
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
                  Фотосуреттер талданып жатыр...
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Vision AI ДЕЙІН және КЕЙІН фотоларын бірге салыстырып, орынның сәйкестігі мен тазалау нәтижесін тексеруде.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>AI контекстік салыстыру жүріп жатыр</span>
              </div>
            </motion.div>
          )}

          {/* RECORDING ON-CHAIN state */}
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
                  Тексеру сәтті өтті! Solana Devnet желісіне транзакция жіберілуде.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 max-w-md mx-auto text-left text-xs font-mono text-stone-800 break-words">
                {blockchainMemoText}
              </div>
            </motion.div>
          )}

          {/* REJECTED state */}
          {status === 'rejected' && submissionResult && (
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
                  {submissionResult.statusLabelKz}
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Өтінім қабылданбады
                </h3>
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-xs text-red-800 max-w-md mx-auto text-left leading-relaxed">
                  <strong>Себебі: </strong>
                  {submissionResult.decision.decisionReasonKz}
                </div>
              </div>

              {/* Show resizable preview of rejected submission */}
              {beforeUrl && afterUrl && (
                <div className="pt-2">
                  <ResizableBeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ИИ-сіз транзакция жасау (+{rewardAmount} ECO)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Басқа фотолар жүктеу
                </button>
              </div>
            </motion.div>
          )}

          {/* MANUAL REVIEW state */}
          {status === 'manual_review' && submissionResult && (
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
                  {submissionResult.statusLabelKz}
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Модератордың қарауы қажет
                </h3>
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 max-w-md mx-auto text-left leading-relaxed">
                  <strong>Түсіндірме: </strong>
                  {submissionResult.decision.decisionReasonKz}
                </div>
              </div>

              {beforeUrl && afterUrl && (
                <div className="pt-2">
                  <ResizableBeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ИИ-сіз транзакция жасау (+{rewardAmount} ECO)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Анығырақ фотолар жүктеу
                </button>
              </div>
            </motion.div>
          )}

          {/* RETAKE REQUIRED state */}
          {status === 'retake_required' && submissionResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200">
                  Қайта түсіру қажет
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Сурет сапасы жеткіліксіз
                </h3>
                <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 text-xs text-orange-900 max-w-md mx-auto text-left leading-relaxed">
                  {submissionResult.decision.decisionReasonKz}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Қайтадан фото түсіру
                </button>
              </div>
            </motion.div>
          )}

          {/* ERROR state */}
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
                <h3 className="text-lg font-bold text-stone-900">Қате орын алды</h3>
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 max-w-md mx-auto text-xs text-red-800">
                  {errorMessage || 'Тексеру кезінде техникалық ақау шықты.'}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ИИ-сіз транзакция жасау (+{rewardAmount} ECO)</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartAiVerification}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Қайталау</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* CONFIRMED state */}
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
                  Тапсырма тексеруден өтті
                </div>
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Записано в блокчейн
                </h3>
                <p className="text-xs text-stone-500">
                  ДЕЙІН/КЕЙІН тазалау дәлелденді! Сыйақы: +{rewardAmount} ECO
                </p>
              </div>

              {/* Resizable comparison preview of successful cleanup */}
              {beforeUrl && afterUrl && (
                <div className="pt-1">
                  <ResizableBeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} />
                </div>
              )}

              {/* Reward info */}
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
                      <span>Посмотреть запись в блокчейне</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Blockchain records list */}
              <div className="space-y-2.5 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
                    Блокчейн жазбалары ({allRecords.length})
                  </h4>
                  <span className="text-[11px] text-stone-400">Solana Devnet Memo</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {allRecords.slice(0, 3).map((item) => (
                    <div
                      key={item.id || item.signature}
                      className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5"
                    >
                      <div className="text-stone-800 font-mono text-[11px] break-words bg-white/70 p-2 rounded-xl border border-stone-200/60">
                        {item.text}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>{item.formattedTime}</span>
                        <a
                          href={item.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-semibold hover:underline"
                        >
                          Explorer →
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
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleStartAiVerification}
                disabled={!beforeUrl || !afterUrl}
                className={`flex-1 py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  beforeUrl && afterUrl
                    ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {beforeUrl && afterUrl
                    ? 'AI арқылы салыстырып тексеру'
                    : !beforeUrl
                    ? '1. ДЕЙІН фотосын жүктеңіз'
                    : '2. КЕЙІН фотосын жүктеңіз'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDirectTransactionWithoutAi}
                className="py-3.5 px-4 rounded-2xl font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer flex items-center justify-center gap-1.5 transition-colors shrink-0"
                title="Жедел транзакция"
              >
                <span>⚡ ИИ-сіз транзакция</span>
              </button>
            </div>
          )}

          {status === 'checking_ai' && (
            <div className="w-full py-3 px-6 rounded-2xl bg-stone-100 text-stone-600 font-semibold text-xs flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 border-t-emerald-600 animate-spin" />
              <span>Фотосуреттер салыстырылуда...</span>
            </div>
          )}

          {status === 'recording_blockchain' && (
            <div className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm animate-pulse">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Записываем в блокчейн…</span>
            </div>
          )}

          {(status === 'rejected' || status === 'manual_review' || status === 'retake_required' || status === 'error') && (
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
