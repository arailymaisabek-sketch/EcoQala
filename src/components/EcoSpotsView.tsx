import React from 'react';
import { MapPin, Recycle, TreePine, BatteryCharging, Clock, CheckCircle } from 'lucide-react';
import { EcoSpot, KazakhstanCity } from '../types';
import { getEcoSpotsForCity } from '../data/ecoSpots';

interface EcoSpotsViewProps {
  city: KazakhstanCity;
}

export const EcoSpotsView: React.FC<EcoSpotsViewProps> = ({ city }) => {
  const spots = getEcoSpotsForCity(city);

  const getSpotIcon = (type: EcoSpot['type']) => {
    switch (type) {
      case 'recycle_plastic':
        return <Recycle className="w-4 h-4 text-emerald-400" />;
      case 'recycle_all':
        return <Recycle className="w-4 h-4 text-blue-400" />;
      case 'nursery_trees':
        return <TreePine className="w-4 h-4 text-emerald-400" />;
      case 'eco_box':
        return <BatteryCharging className="w-4 h-4 text-amber-400" />;
      default:
        return <MapPin className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Экологические точки и пункты приёма ({city.name})</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Официальные локации сдачи вторсырья, лесопитомники и эко-боксы для сбора
          </p>
        </div>
        <div className="text-[11px] font-mono text-neutral-400">
          {spots.length} точки онлайн
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {spots.map((spot) => (
          <div
            key={spot.id}
            className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 hover:border-neutral-700 transition-all space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-center shrink-0">
                {getSpotIcon(spot.type)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold text-white leading-snug">
                  {spot.name}
                </h3>
                <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span className="truncate">{spot.address}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-2 border-t border-neutral-850">
              <Clock className="w-3 h-3 text-neutral-400" />
              <span>{spot.schedule}</span>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                Принимаемые фракции:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {spot.accepts.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
