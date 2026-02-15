'use client';

import Image from 'next/image';
import { getRelicById } from '@/lib/roguelike/relics';

interface Props {
  relicIds: string[];
  size?: 'sm' | 'md' | 'lg';
}

export default function RelicDisplay({ relicIds, size = 'md' }: Props) {
  const className =
    size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'lg' ? 'text-xs' : 'text-[10px]';

  if (relicIds.length === 0) {
    return (
      <div className="text-gray-400 text-sm">보유 보물 없음</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {relicIds.map((relicId) => {
        const relic = getRelicById(relicId);
        if (!relic) return null;
        return (
          <div
            key={relicId}
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-black/30 px-2 py-1 min-w-0"
          >
            <div className={`${className} relative shrink-0 rounded-md overflow-hidden border border-white/20 bg-black/60`}>
              <Image
                src={`/images/relics/${relicId}.png`}
                alt={relic.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <span className={`text-white font-bold truncate ${textSize}`}>{relic.name}</span>
          </div>
        );
      })}
    </div>
  );
}
