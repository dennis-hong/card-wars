'use client';

import { CSSProperties, useMemo } from 'react';
import Image from 'next/image';
import { BattleState, Deck } from '@/types/game';
import { getTacticById } from '@/data/cards';
import { TACTIC_IMAGES } from '@/lib/tactic-images';

export interface TacticPreview {
  title: string;
  lines: string[];
  warnings: string[];
}

type AnimState = 'activating' | 'fading' | 'removed';

interface Props {
  battle: BattleState;
  deck: Deck;
  animating: boolean;
  tacticAnimState: Record<number, AnimState>;
  tacticPreview: TacticPreview | null;
  onSelectTactic: (index: number) => void;
  onConfirmTactic: () => Promise<void>;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 999.97) * 10000;
  return x - Math.floor(x);
}

function isBonusTactic(index: number, deck: Deck, state: BattleState) {
  if (state.player.tactics.length === deck.tactics.length) {
    return index >= deck.tactics.length;
  }

  // Keep behavior compatible with existing bonus check logic.
  return index >= deck.tactics.length;
}

export default function TacticPanel({
  battle,
  deck,
  animating,
  tacticAnimState,
  tacticPreview,
  onSelectTactic,
  onConfirmTactic,
}: Props) {
  const hasAvailableTactics = useMemo(() => {
    return battle.player.tactics.some((t, i) => !t.used && tacticAnimState[i] !== 'removed');
  }, [battle.player.tactics, tacticAnimState]);

  return battle.phase === 'tactic' && !battle.result ? (
    <div className="relative z-10 mt-3 sm:mt-4 bg-black/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
      {hasAvailableTactics ? (
        <div className="text-center text-xs sm:text-sm text-gray-200 mb-2.5 sm:mb-3 font-bold">전법 카드 선택 <span className="text-gray-400 font-normal">(선택사항)</span></div>
      ) : (
        <div className="text-center text-xs sm:text-sm text-gray-400 mb-2.5 sm:mb-3 font-bold">사용 가능한 전법 없음</div>
      )}
      {hasAvailableTactics && battle.player.tactics.length > deck.tactics.length && (
        <div className="text-center text-[10px] text-green-300/80 mb-2 flex items-center justify-center gap-1">
          <span>📜</span> 손권 용병술: 전법 카드 +1장 추가!
        </div>
      )}

      <div className="flex justify-center gap-2.5 sm:gap-3 mb-3 sm:mb-4" style={{ transition: 'all 0.4s ease' }}>
        {battle.player.tactics.map((t, i) => {
          const tc = getTacticById(t.cardId);
          if (!tc) return null;
          const animState = tacticAnimState[i];
          const bonus = isBonusTactic(i, deck, battle);
          if (animState === 'removed') return null;
          if (bonus && t.used) return null;

          return (
            <button
              key={i}
              onClick={() => onSelectTactic(i)}
              disabled={t.used || !!animState}
              className={`
                relative px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm border-2 min-w-[110px] sm:min-w-[124px]
                ${!animState ? 'transition-all' : ''}
                ${
                  t.used && !animState
                    ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border-gray-700/50'
                    : ''
                }
                ${
                  battle.player.selectedTactic === i && !animState
                    ? 'bg-yellow-900/50 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                    : !t.used && battle.player.selectedTactic !== i && !animState
                      ? 'bg-gray-800/50 text-gray-200 border-gray-600/50 hover:border-gray-400/50 hover:bg-gray-700/50'
                      : ''
                }
              `}
              style={
                animState === 'activating'
                  ? {
                      animation: 'tacticActivate 0.4s ease-out forwards',
                      border: '2px solid rgba(255, 200, 0, 0.9)',
                      boxShadow: '0 0 30px rgba(255, 200, 0, 0.7), 0 0 60px rgba(255, 150, 0, 0.4), inset 0 0 20px rgba(255, 200, 0, 0.3)',
                    }
                  : animState === 'fading'
                    ? {
                        animation: 'tacticFadeOut 0.5s ease-in forwards',
                      }
                    : undefined
              }
            >
              {animState === 'activating' && (
                <>
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle, rgba(255,200,0,0.4) 0%, transparent 70%)',
                          animation: 'tacticGlowPulse 0.4s ease-out',
                        }}
                      />
                  {[...Array(8)].map((_, pi) => {
                    const angle = (pi * 45) * Math.PI / 180;
                    const dist = 35 + seededRandom(pi + i * 10 + 1) * 15;
                    const tx = Math.cos(angle) * dist;
                    const ty = Math.sin(angle) * dist;
                    return (
                      <div
                        key={pi}
                        className="absolute pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          width: 5,
                          height: 5,
                          marginLeft: -2.5,
                          marginTop: -2.5,
                          borderRadius: '50%',
                          background: pi % 2 === 0 ? '#ffd700' : '#ff8c00',
                          boxShadow: `0 0 8px ${pi % 2 === 0 ? '#ffd700' : '#ff8c00'}`,
                          animation: `tacticParticleBurst 0.5s ease-out ${pi * 0.03}s forwards`,
                          '--tx': `${tx}px`,
                          '--ty': `${ty}px`,
                        } as CSSProperties}
                      />
                    );
                  })}
                </>
              )}

              {bonus && !animState && (
                <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-green-400/60">
                  보너스
                </div>
              )}

              <div className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-black/45 border border-white/20 text-white/90">
                Lv.{Math.max(1, t.level || 1)}
              </div>

              {TACTIC_IMAGES[tc.id] ? (
                <div className="relative w-8 h-8 mx-auto mb-0.5 rounded overflow-hidden">
                  <Image src={TACTIC_IMAGES[tc.id]} alt={tc.name} fill className="object-cover" sizes="32px" />
                </div>
              ) : (
                <div className="text-base sm:text-lg mb-0.5">전법</div>
              )}
              <div className="font-bold">{tc.name}</div>
              <div className="text-[9px] sm:text-[10px] opacity-60 mt-0.5 sm:block hidden">{tc.description}</div>
            </button>
          );
        })}
      </div>

      {tacticPreview && (
        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-2.5">
          <div className="text-[11px] font-bold text-yellow-200 mb-1">🧭 전법 예상 결과: {tacticPreview.title}</div>
          <div className="space-y-1">
            {tacticPreview.lines.length === 0 && (
              <div className="text-[10px] text-yellow-100/80">직접 효과가 없거나 대상이 없습니다.</div>
            )}
            {tacticPreview.lines.map((line, i) => (
              <div key={`line-${i}`} className="text-[10px] text-yellow-100/90">{line}</div>
            ))}
            {tacticPreview.warnings.map((line, i) => (
              <div key={`warn-${i}`} className="text-[10px] text-red-300">{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mt-2">
        <button
          onClick={onConfirmTactic}
          disabled={animating}
          className="relative px-8 sm:px-10 py-3 sm:py-4 text-white font-black text-base sm:text-lg rounded-xl transition-all disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95 overflow-hidden"
          style={
            !animating
              ? {
                  background: 'linear-gradient(135deg, #dc2626, #f59e0b)',
                  boxShadow: '0 0 20px rgba(220,38,38,0.5), 0 0 40px rgba(245,158,11,0.3), 0 4px 15px rgba(0,0,0,0.3)',
                  animation: 'battleBtnPulse 2s ease-in-out infinite',
                }
              : {
                  background: '#374151',
                }
          }
        >
          {!animating && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
          )}
          <span className="relative z-10">{animating ? '전투 중...' : '⚔️ 전투 개시!'}</span>
        </button>
      </div>
    </div>
  ) : null;
}
