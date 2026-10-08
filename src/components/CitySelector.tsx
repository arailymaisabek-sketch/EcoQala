import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Navigation, ChevronDown, Check } from 'lucide-react';
import { KazakhstanCity } from '../types';
import { KAZAKHSTAN_CITIES, findClosestCity } from '../data/cities';

interface CitySelectorProps {
  selectedCity: KazakhstanCity;
  onSelectCity: (city: KazakhstanCity) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  selectedCity,
  onSelectCity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = KAZAKHSTAN_CITIES.filter((city) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      city.name.toLowerCase().includes(q) ||
      city.nameKz.toLowerCase().includes(q) ||
      city.region.toLowerCase().includes(q)
    );
  });

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Геолокация не поддерживается вашим браузером');
      setTimeout(() => setGeoMessage(null), 3000);
      return;
    }

    setIsDetectingLocation(true);
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const closest = findClosestCity(latitude, longitude);
        onSelectCity(closest);
        setIsDetectingLocation(false);
        setGeoMessage(`Определено по GPS: ${closest.name}`);
        setTimeout(() => {
          setGeoMessage(null);
          setIsOpen(false);
        }, 1600);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsDetectingLocation(false);
        setGeoMessage('Доступ к GPS заблокирован. Выберите город из списка.');
        setTimeout(() => setGeoMessage(null), 3500);
      },
      { timeout: 7000 }
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/40 text-stone-800 shadow-sm hover:shadow transition-all cursor-pointer text-xs"
        title="Сменить город Казахстана"
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-semibold text-stone-900 tracking-tight">{selectedCity.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white border border-stone-200 shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <span className="text-xs font-bold text-stone-800">
              Города Казахстана
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              {KAZAKHSTAN_CITIES.length} городов
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск города (Алматы, Астана...)"
              autoFocus
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Auto-detect button */}
          <button
            type="button"
            onClick={handleAutoDetectLocation}
            disabled={isDetectingLocation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-700 border border-emerald-200/80 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
            <span>
              {isDetectingLocation
                ? 'Определяем координаты...'
                : 'Определить город автоматически (GPS)'}
            </span>
          </button>

          {geoMessage && (
            <div className="text-[11px] text-center text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200">
              {geoMessage}
            </div>
          )}

          {/* Cities List */}
          <div className="max-h-60 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-stone-200">
            {filteredCities.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                Город не найден в списке
              </div>
            ) : (
              filteredCities.map((city) => {
                const isSelected = selectedCity.id === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onSelectCity(city);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-900">{city.name}</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          · {city.nameKz}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {city.region}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
