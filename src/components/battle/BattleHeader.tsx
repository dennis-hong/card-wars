'use client';

import { BattleState } from '@/types/game';

interface HPFrame {
  playerHp: number;
  enemyHp: number;
  diff: number;
}

interface FieldEffectSummary {
  applied: string[];
  pending: string[];
}

interface Props {
  battle: BattleState;
  hpRace: HPFrame;
  onExit: () => void;
  onToggleLog: () => void;
  fieldEffectSummary: FieldEffectSummary;
}

export default function BattleHeader({
  battle,
  hpRace,
  onExit,
  onToggleLog,
  fieldEffectSummary,
}: Props) {
  return (
    <>
      <div className="relative z-10 flex justify-between items-center mb-2.5 sm:mb-3 bg-black/30 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 border border-white/10">
        <button onClick={onExit} className="text-gray-300 text-xs sm:text-sm hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
          ← 퇴각
        </button>
        <div className="text-center">
          <div className="text-white font-black text-base sm:text-lg tracking-wide">턴 {battle.turn}/{battle.maxTurns}</div>
          <div className="text-[9px] sm:text-[10px] text-yellow-200/80">
            승패 규칙: {battle.maxTurns}턴 종료 시 총 HP 높은 쪽 승리
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-200/80 mt-0.5">
            HP 합산: <span className="text-blue-300">아군 {hpRace.playerHp}</span> vs <span className="text-red-300">적군 {hpRace.enemyHp}</span>
            <span className={`ml-1 font-bold ${hpRace.diff >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              ({hpRace.diff >= 0 ? '+' : ''}{hpRace.diff})
            </span>
          </div>
        </div>
        <button
          onClick={onToggleLog}
          className="text-gray-300 text-xs sm:text-sm hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
        >
          📜 로그
        </button>
      </div>

      <div className="relative z-10 bg-amber-900/40 backdrop-blur-sm border border-amber-500/30 rounded-xl p-2 mb-3 sm:mb-4 text-center">
        <div className="text-xs text-amber-300 font-bold">⚡ {battle.fieldEvent.name}</div>
        <div className="text-[10px] text-amber-200/60">{battle.fieldEvent.description}</div>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {fieldEffectSummary.applied.length > 0
            ? fieldEffectSummary.applied.map((line, i) => (
              <span
                key={`applied-${i}`}
                className="text-[10px] px-2 py-0.5 rounded-full border border-green-400/30 bg-green-900/30 text-green-200"
              >
                적용: {line}
              </span>
            ))
            : (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-500/30 bg-gray-800/40 text-gray-300">적용 수치 없음</span>
            )}
          {fieldEffectSummary.pending.map((line, i) => (
            <span key={`pending-${i}`} className="text-[10px] px-2 py-0.5 rounded-full border border-red-400/30 bg-red-900/25 text-red-200">
              참고: {line}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
