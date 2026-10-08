import React, { useState } from 'react';
import { TreePine, Trash2, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import { EcoQuest, KazakhstanCity, QuestCategory } from '../types';

interface QuestsViewProps {
  city: KazakhstanCity;
  quests: EcoQuest[];
  onSelectQuestForScan: (quest: EcoQuest) => void;
}

export const QuestsView: React.FC<QuestsViewProps> = ({
  city,
  quests,
  onSelectQuestForScan,
}) => {
  const [activeCategory, setActiveCategory] = useState<QuestCategory>('all');

  const filtered = quests.filter((q) => {
    if (activeCategory === 'all') return true;
    return q.category === activeCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner: Solid Opaque White */}
      <div className="eco-card-solid p-7 rounded-3xl bg-white border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-sparkle-twinkle" />
            <span>Эко-Задания города {city.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Выбирайте задание, убирайте мусор или сажайте деревья и получайте эко-бонусы.
          </p>
        </div>

        <div className="text-xs text-stone-600 font-mono shrink-0 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200/80">
          Доступно: <strong className="text-stone-900 font-bold">{filtered.length}</strong> заданий
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Все задания' },
          { id: 'trash', label: 'Сбор мусора' },
          { id: 'trees', label: 'Посадка деревьев' },
          { id: 'patrol', label: 'Эко-патруль' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id as QuestCategory)}
            className={`py-2 px-4 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              activeCategory === tab.id
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quests Grid: Large white blocks with green icons, clear reward & bright "Выполнить" button */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((quest) => (
          <div
            key={quest.id}
            className="eco-card-interactive p-6 rounded-3xl bg-white border border-stone-200/80 shadow-sm flex flex-col justify-between group"
          >
            <div>
              {/* Category Icon and Reward */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                  {quest.category === 'trees' ? (
                    <TreePine className="w-6 h-6 stroke-[2] animate-tree-sway origin-bottom" />
                  ) : quest.category === 'patrol' ? (
                    <ShieldCheck className="w-6 h-6 stroke-[2]" />
                  ) : (
                    <Trash2 className="w-6 h-6 stroke-[2]" />
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block px-3.5 py-1 rounded-full text-sm font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100">
                    +{quest.rewardEco} ECO
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-stone-900 mb-2 leading-snug group-hover:text-emerald-700 transition-colors">
                {quest.title}
              </h3>
              <p className="text-xs text-stone-700 font-normal leading-relaxed mb-5 line-clamp-3">
                {quest.description}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{quest.locationName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium pt-0.5">
                  <span>Цель: {quest.impactMetric}</span>
                  <span>{quest.participantsCount} активистов</span>
                </div>
              </div>

              {/* Bright action button */}
              <button
                type="button"
                onClick={() => onSelectQuestForScan(quest)}
                className="eco-btn-interactive w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Выполнить</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
