import { CityProgress, CityRankingItem, KazakhstanCity } from '../types';

interface CityStatsSeed {
  monthlyTrashKg: number;
  monthlyTrees: number;
  targetTrashKg: number;
  activeVolunteers: number;
}

const CITY_STATS_MAP: Record<string, CityStatsSeed> = {
  almaty: { monthlyTrashKg: 4280, monthlyTrees: 340, targetTrashKg: 5000, activeVolunteers: 612 },
  astana: { monthlyTrashKg: 3840, monthlyTrees: 420, targetTrashKg: 4500, activeVolunteers: 524 },
  shymkent: { monthlyTrashKg: 2650, monthlyTrees: 290, targetTrashKg: 3200, activeVolunteers: 380 },
  aktobe: { monthlyTrashKg: 1200, monthlyTrees: 110, targetTrashKg: 1500, activeVolunteers: 184 },
  karaganda: { monthlyTrashKg: 1850, monthlyTrees: 145, targetTrashKg: 2200, activeVolunteers: 240 },
  taraz: { monthlyTrashKg: 980, monthlyTrees: 95, targetTrashKg: 1200, activeVolunteers: 140 },
  pavlodar: { monthlyTrashKg: 1120, monthlyTrees: 125, targetTrashKg: 1400, activeVolunteers: 165 },
  oskemen: { monthlyTrashKg: 1310, monthlyTrees: 160, targetTrashKg: 1600, activeVolunteers: 195 },
  semey: { monthlyTrashKg: 940, monthlyTrees: 115, targetTrashKg: 1200, activeVolunteers: 130 },
  atyrau: { monthlyTrashKg: 890, monthlyTrees: 80, targetTrashKg: 1100, activeVolunteers: 120 },
  kostanay: { monthlyTrashKg: 780, monthlyTrees: 90, targetTrashKg: 1000, activeVolunteers: 115 },
  aktau: { monthlyTrashKg: 820, monthlyTrees: 65, targetTrashKg: 1000, activeVolunteers: 125 },
};

export function getCityProgress(city: KazakhstanCity): CityProgress {
  const seed = CITY_STATS_MAP[city.id] || {
    monthlyTrashKg: 650 + (city.lat * 10) % 500,
    monthlyTrees: 60 + (city.lng * 5) % 80,
    targetTrashKg: 1000,
    activeVolunteers: 85 + (city.lat * 3) % 60,
  };

  return {
    cityId: city.id,
    cityName: city.name,
    monthlyTrashKg: Math.round(seed.monthlyTrashKg),
    monthlyTrees: Math.round(seed.monthlyTrees),
    targetTrashKg: Math.round(seed.targetTrashKg),
    activeVolunteers: Math.round(seed.activeVolunteers),
  };
}

export function getAllCitiesRanking(): CityRankingItem[] {
  const list: CityRankingItem[] = [
    { rank: 1, cityId: 'almaty', cityName: 'Алматы', trashKg: 4280, treesPlanted: 340, totalEcoEarned: 38400, activeVolunteers: 612 },
    { rank: 2, cityId: 'astana', cityName: 'Астана', trashKg: 3840, treesPlanted: 420, totalEcoEarned: 36200, activeVolunteers: 524 },
    { rank: 3, cityId: 'shymkent', cityName: 'Шымкент', trashKg: 2650, treesPlanted: 290, totalEcoEarned: 24800, activeVolunteers: 380 },
    { rank: 4, cityId: 'karaganda', cityName: 'Караганда', trashKg: 1850, treesPlanted: 145, totalEcoEarned: 16500, activeVolunteers: 240 },
    { rank: 5, cityId: 'oskemen', cityName: 'Усть-Каменогорск', trashKg: 1310, treesPlanted: 160, totalEcoEarned: 13200, activeVolunteers: 195 },
    { rank: 6, cityId: 'aktobe', cityName: 'Актобе', trashKg: 1200, treesPlanted: 110, totalEcoEarned: 11400, activeVolunteers: 184 },
    { rank: 7, cityId: 'pavlodar', cityName: 'Павлодар', trashKg: 1120, treesPlanted: 125, totalEcoEarned: 10800, activeVolunteers: 165 },
    { rank: 8, cityId: 'taraz', cityName: 'Тараз', trashKg: 980, treesPlanted: 95, totalEcoEarned: 9100, activeVolunteers: 140 },
    { rank: 9, cityId: 'semey', cityName: 'Семей', trashKg: 940, treesPlanted: 115, totalEcoEarned: 8900, activeVolunteers: 130 },
    { rank: 10, cityId: 'aktau', cityName: 'Актау', trashKg: 820, treesPlanted: 65, totalEcoEarned: 7600, activeVolunteers: 125 },
    { rank: 11, cityId: 'atyrau', cityName: 'Атырау', trashKg: 890, treesPlanted: 80, totalEcoEarned: 7400, activeVolunteers: 120 },
    { rank: 12, cityId: 'kostanay', cityName: 'Костанай', trashKg: 780, treesPlanted: 90, totalEcoEarned: 6900, activeVolunteers: 115 },
  ];

  return list;
}
