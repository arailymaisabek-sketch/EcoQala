import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Bot, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FileWarning,
  Trash2,
  Camera,
  Sliders
} from 'lucide-react';
import { EcoQuest, KazakhstanCity, VerificationResult } from '../types';
import { sendMemoTransaction } from '../services/solanaService';
import { 
  validateImageFile, 
  fileToBase64, 
  requestBeforeAfterVerification 
} from '../services/clientImageService';
import { CleanupSubmissionRecord, ImageUploadItem } from '../types/cleanupVerification';
import { ResizableBeforeAfter } from './ResizableBeforeAfter';

interface ProofVerificationModalProps {
  quest: EcoQuest;
  city: KazakhstanCity;
  walletAddress: string | null;
  onClose: () => void;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
  onOpenTxModal?: (signature: string, memoText: string, ecoReward?: number) => void;
}

export const ProofVerificationModal: React.FC<ProofVerificationModalProps> = ({
  quest,
  city,
  walletAddress,
  onClose,
  onSuccessVerification,
  onOpenTxModal,
}) => {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState<'before' | 'after' | 'compare'>('before');
  const [fileValidationErr, setFileValidationErr] = useState<string | null>(null);

  const [status, setStatus] = useState<
    'idle' | 'checking_ai' | 'approved' | 'manual_review' | 'rejected' | 'retake_required' | 'recording_blockchain' | 'confirmed' | 'error'
  >('idle');

  const [submissionResult, setSubmissionResult] = useState<CleanupSubmissionRecord | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBeforeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const check = await validateImageFile(file);
    if (!check.isValid) {
      setFileValidationErr(check.errorMessageKz || 'Файл форматы немесе өлшемі жарамсыз.');
      return;
    }

    setBeforeFile(file);
    const dataUrl = await fileToBase64(file);
    setBeforeUrl(dataUrl);
    if (!afterUrl) {
      setActiveStep('after');
    } else {
      setActiveStep('compare');
    }
  };

  const handleAfterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const check = await validateImageFile(file);
    if (!check.isValid) {
      setFileValidationErr(check.errorMessageKz || 'Файл форматы немесе өлшемі жарамсыз.');
      return;
    }

    setAfterFile(file);
    const dataUrl = await fileToBase64(file);
    setAfterUrl(dataUrl);
    setActiveStep('compare');
  };

  const handleClearBefore = () => {
    setBeforeFile(null);
    setBeforeUrl(null);
    setFileValidationErr(null);
    setActiveStep('before');
  };

  const handleClearAfter = () => {
    setAfterFile(null);
    setAfterUrl(null);
    setFileValidationErr(null);
    setActiveStep('after');
  };

  const handleDirectTransactionWithoutAi = async () => {
    setFileValidationErr(null);
    setErrorMessage(null);
    setStatus('recording_blockchain');

    try {
      const memoText = `[EcoQala] Тапсырма: ${quest.title} (${city.name}) | Сыйақы: +${quest.rewardEco} ECO | Транзакция: Тікелей расталды`;
      const txResult = await sendMemoTransaction(memoText, {
        ecoReward: quest.rewardEco,
        walletAddress,
      });

      if (!txResult.success) {
        setErrorMessage(txResult.errorMessage || 'Solana желісіне жазу мүмкін болмады.');
        setStatus('error');
        return;
      }

      const sig = txResult.signature!;
      setTxSignature(sig);

      const res: VerificationResult = {
        id: `proof-${Date.now()}`,
        questTitle: quest.title,
        rewardEco: quest.rewardEco,
        confidenceScore: 100,
        analyzedObjects: ['Эко-тапсырма', 'Тікелей транзакция'],
        estimatedWeightOrCount: `${quest.rewardEco} ECO`,
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
      console.error('Proof direct error:', err);
      setErrorMessage('Транзакция жіберуде қате шықты.');
      setStatus('error');
    }
  };

  const handleStartAIVerification = async () => {
    setFileValidationErr(null);
    setErrorMessage(null);

    if (!beforeFile || !beforeUrl) {
      setFileValidationErr('Тазалауға ДЕЙІНГІ (Before) фотосуретті жүктеңіз.');
      setActiveStep('before');
      return;
    }

    if (!afterFile || !afterUrl) {
      setFileValidationErr('Тазалаудан КЕЙІНГІ (After) фотосуретті жүктеңіз.');
      setActiveStep('after');
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

      const idempotencyKey = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const result = await requestBeforeAfterVerification({
        idempotencyKey,
        taskId: quest.id,
        taskTitle: quest.title,
        category: quest.category,
        cityName: city.name,
        walletAddress,
        beforeImage: beforeItem,
        afterImage: afterItem,
      });

      setSubmissionResult(result);

      if (result.status === 'approved') {
        setStatus('recording_blockchain');

        const memoText = `[EcoQala] Тапсырма: ${quest.title} (${city.name}) | Сыйақы: +${quest.rewardEco} ECO | Фото тексеруден өтті`;
        const txResult = await sendMemoTransaction(memoText, {
          ecoReward: quest.rewardEco,
          walletAddress,
        });

        if (!txResult.success) {
          setErrorMessage(txResult.errorMessage || 'Solana желісіне жазу мүмкін болмады.');
          setStatus('error');
          return;
        }

        const sig = txResult.signature!;
        setTxSignature(sig);

        const res: VerificationResult = {
          id: result.id,
          questTitle: quest.title,
          rewardEco: quest.rewardEco,
          confidenceScore: Math.round((result.aiOutput?.confidence || 0.9) * 100),
          analyzedObjects: result.aiOutput?.detectedAfterObjects || ['Тазартылған аумақ'],
          estimatedWeightOrCount: `${quest.rewardEco} ECO`,
          city: city.name,
          timestamp: Date.now(),
          solanaTxSignature: sig,
          status: 'APPROVED',
          statusLabelKz: result.statusLabelKz,
          reasonKz: result.decision.decisionReasonKz,
        };

        setStatus('confirmed');
        onSuccessVerification(res);
      } else if (result.status === 'manual_review') {
        setStatus('manual_review');
      } else if (result.status === 'retake_required') {
        setStatus('retake_required');
      } else {
        setStatus('rejected');
      }
    } catch (err: any) {
      console.error('Proof modal error:', err);
      setErrorMessage('Тексеру процесінде техникалық қате шықты.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-xl bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-stone-150">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <span>AI ДЕЙІН/КЕЙІН Тексеру</span>
              </div>
              <div className="text-xs text-stone-500 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>{city.name} · {quest.locationName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quest details */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-stone-900">{quest.title}</div>
              <div className="text-stone-500 mt-0.5">{quest.description}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-emerald-700 text-sm">
                +{quest.rewardEco} ECO
              </span>
            </div>
          </div>

          {fileValidationErr && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{fileValidationErr}</span>
            </div>
          )}

          {status === 'idle' && (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveStep('before')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeStep === 'before' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  1. Дейін {beforeUrl && '✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('after')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeStep === 'after' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  2. Кейін {afterUrl && '✓'}
                </button>
                {beforeUrl && afterUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveStep('compare')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeStep === 'compare' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Салыстыру / Ресайз
                  </button>
                )}
              </div>

              {activeStep === 'before' && (
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    1. Тазалауға ДЕЙІНГІ фотосурет (Before):
                  </label>
                  {!beforeUrl ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                      <Upload className="w-8 h-8 text-stone-400 group-hover:text-emerald-600 mb-2" />
                      <span className="text-xs font-bold text-stone-800">Қоқыс бар аумақтың фотосын жүктеңіз</span>
                      <span className="text-[11px] text-stone-500 mt-1">JPG, PNG, WEBP (макс. 10 МБ)</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleBeforeChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                      <img src={beforeUrl} alt="Before" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        ДЕЙІН (BEFORE)
                      </div>
                      <button
                        type="button"
                        onClick={handleClearBefore}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 'after' && (
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    2. Тазалаудан КЕЙІНГІ фотосурет (After):
                  </label>
                  {!afterUrl ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                      <Camera className="w-8 h-8 text-stone-400 group-hover:text-emerald-600 mb-2" />
                      <span className="text-xs font-bold text-stone-800">Тазартылған аумақтың фотосын жүктеңіз</span>
                      <span className="text-[11px] text-stone-500 mt-1">JPG, PNG, WEBP (макс. 10 МБ)</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleAfterChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                      <img src={afterUrl} alt="After" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                        КЕЙІН (AFTER)
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAfter}
                        className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 'compare' && beforeUrl && afterUrl && (
                <div className="space-y-2">
                  <ResizableBeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} />
                </div>
              )}
            </div>
          )}

          {status === 'checking_ai' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-stone-900">Фотосуреттер салыстырылуда...</div>
              <p className="text-xs text-stone-500">Vision AI ДЕЙІН және КЕЙІН фотоларын талдауда.</p>
            </div>
          )}

          {status === 'rejected' && submissionResult && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileWarning className="w-4 h-4 text-red-600" />
                <span>{submissionResult.statusLabelKz}</span>
              </div>
              <p><strong>Себебі: </strong>{submissionResult.decision.decisionReasonKz}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  ⚡ ИИ-сіз транзакция жасау
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBeforeFile(null);
                    setBeforeUrl(null);
                    setAfterFile(null);
                    setAfterUrl(null);
                    setStatus('idle');
                    setActiveStep('before');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold cursor-pointer"
                >
                  Басқа фото жүктеу
                </button>
              </div>
            </div>
          )}

          {status === 'manual_review' && submissionResult && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>{submissionResult.statusLabelKz}</span>
              </div>
              <p><strong>Түсіндірме: </strong>{submissionResult.decision.decisionReasonKz}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  ⚡ ИИ-сіз транзакция жасау
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBeforeFile(null);
                    setBeforeUrl(null);
                    setAfterFile(null);
                    setAfterUrl(null);
                    setStatus('idle');
                    setActiveStep('before');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white font-bold cursor-pointer"
                >
                  Анығырақ фото жүктеу
                </button>
              </div>
            </div>
          )}

          {status === 'retake_required' && submissionResult && (
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-2">
              <div className="font-bold text-sm">Сурет сапасы тым төмен</div>
              <p>{submissionResult.decision.decisionReasonKz}</p>
              <button
                type="button"
                onClick={() => {
                  setBeforeFile(null);
                  setBeforeUrl(null);
                  setAfterFile(null);
                  setAfterUrl(null);
                  setStatus('idle');
                  setActiveStep('before');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
              >
                Қайта түсіру
              </button>
            </div>
          )}

          {status === 'recording_blockchain' && (
            <div className="py-6 text-center space-y-2 text-xs text-emerald-800">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto animate-pulse" />
              <div className="font-bold text-sm">Записываем в блокчейн…</div>
              <p>Solana Devnet желісіне транзакция жіберілуде...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
              <div className="font-bold">Қате: {errorMessage}</div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  ⚡ ИИ-сіз транзакция жасау
                </button>
                <button
                  type="button"
                  onClick={handleStartAIVerification}
                  className="text-red-700 underline font-bold cursor-pointer"
                >
                  Қайталау
                </button>
              </div>
            </div>
          )}

          {status === 'confirmed' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Фото тексеруден өтті · Записано в блокчейн</span>
              </div>
              {beforeUrl && afterUrl && (
                <div className="pt-1">
                  <ResizableBeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} />
                </div>
              )}
              <p>Сыйақы қосылды: <strong>+{quest.rewardEco} ECO</strong></p>
              {txSignature && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                  >
                    <span>Посмотреть в Explorer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {onOpenTxModal && (
                    <button
                      type="button"
                      onClick={() => {
                        const memoText = `[EcoQala] Тапсырма: ${quest.title} (${city.name}) | Сыйақы: +${quest.rewardEco} ECO`;
                        onOpenTxModal(txSignature, memoText, quest.rewardEco);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition-colors cursor-pointer"
                    >
                      <span>Квитанция (Memo)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-stone-150 bg-stone-50 flex items-center justify-between">
          {status === 'idle' && (
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={handleStartAIVerification}
                disabled={!beforeUrl || !afterUrl}
                className={`flex-1 py-3 px-5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                  beforeUrl && afterUrl
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-sm'
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
              </button>

              <button
                type="button"
                onClick={handleDirectTransactionWithoutAi}
                className="py-3 px-4 rounded-2xl font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer flex items-center justify-center gap-1 shrink-0"
              >
                <span>⚡ ИИ-сіз транзакция</span>
              </button>
            </div>
          )}

          {(status === 'confirmed' || status === 'rejected' || status === 'manual_review' || status === 'retake_required' || status === 'error') && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-stone-900 text-white font-bold text-xs cursor-pointer"
            >
              Жабу
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
