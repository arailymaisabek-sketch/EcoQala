import React, { useState } from 'react';
import { Trophy, Medal, TreePine, Trash2, Sparkles, Building2, Users } from 'lucide-react';
import { KazakhstanCity } from '../types';
import { getLeaderboardForCity } from '../data/leaderboard';
import { getAllCitiesRanking } from '../data/cityStats';

interface LeaderboardViewProps {
  city: KazakhstanCity;
  ecoBalance: number;
  walletAddress: string | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  city,
  ecoBalance,
  walletAddress,
}) => {
  const [subTab, setSubTab] = useState<'cities' | 'users'>('cities');

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : undefined;

  const users = getLeaderboardForCity(city, ecoBalance, shortWallet);
  const citiesRanking = getAllCitiesRanking();

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-4 h-4 text-amber-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-slate-400" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-700" />;
      default:
        return <span className="font-mono text-xs font-bold text-stone-400">#{rank}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Solid Opaque White */}
      <div className="eco-card-solid p-7 rounded-3xl bg-white border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <span>Рейтинг городов и эко-активистов</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Рейтинг экологического вклада городов и участников по всему Казахстану
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl border border-stone-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('cities')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'cities'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Города</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'users'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Активисты ({city.name})</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: National Cities Ranking */}
      {subTab === 'cities' ? (
        <div className="eco-card-solid bg-white border border-stone-200/90 rounded-3xl overflow-hidden divide-y divide-stone-100">
          <div className="px-6 py-3.5 bg-stone-50/80 flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider font-mono">
            <div className="flex items-center gap-6">
              <span>Место</span>
              <span>Город</span>
            </div>
            <div className="flex items-center gap-8 sm:gap-14">
              <span className="hidden sm:inline">Мусор</span>
              <span className="hidden sm:inline">Деревья</span>
              <span>Эко-бонусы</span>
            </div>
          </div>

          {citiesRanking.map((item) => {
            const isCurrentSelectedCity = item.cityId === city.id;
            return (
              <div
                key={item.cityId}
                className={`px-6 py-4 flex items-center justify-between gap-3 transition-colors ${
                  isCurrentSelectedCity
                    ? 'bg-emerald-50/50 border-l-4 border-emerald-500'
                    : 'hover:bg-stone-50/60'
                }`}
              >
                {/* Left */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                    {getRankBadge(item.rank)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900">
                        {item.cityName}
                      </span>
                      {isCurrentSelectedCity && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-mono">
                          Ваш город
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 sm:hidden mt-0.5">
                      {item.trashKg.toLocaleString('ru-RU')} кг · {item.treesPlanted} деревьев
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-8 sm:gap-14 text-right shrink-0">
                  <div className="hidden sm:block text-xs font-mono font-semibold text-stone-700">
                    {item.trashKg.toLocaleString('ru-RU')} кг
                  </div>
                  <div className="hidden sm:block text-xs font-mono font-bold text-emerald-600">
                    {item.treesPlanted} шт
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-emerald-600">
                      {item.totalEcoEarned.toLocaleString('ru-RU')} ECO
                    </div>
                    <div className="text-[11px] text-stone-400 font-medium">
                      {item.activeVolunteers} активистов
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Sub-tab 2: Local Activists */
        <div className="eco-card-solid bg-white border border-stone-200/90 rounded-3xl overflow-hidden divide-y divide-stone-100">
          {users.map((user) => (
            <div
              key={user.rank + user.name}
              className={`p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-3 transition-colors ${
                user.isCurrentUser
                  ? 'bg-emerald-50/50 border-l-4 border-emerald-500'
                  : 'hover:bg-stone-50/60'
              }`}
            >
              {/* User info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                  {getRankBadge(user.rank)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900 truncate">
                      {user.name}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      ({user.walletShort})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                      <span>{user.trashKg} кг</span>
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="flex items-center gap-1">
                      <TreePine className="w-3.5 h-3.5 text-emerald-600 animate-tree-sway origin-bottom" />
                      <span>{user.treesPlanted} деревьев</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Reward */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-emerald-600 flex items-center justify-end gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{user.earnedEco} ECO</span>
                </div>
                <div className="text-xs text-stone-400 font-medium">
                  Ранг #{user.rank}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
