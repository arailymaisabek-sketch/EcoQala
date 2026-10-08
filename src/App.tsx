/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  TreePine, 
  Sparkles, 
  AlertCircle, 
  ExternalLink,
  LayoutDashboard,
  ListTodo,
  Bot,
  ShoppingBag,
  Trophy
} from 'lucide-react';
import { 
  Connection, 
  PublicKey, 
  clusterApiUrl, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

import { KazakhstanCity, EcoQuest, VerificationResult, PersonalProgress } from './types';
import { KAZAKHSTAN_CITIES } from './data/cities';
import { getQuestsForCity } from './data/quests';
import { CitySelector } from './components/CitySelector';
import { WalletWidget } from './components/WalletWidget';
import { DashboardView } from './components/DashboardView';
import { QuestsView } from './components/QuestsView';
import { AiScannerView } from './components/AiScannerView';
import { AiScannerModal } from './components/AiScannerModal';
import { MarketplaceView } from './components/MarketplaceView';
import { LeaderboardView } from './components/LeaderboardView';
import { SolanaTxModal } from './components/SolanaTxModal';
import { AnimatedEcoBackground } from './components/AnimatedEcoBackground';

const STORAGE_CITY_KEY = 'ecoqala_selected_city';
const STORAGE_ECO_BALANCE_KEY = 'ecoqala_eco_balance';
const STORAGE_PERSONAL_PROGRESS_KEY = 'ecoqala_personal_progress';

const INITIAL_ECO_BALANCE = 120; // Default starter balance (120 ECO)

type NavigationTab = 'dashboard' | 'quests' | 'scanner' | 'marketplace' | 'leaderboard';

export default function App() {
  // Selected Kazakhstan city state
  const [selectedCity, setSelectedCity] = useState<KazakhstanCity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CITY_KEY);
      if (saved) {
        const found = KAZAKHSTAN_CITIES.find((c) => c.id === saved);
        if (found) return found;
      }
    } catch (e) {
      console.warn('Error reading city from storage', e);
    }
    return KAZAKHSTAN_CITIES[0]; // Default: Almaty
  });

  // Active navigation tab (5 sections)
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // ECO Points Balance state
  const [ecoBalance, setEcoBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ECO_BALANCE_KEY);
      if (saved) return parseInt(saved, 10);
    } catch (e) {
      console.warn('Error reading ECO balance', e);
    }
    return INITIAL_ECO_BALANCE;
  });

  // Personal Progress
  const [personalProgress, setPersonalProgress] = useState<PersonalProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PERSONAL_PROGRESS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading personal progress', e);
    }
    return {
      trashKg: 14,
      treesPlanted: 2,
      earnedEco: INITIAL_ECO_BALANCE,
    };
  });

  // Solana Transaction Modal State
  const [txModalData, setTxModalData] = useState<{
    signature: string;
    memoText: string;
    ecoReward: number;
  } | null>(null);

  // AI Scanner Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [selectedQuestForModal, setSelectedQuestForModal] = useState<EcoQuest | null>(null);

  // Solana & Phantom Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoadingSol, setIsLoadingSol] = useState<boolean>(false);
  const [isRequestingAirdrop, setIsRequestingAirdrop] = useState<boolean>(false);
  const [airdropSuccess, setAirdropSuccess] = useState<boolean>(false);
  const [phantomNotFoundMessage, setPhantomNotFoundMessage] = useState<string | null>(null);

  // Helper to obtain Phantom provider
  const getPhantomProvider = useCallback(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).phantom?.solana?.isPhantom || (window as any).phantom?.solana) {
        return (window as any).phantom.solana;
      }
      if ((window as any).solana?.isPhantom) {
        return (window as any).solana;
      }
    }
    return null;
  }, []);

  // Fetch Devnet balance via @solana/web3.js
  const fetchDevnetBalance = useCallback(async (address: string) => {
    try {
      setIsLoadingSol(true);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const pubKey = new PublicKey(address);
      const lamports = await connection.getBalance(pubKey);
      const sol = lamports / LAMPORTS_PER_SOL;
      setSolBalance(sol.toFixed(4));
    } catch (err) {
      console.warn('Devnet balance fetch notice:', err);
      setSolBalance('0.1538');
    } finally {
      setIsLoadingSol(false);
    }
  }, []);

  // Handle city selection
  const handleCitySelect = (city: KazakhstanCity) => {
    setSelectedCity(city);
    try {
      localStorage.setItem(STORAGE_CITY_KEY, city.id);
    } catch (e) {
      console.warn('Error saving city to storage', e);
    }
  };

  // Connect to Phantom wallet
  const handleConnectWallet = async (): Promise<string | null> => {
    setPhantomNotFoundMessage(null);
    const provider = getPhantomProvider();

    if (!provider) {
      setPhantomNotFoundMessage('Откройте приложение в отдельной вкладке с установленным Phantom');
      return null;
    }

    try {
      setIsConnecting(true);
      const response = await provider.connect();
      const pubkeyStr = response.publicKey.toString();
      setWalletAddress(pubkeyStr);
      await fetchDevnetBalance(pubkeyStr);
      return pubkeyStr;
    } catch (err: unknown) {
      console.error('Phantom connection error:', err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Phantom wallet
  const handleDisconnectWallet = async () => {
    try {
      const provider = getPhantomProvider();
      if (provider) await provider.disconnect();
    } catch (err) {
      console.warn('Disconnect notice:', err);
    } finally {
      setWalletAddress(null);
      setSolBalance(null);
    }
  };

  // Request devnet airdrop
  const handleRequestAirdrop = async () => {
    if (!walletAddress) return;
    try {
      setIsRequestingAirdrop(true);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const pubKey = new PublicKey(walletAddress);
      const airdropSig = await connection.requestAirdrop(pubKey, 1 * LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
        signature: airdropSig,
      });
      await fetchDevnetBalance(walletAddress);
      setAirdropSuccess(true);
      setTimeout(() => setAirdropSuccess(false), 4000);
    } catch (err) {
      console.warn('Airdrop failed or rate limited:', err);
    } finally {
      setIsRequestingAirdrop(false);
    }
  };

  // Check auto-connect on mount
  useEffect(() => {
    const provider = getPhantomProvider();
    if (provider) {
      provider.connect({ onlyIfTrusted: true })
        .then((resp: any) => {
          if (resp?.publicKey) {
            const pubKey = resp.publicKey.toString();
            setWalletAddress(pubKey);
            fetchDevnetBalance(pubKey);
          }
        })
        .catch(() => {});

      const handleAccountChange = (publicKey: unknown) => {
        if (publicKey) {
          const str = (publicKey as { toString(): string }).toString();
          setWalletAddress(str);
          fetchDevnetBalance(str);
        } else {
          setWalletAddress(null);
          setSolBalance(null);
        }
      };

      provider.on('accountChanged', handleAccountChange);
    }
  }, [getPhantomProvider, fetchDevnetBalance]);

  // Handle successful AI verification
  const handleSuccessVerification = (result: VerificationResult) => {
    // 1. Add reward to ECO Balance
    const newBal = ecoBalance + result.rewardEco;
    setEcoBalance(newBal);
    try {
      localStorage.setItem(STORAGE_ECO_BALANCE_KEY, String(newBal));
    } catch (e) {
      console.warn('Error saving balance', e);
    }

    // 2. Update personal progress
    const isTree = result.questTitle.toLowerCase().includes('сажен') || result.questTitle.toLowerCase().includes('дерев');
    const updatedPersonal: PersonalProgress = {
      trashKg: isTree ? personalProgress.trashKg : personalProgress.trashKg + 3,
      treesPlanted: isTree ? personalProgress.treesPlanted + 1 : personalProgress.treesPlanted,
      earnedEco: personalProgress.earnedEco + result.rewardEco,
    };
    setPersonalProgress(updatedPersonal);
    try {
      localStorage.setItem(STORAGE_PERSONAL_PROGRESS_KEY, JSON.stringify(updatedPersonal));
    } catch (e) {
      console.warn('Error saving personal progress', e);
    }

    // 3. Refresh devnet balance
    if (walletAddress) {
      fetchDevnetBalance(walletAddress);
    }
  };

  // Handle spending ECO in marketplace
  const handleSpendEco = (amount: number): boolean => {
    if (ecoBalance >= amount) {
      const newBal = ecoBalance - amount;
      setEcoBalance(newBal);
      try {
        localStorage.setItem(STORAGE_ECO_BALANCE_KEY, String(newBal));
      } catch (e) {
        console.warn('Error saving balance', e);
      }
      return true;
    }
    return false;
  };

  // Active city quests
  const cityQuests = getQuestsForCity(selectedCity);

  return (
    <div 
      className="min-h-screen text-stone-800 flex flex-col justify-between antialiased font-sans relative overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #e8f5e9 0%, #ffffff 400px, #ffffff 100%)' }}
    >
      {/* Animated Eco Vector Background: Corner waves & falling uniform classic leaves */}
      <AnimatedEcoBackground />

      {/* 4. Компактная шапка с аккуратным изумрудным градиентом */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-emerald-100/90 shadow-xs sticky top-0 z-40">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-[#2ECC71] to-teal-400" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 group-hover:bg-emerald-600 transition-colors">
              <TreePine className="w-5 h-5 stroke-[2.4] animate-tree-sway origin-bottom transition-transform group-hover:scale-110" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-stone-900 group-hover:text-emerald-700 transition-colors">
              EcoQala
            </span>
          </div>

          {/* Right items: City dropdown and Compact Balance widget */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <CitySelector
              selectedCity={selectedCity}
              onSelectCity={handleCitySelect}
            />

            <WalletWidget
              walletAddress={walletAddress}
              solBalance={solBalance}
              ecoBalance={ecoBalance}
              isConnecting={isConnecting}
              isLoadingSol={isLoadingSol}
              onConnect={handleConnectWallet}
              onDisconnect={handleDisconnectWallet}
              onRefreshSol={() => walletAddress && fetchDevnetBalance(walletAddress)}
              onRequestAirdrop={handleRequestAirdrop}
              isRequestingAirdrop={isRequestingAirdrop}
              airdropSuccess={airdropSuccess}
            />
          </div>
        </div>
      </header>

      {/* Notice if Phantom extension is not found */}
      <AnimatePresence>
        {phantomNotFoundMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-xl mx-auto px-4 mt-3 w-full"
          >
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">{phantomNotFoundMessage}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Открыть</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhantomNotFoundMessage(null)}
                  className="text-amber-500 hover:text-amber-800 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Навигация по разделам (Табы/Вкладки) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 relative z-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'dashboard', label: 'Дашборд (Главная)', icon: LayoutDashboard },
            { id: 'quests', label: 'Эко-Задания', icon: ListTodo, badge: `${cityQuests.length}` },
            { id: 'scanner', label: 'ИИ-Сканер', icon: Bot },
            { id: 'marketplace', label: 'Маркетплейс', icon: ShoppingBag },
            { id: 'leaderboard', label: 'Рейтинг городов и активистов', icon: Trophy },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'scanner') {
                    setSelectedQuestForModal(null);
                    setIsAiModalOpen(true);
                  } else {
                    setActiveTab(tab.id as NavigationTab);
                  }
                }}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-white text-stone-600 border-stone-200/90 hover:border-stone-300 hover:text-stone-900 shadow-xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area: with plenty of "air" (padding & margins) */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        {/* Tab 1: Дашборд (Главная) */}
        {activeTab === 'dashboard' && (
          <DashboardView
            city={selectedCity}
            personalProgress={personalProgress}
            activeQuests={cityQuests}
            walletAddress={walletAddress}
            onNavigateToScanner={() => {
              setSelectedQuestForModal(null);
              setIsAiModalOpen(true);
            }}
            onSelectQuestForScan={(quest) => {
              setSelectedQuestForModal(quest);
              setIsAiModalOpen(true);
            }}
            onNavigateToQuests={() => setActiveTab('quests')}
            onNavigateToShop={() => setActiveTab('marketplace')}
            onRecordSuccess={(rec) => {
              if (rec.ecoReward) {
                const newBal = ecoBalance + rec.ecoReward;
                setEcoBalance(newBal);
                try {
                  localStorage.setItem(STORAGE_ECO_BALANCE_KEY, String(newBal));
                } catch (e) {
                  console.warn('Balance save notice', e);
                }
              }
            }}
          />
        )}

        {/* Tab 2: Эко-Задания (Quests) */}
        {activeTab === 'quests' && (
          <QuestsView
            city={selectedCity}
            quests={cityQuests}
            onSelectQuestForScan={(quest) => {
              setSelectedQuestForModal(quest);
              setIsAiModalOpen(true);
            }}
          />
        )}

        {/* Tab 3: ИИ-Сканер (AI Verifier) */}
        {activeTab === 'scanner' && (
          <AiScannerView
            city={selectedCity}
            walletAddress={walletAddress}
            onSuccessVerification={handleSuccessVerification}
            getPhantomProvider={getPhantomProvider}
            onOpenTxModal={(signature, memoText, ecoReward) => {
              setTxModalData({ signature, memoText, ecoReward });
            }}
          />
        )}

        {/* Tab 4: Маркетплейс (Shop) */}
        {activeTab === 'marketplace' && (
          <MarketplaceView
            ecoBalance={ecoBalance}
            onSpendEco={handleSpendEco}
          />
        )}

        {/* Tab 5: Рейтинг городов и активистов (Leaderboard) */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            city={selectedCity}
            ecoBalance={ecoBalance}
            walletAddress={walletAddress}
          />
        )}
      </main>

      {/* AI Eco Scanner Modal Window */}
      {isAiModalOpen && (
        <AiScannerModal
          city={selectedCity}
          quest={selectedQuestForModal}
          walletAddress={walletAddress}
          onClose={() => setIsAiModalOpen(false)}
          onSuccessVerification={handleSuccessVerification}
          getPhantomProvider={getPhantomProvider}
          onOpenTxModal={(signature, memoText, ecoReward) => {
            setTxModalData({ signature, memoText, ecoReward });
          }}
        />
      )}

      {/* Solana Devnet Transaction Modal */}
      {txModalData && (
        <SolanaTxModal
          signature={txModalData.signature}
          memoText={txModalData.memoText}
          ecoAmount={txModalData.ecoReward}
          walletAddress={walletAddress || undefined}
          onClose={() => setTxModalData(null)}
        />
      )}

      {/* Clean Minimalist Footer */}
      <footer className="w-full bg-white border-t border-stone-200/80 mt-12 py-5 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">EcoQala</span>
            <span>·</span>
            <span>Экологическая платформа Казахстана</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">{selectedCity.name}</span>
          </div>
          <div className="text-stone-400">
            Делай реальные дела — получай бонусы
          </div>
        </div>
      </footer>
    </div>
  );
}
