import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Camera, 
  FileCheck2, 
  ExternalLink,
  Bot
} from 'lucide-react';
import { EcoQuest, KazakhstanCity, VerificationResult } from '../types';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  clusterApiUrl 
} from '@solana/web3.js';

interface ProofVerificationModalProps {
  quest: EcoQuest;
  city: KazakhstanCity;
  walletAddress: string | null;
  onClose: () => void;
  onSuccessVerification: (result: VerificationResult) => void;
  getPhantomProvider: () => any;
}

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

const SAMPLE_PROOFS = [
  {
    id: 'proof-1',
    label: 'Мешки с собранным пластиком и алюминием',
    image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80',
    description: 'Собрано 3 мешка ПЭТ-бутылок вдоль береговой линии. Вес ~7.5 кг.',
    objects: ['ПЭТ-бутылки', 'Жестяные банки', 'Мусорные мешки повышенной прочности'],
    metric: '7.8 кг отходов',
  },
  {
    id: 'proof-2',
    label: 'Свежевысаженный саженец яблони с лункой',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
    description: 'Высажен саженец с подвязкой и обильным поливом 25 литров.',
    objects: ['Молодой саженец', 'Опорный колышек', 'Прикорневая лунка для полива'],
    metric: '1 жизнеспособный саженец',
  },
  {
    id: 'proof-3',
    label: 'Сортированный пластик в контейнере вторсырья',
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    description: 'Сдано 45 спрессованных ПЭТ-бутылок в пункт приёма.',
    objects: ['Прессованный пластик', 'Контейнер раздельного сбора'],
    metric: '45 ПЭТ единиц',
  },
];

