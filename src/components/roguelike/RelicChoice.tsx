'use client';

import Image from 'next/image';
import { getRelicById } from '@/lib/roguelike/relics';

interface Props {
  relicIds: string[];
  selectedRelicId: string | null;
  onSelect: (relicId: string) => void;
  label?: string;
}

export default function RelicChoice({ relicIds, selectedRelicId, onSelect, label = '보물 선택' }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-yellow-200">{label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {relicIds.map((relicId) => {
          const relic = getRelicById(relicId);
          if (!relic) return null;
          const isActive = relicId === selectedRelicId;
          return (
            <button
              key={relicId}
              type="button"
              onClick={() => onSelect(relicId)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? 'border-yellow-400 bg-yellow-900/40 shadow-lg shadow-yellow-500/20'
                  : 'border-white/15 bg-black/25 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="w-11 h-11 relative shrink-0 rounded-md overflow-hidden border border-white/20 bg-black/40">
                  <Image
                    src={`/images/relics/${relicId}.png`}
                    alt={relic.name}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                </div>
                <div>
                  <div className="font-bold text-yellow-200 text-sm">{relic.name}</div>
                  <div className="text-xs text-gray-300 line-clamp-2">{relic.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
