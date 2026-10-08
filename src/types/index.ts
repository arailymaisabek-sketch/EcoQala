export interface KazakhstanCity {
  id: string;
  name: string;
  nameKz: string;
  region: string;
  lat: number;
  lng: number;
}

export type QuestCategory = 'all' | 'trash' | 'trees' | 'patrol';

export interface EcoQuest {
  id: string;
  title: string;
  description: string;
  category: 'trash' | 'trees' | 'patrol';
  rewardEco: number;
  cityId?: string; // specific city or global
  locationName: string;
  difficulty: 'Легко' | 'Средне' | 'Хард';
  impactMetric: string;
  participantsCount: number;
  deadlineDays: number;
  iconType: 'trash' | 'tree' | 'patrol';
}

export interface VerificationResult {
  id: string;
  questTitle: string;
  rewardEco: number;
  confidenceScore: number;
  analyzedObjects: string[];
  estimatedWeightOrCount: string;
  city: string;
  timestamp: number;
  solanaTxSignature?: string;
  status: 'APPROVED' | 'REJECTED';
}

export interface MarketplaceItem {
  id: string;
  title: string;
  category: 'voucher' | 'product' | 'transport' | 'green';
  description: string;
  ecoCost: number;
  partner: string;
  stock: number;
  discountValue?: string;
  iconName: string;
}

export interface EcoSpot {
  id: string;
  name: string;
  type: 'recycle_plastic' | 'recycle_all' | 'nursery_trees' | 'eco_box';
  address: string;
  schedule: string;
  accepts: string[];
}

export interface EcoUserRank {
  rank: number;
  name: string;
  walletShort: string;
  trashKg: number;
  treesPlanted: number;
  earnedEco: number;
  avatarSeed: string;
  isCurrentUser?: boolean;
}

export interface PersonalProgress {
  trashKg: number;
  treesPlanted: number;
  earnedEco: number;
}

export interface CityProgress {
  cityId: string;
  cityName: string;
  monthlyTrashKg: number;
  monthlyTrees: number;
  targetTrashKg: number;
  activeVolunteers: number;
}

export interface CityRankingItem {
  rank: number;
  cityId: string;
  cityName: string;
  trashKg: number;
  treesPlanted: number;
  totalEcoEarned: number;
  activeVolunteers: number;
}

export interface BlockchainRecord {
  id: string;
  signature: string;
  text: string;
  timestamp: number;
  formattedTime: string;
  explorerUrl: string;
  ecoReward?: number;
  status: 'confirmed' | 'failed';
  errorDetails?: string;
  walletAddress?: string;
}