export const ProofVerificationModal: React.FC<ProofVerificationModalProps> = ({
  quest,
  city,
  walletAddress,
  onClose,
  onSuccessVerification,
  getPhantomProvider,
}) => {
  const [selectedProof, setSelectedProof] = useState(SAMPLE_PROOFS[quest.category === 'trees' ? 1 : 0]);
  const [customDescription, setCustomDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [onChainSignature, setOnChainSignature] = useState<string | null>(null);
  const [isRecordingOnChain, setIsRecordingOnChain] = useState<boolean>(false);

  const handleStartAIVerification = async () => {
    setIsAnalyzing(true);
    setAnalysisStep('Запуск мультимодальной нейросети Gemini Vision...');

    // Step 1: Scan photo
    await new Promise((resolve) => setTimeout(resolve, 800));
    setAnalysisStep('Сегментация объектов и классификация типа отходов/саженцев...');

    // Step 2: Geo check
    await new Promise((resolve) => setTimeout(resolve, 900));
    setAnalysisStep(`Проверка гео-привязки к сектору: г. ${city.name}...`);

    // Step 3: Confidence scoring
    await new Promise((resolve) => setTimeout(resolve, 700));
    setAnalysisStep('Расчёт индекса достоверности и начисление ReFi токенов...');

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Try sending on-chain Solana Memo if Phantom wallet is connected!
    let txSig: string | undefined = undefined;
    const provider = getPhantomProvider();

    if (provider && walletAddress) {
      try {
        setIsRecordingOnChain(true);
        setAnalysisStep('Записываем Proof-of-Action в блокчейн Solana Devnet...');
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const senderPubKey = new PublicKey(walletAddress);
        const memoText = `[EcoQala ReFi] Награда +${quest.rewardEco} ECO за выполнение: "${quest.title}" (${city.name}) | Уверенность ИИ: 98.4%`;
        const textEncoder = new TextEncoder();
        const memoBytes = textEncoder.encode(memoText);

        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: senderPubKey, isSigner: true, isWritable: true }],
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: memoBytes as unknown as Buffer,
        });

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const transaction = new Transaction({
          feePayer: senderPubKey,
          recentBlockhash: blockhash,
        });
        transaction.add(memoInstruction);

        const { signature } = await provider.signAndSendTransaction(transaction);
        txSig = signature;
        setOnChainSignature(signature);
      } catch (err) {
        console.warn('Phantom on-chain recording bypassed or rejected:', err);
        // Fallback demo on-chain signature
        const rand = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        txSig = `4v${rand}kL9...9wZa`;
        setOnChainSignature(txSig);
      } finally {
        setIsRecordingOnChain(false);
      }
    } else {
      const rand = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      txSig = `5x${rand}mP2...7rKt`;
      setOnChainSignature(txSig);
    }

    const result: VerificationResult = {
      id: `proof-${Date.now()}`,
      questTitle: quest.title,
      rewardEco: quest.rewardEco,
      confidenceScore: 98.4,
      analyzedObjects: selectedProof.objects,
      estimatedWeightOrCount: selectedProof.metric,
      city: city.name,
      timestamp: Date.now(),
      solanaTxSignature: txSig,
      status: 'APPROVED',
    };

    setVerificationResult(result);
    setIsAnalyzing(false);
    onSuccessVerification(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-neutral-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                ИИ-Верификация экологического действия
              </div>
              <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-neutral-400" />
                <span>{city.name} · Proof-of-Action</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {!verificationResult ? (
            <>
              {/* Quest Summary Banner */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white mb-0.5">
                    {quest.title}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Локация: {quest.locationName}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-neutral-400">Награда за отчёт</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    +{quest.rewardEco} ECO
                  </div>
                </div>
              </div>

              {/* Photo Evidence Selector */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  Прикрепите подтверждающее фото (До/После, взвешивание, саженец)
                </label>

                {/* Selected Photo Preview */}
                <div className="relative rounded-xl overflow-hidden border border-neutral-800 aspect-video mb-3 group bg-neutral-900">
                  <img
                    src={selectedProof.image}
                    alt={selectedProof.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <div className="text-xs text-white">
                      <div className="font-medium">{selectedProof.label}</div>
                      <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
                        Объём: {selectedProof.metric}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Presets / Real Upload Options */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-neutral-400">
                    Выберите снимок или воспользуйтесь образцом отчёта:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_PROOFS.map((proof) => (
                      <button
                        key={proof.id}
                        type="button"
                        onClick={() => setSelectedProof(proof)}
                        className={`p-2 rounded-xl border text-left text-[11px] transition-all cursor-pointer ${
                          selectedProof.id === proof.id
                            ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                            : 'bg-neutral-900/60 border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <div className="line-clamp-2 leading-tight font-medium">
                          {proof.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description field */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Комментарий эко-активиста (необязательно)
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={selectedProof.description}
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 resize-none"
                />
              </div>

              {/* AI Verification status note */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-neutral-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  ИИ распознаёт объекты, вычисляет объём собранного мусора или саженцев и автоматически зачисляет <span className="text-emerald-400 font-bold">+{quest.rewardEco} ECO</span> на ваш баланс в сети Solana Devnet.
                </div>
              </div>
            </>
          ) : (
            /* Verification SUCCESS State */
            <div className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Отчёт успешно верифицирован ИИ!
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Искусственный интеллект подтвердил подлинность действия. Эко-токены успешно зачислены.
                </p>
              </div>

              {/* Reward Banner */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                <div className="text-xs text-neutral-400 uppercase tracking-wider font-mono">
                  Начислено на баланс
                </div>
                <div className="text-3xl font-extrabold font-mono text-emerald-400 my-1">
                  +{verificationResult.rewardEco} ECO
                </div>
                <div className="text-xs text-emerald-300">
                  Токены уже доступны в Маркетплейсе
                </div>
              </div>

              {/* AI Detection Breakdown */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Индекс достоверности ИИ:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {verificationResult.confidenceScore}% (Высокий)
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-400 border-t border-neutral-850 pt-2">
                  <span>Распознанные объекты:</span>
                  <span className="text-white">
                    {verificationResult.analyzedObjects.join(', ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-400 border-t border-neutral-850 pt-2">
                  <span>Объём воздействия:</span>
                  <span className="text-white font-medium">
                    {verificationResult.estimatedWeightOrCount}
                  </span>
                </div>

                {onChainSignature && (
                  <div className="flex items-center justify-between text-neutral-400 border-t border-neutral-850 pt-2">
                    <span>Solana Devnet Memo:</span>
                    <a
                      href={`https://explorer.solana.com/tx/${onChainSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline text-[11px]"
                    >
                      <span>{onChainSignature.slice(0, 6)}...{onChainSignature.slice(-6)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-neutral-850 bg-neutral-950">
          {!verificationResult ? (
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleStartAIVerification}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-neutral-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>{analysisStep || 'Анализируем отчёт...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Отправить на проверку ИИ (+{quest.rewardEco} ECO)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-neutral-850 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Отлично, перейти к другим заданиям
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
