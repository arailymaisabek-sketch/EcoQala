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
  Trash2
} from 'lucide-react';
import { EcoQuest, KazakhstanCity, VerificationResult } from '../types';
import { sendMemoTransaction } from '../services/solanaService';
import { 
  validateImageFile, 
  fileToBase64, 
  requestPhotoVerification 
} from '../services/clientImageService';
import { VerifyImageResult } from '../services/imageVerificationService';

interface ProofVerificationModalProps {
  quest: EcoQuest;
  city: KazakhstanCity;
  walletAddress: string | null;
  onClose: () => void;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
}

export const ProofVerificationModal: React.FC<ProofVerificationModalProps> = ({
  quest,
  city,
  walletAddress,
  onClose,
  onSuccessVerification,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileValidationErr, setFileValidationErr] = useState<string | null>(null);

  const [status, setStatus] = useState<
    'idle' | 'checking_ai' | 'ai_rejected' | 'ai_needs_review' | 'recording_blockchain' | 'confirmed' | 'error'
  >('idle');

  const [aiResult, setAiResult] = useState<VerifyImageResult | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleClear = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setFileValidationErr(null);
    setAiResult(null);
    setStatus('idle');
  };

  const handleDirectTransactionWithoutAi = async () => {
    setFileValidationErr(null);
    setErrorMessage(null);
    setStatus('recording_blockchain');

    try {
      const memoText = `[EcoQala] Тапсырма: ${quest.title} (${city.name}) | Сыйақы: +${quest.rewardEco} ECO | Транзакция: ИИ-сіз тікелей расталды`;
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

    if (!uploadedFile || !previewUrl) {
      setFileValidationErr('Алдымен фотосуретті жүктеңіз');
      return;
    }

    setStatus('checking_ai');

    try {
      const verification = await requestPhotoVerification({
        taskTitle: quest.title,
        category: quest.category,
        cityName: city.name,
        imageB64: previewUrl,
        mimeType: uploadedFile.type,
      });

      setAiResult(verification);

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

      // If approved, write to Solana devnet memo
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
        id: `proof-${Date.now()}`,
        questTitle: quest.title,
        rewardEco: quest.rewardEco,
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

      setStatus('confirmed');
      onSuccessVerification(res);
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
              <div className="text-sm font-bold text-stone-900">
                AI Фото-тексеру
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
              <label className="block text-xs font-bold text-stone-800">
                Орындалған тапсырманың фотосуреті (міндетті):
              </label>

              {!previewUrl ? (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                  <Upload className="w-8 h-8 text-stone-400 group-hover:text-emerald-600 mb-2 transition-colors" />
                  <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700">
                    Фотосуретті жүктеңіз
                  </span>
                  <span className="text-[11px] text-stone-500 mt-1">
                    JPG, JPEG, PNG, WEBP (макс. 10 МБ)
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                  <img src={previewUrl} alt="Жүктелген фото" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'checking_ai' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-stone-900">Фото тексерілуде...</div>
              <p className="text-xs text-stone-500">Gemini Vision AI фотоны тапсырмамен салыстыруда.</p>
            </div>
          )}

          {status === 'ai_rejected' && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileWarning className="w-4 h-4 text-red-600" />
                <span>Фото сәйкес келмейді</span>
              </div>
              <p><strong>Себебі: </strong>{aiResult?.reasonKz}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  ⚡ ИИ-сіз транзакция жасау
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold"
                >
                  Басқа фото жүктеу
                </button>
              </div>
            </div>
          )}

          {status === 'ai_needs_review' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Қосымша тексеру қажет</span>
              </div>
              <p><strong>Түсіндірме: </strong>{aiResult?.reasonKz}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectTransactionWithoutAi}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  ⚡ ИИ-сіз транзакция жасау
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white font-bold"
                >
                  Анығырақ фото жүктеу
                </button>
              </div>
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  ⚡ ИИ-сіз транзакция жасау
                </button>
                <button
                  type="button"
                  onClick={handleStartAIVerification}
                  className="text-red-700 underline font-bold"
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
              <p>Сыйақы қосылды: <strong>+{quest.rewardEco} ECO</strong></p>
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold"
                >
                  <span>Посмотреть запись</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
                onClick={handleDirectTransactionWithoutAi}
                className="flex-1 py-3 px-5 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>ИИ-сіз транзакция жасау (+{quest.rewardEco} ECO)</span>
              </button>
              {uploadedFile && (
                <button
                  type="button"
                  onClick={handleStartAIVerification}
                  className="py-3 px-4 rounded-2xl font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer flex items-center justify-center gap-1 shrink-0"
                >
                  <Bot className="w-4 h-4 text-emerald-600" />
                  <span>AI тексерумен</span>
                </button>
              )}
            </div>
          )}

          {(status === 'confirmed' || status === 'ai_rejected' || status === 'ai_needs_review' || status === 'error') && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-stone-900 text-white font-bold text-xs"
            >
              Жабу
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
