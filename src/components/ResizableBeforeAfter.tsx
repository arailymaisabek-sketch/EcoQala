import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Columns2, Sliders, RotateCcw, Sparkles } from 'lucide-react';

interface ResizableBeforeAfterProps {
  beforeUrl: string;
  afterUrl: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
  defaultSplitPercent?: number;
}

export const ResizableBeforeAfter: React.FC<ResizableBeforeAfterProps> = ({
  beforeUrl,
  afterUrl,
  beforeAlt = 'Тазалауға дейін (Before)',
  afterAlt = 'Тазалаудан кейін (After)',
  className = '',
  defaultSplitPercent = 50,
}) => {
  const [splitPercent, setSplitPercent] = useState<number>(defaultSplitPercent);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const clampedPercent = Math.min(95, Math.max(5, (offsetX / rect.width) * 100));
    setSplitPercent(clampedPercent);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSplitFromClientX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      setIsDragging(true);
      updateSplitFromClientX(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateSplitFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      updateSplitFromClientX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, updateSplitFromClientX]);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Controls toolbar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5 font-bold text-stone-700">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Салыстыру көрінісі</span>
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'slider'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
            title="Слайдермен ресайз жасау"
          >
            <Sliders className="w-3 h-3" />
            <span className="text-[11px]">Слайдер / Ресайз</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'side-by-side'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
            title="Қатар қойып қарау"
          >
            <Columns2 className="w-3 h-3" />
            <span className="text-[11px]">Қатар</span>
          </button>

          {viewMode === 'slider' && splitPercent !== 50 && (
            <button
              type="button"
              onClick={() => setSplitPercent(50)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              title="50/50 қалпына келтіру"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {viewMode === 'slider' ? (
        /* Interactive Resizable Comparison Slider */
        <div
          ref={containerRef}
          className="relative aspect-video w-full rounded-2xl overflow-hidden select-none border border-stone-200 bg-stone-950 shadow-inner group cursor-ew-resize touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* AFTER image (Background layer) */}
          <img
            src={afterUrl}
            alt={afterAlt}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold tracking-wider shadow-sm pointer-events-none">
            КЕЙІН (AFTER)
          </div>

          {/* BEFORE image (Clipped foreground layer) */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
            style={{ width: `${splitPercent}%` }}
          >
            <img
              src={beforeUrl}
              alt={beforeAlt}
              className="absolute inset-y-0 left-0 max-w-none h-full object-cover"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              }}
              draggable={false}
            />
            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[11px] font-bold tracking-wider shadow-sm pointer-events-none">
              ДЕЙІН (BEFORE)
            </div>
          </div>

          {/* Draggable Divider Bar */}
          <div
            className="absolute inset-y-0 z-20 w-1 bg-white shadow-xl pointer-events-none transition-transform"
            style={{ left: `${splitPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-emerald-500 shadow-lg flex items-center justify-center text-stone-700">
              <Sliders className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {/* Helper overlay hint on hover */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium opacity-80 pointer-events-none">
            Слайдерді оңға/солға сырғытып салыстырыңыз ({Math.round(splitPercent)}%)
          </div>
        </div>
      ) : (
        /* Side by Side on Desktop / Vertical Stack on Mobile */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
            <img src={beforeUrl} alt={beforeAlt} className="w-full h-full object-cover" />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-white text-[10px] font-bold">
              ДЕЙІН (BEFORE)
            </div>
          </div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
            <img src={afterUrl} alt={afterAlt} className="w-full h-full object-cover" />
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur text-white text-[10px] font-bold">
              КЕЙІН (AFTER)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
