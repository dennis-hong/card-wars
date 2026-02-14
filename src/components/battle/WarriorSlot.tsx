'use client';

import Image from 'next/image';
import { Grade, BattleWarrior } from '@/types/game';
import { getWarriorById } from '@/data/cards';
import { GRADE_COLORS } from '@/types/game';

export interface FloatingNumber {
  id: string;
  targetId: string;
  value: number;
  type: 'damage' | 'heal' | 'miss' | 'skill';
  isSkill?: boolean;
  skillName?: string;
}

export interface WarriorSlotProps {
  warrior: BattleWarrior;
  isPlayer: boolean;
  isAttacking: boolean;
  isHit: boolean;
  floatingNumbers: FloatingNumber[];
  showSkillName: string | null;
}

function getStatusMeta(type: BattleWarrior['statusEffects'][number]['type']) {
  switch (type) {
    case 'stun':
      return { icon: '💫', label: '기절', showValue: false };
    case 'attack_up':
      return { icon: '⬆️', label: '공격증가', showValue: true };
    case 'defense_up':
      return { icon: '🛡️', label: '방어증가', showValue: true };
    case 'intel_down':
      return { icon: '🧠', label: '지력감소', showValue: true };
    case 'command_down':
      return { icon: '🏳️', label: '통솔감소', showValue: true };
    case 'defense_stack':
      return { icon: '🏰', label: '방어중첩', showValue: true };
    case 'evasion':
      return { icon: '🌿', label: '회피', showValue: false };
    case 'taunt':
      return { icon: '😤', label: '도발', showValue: false };
    case 'tactic_nullify':
      return { icon: '🚫', label: '전법무효', showValue: false };
    case 'back_attack':
      return { icon: '🎯', label: '사거리', showValue: false };
    case 'ultimate_used':
      return { icon: '🌟', label: '궁극사용', showValue: false };
  }
}

function getLaneLabel(lane: BattleWarrior['lane']) {
  return lane === 'front' ? '전위' : lane === 'mid' ? '중위' : '후위';
}

export default function WarriorSlot({
  warrior,
  isPlayer,
  isAttacking,
  isHit,
  floatingNumbers,
  showSkillName,
}: WarriorSlotProps) {
  const card = getWarriorById(warrior.cardId);
  if (!card) return null;

  const hpPercent = warrior.maxHp > 0 ? (warrior.currentHp / warrior.maxHp) * 100 : 0;
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';
  const isDead = !warrior.isAlive;
  const gradeColor = GRADE_COLORS[card.grade as Grade];
  const isLegend = card.grade === 4;

  return (
    <div
      className={`
        relative rounded-xl p-1.5 sm:p-2 text-center w-[92px] sm:w-[100px] transition-all duration-300
        ${isDead ? 'opacity-40 grayscale' : 'opacity-100'}
        ${isAttacking ? 'z-10' : ''}
      `}
      style={{
        animation: isAttacking
          ? (isPlayer ? 'attackLunge 0.2s ease-out' : 'attackLungeDown 0.2s ease-out')
          : isHit
          ? 'hitShake 0.15s ease-out'
          : isDead
          ? 'deathFade 0.3s ease-out forwards'
          : 'none',
        background: isAttacking
          ? 'rgba(255,200,0,0.15)'
          : isPlayer
          ? 'rgba(30,58,138,0.5)'
          : 'rgba(127,29,29,0.5)',
        backdropFilter: 'blur(8px)',
        border: isAttacking
          ? `2px solid rgba(255,200,0,0.8)`
          : `2px solid ${gradeColor}66`,
        boxShadow: isAttacking
          ? '0 0 20px rgba(255,200,0,0.6), 0 0 40px rgba(255,200,0,0.3)'
          : isHit
          ? '0 0 15px rgba(255,0,0,0.5)'
          : isLegend
          ? `0 0 12px ${gradeColor}44`
          : 'none',
      }}
    >
      {floatingNumbers.map((fn) => (
        <div
          key={fn.id}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20 font-black text-xl"
          style={{
            animation: 'damageFloat 0.4s ease-out forwards',
            color:
              fn.type === 'heal'
                ? '#4ade80'
                : fn.type === 'miss'
                  ? '#9ca3af'
                  : fn.isSkill
                    ? '#a78bfa'
                    : '#ef4444',
            textShadow: '0 0 10px currentColor, 0 2px 6px rgba(0,0,0,0.9)',
            top: '-12px',
          }}
        >
          {fn.type === 'heal' ? `+${fn.value}` : fn.type === 'miss' ? 'MISS' : `-${fn.value}`}
        </div>
      ))}

      {showSkillName && (
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 pointer-events-none"
          style={{ animation: 'skillPopup 0.5s ease-out forwards' }}
        >
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">
            {showSkillName}
          </span>
        </div>
      )}

      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl bg-black/40">
          <span className="text-3xl">💀</span>
        </div>
      )}

      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold border
        ${warrior.lane === 'front' ? 'bg-red-900/80 border-red-500/50 text-red-300' :
          warrior.lane === 'mid' ? 'bg-yellow-900/80 border-yellow-500/50 text-yellow-300' :
          'bg-blue-900/80 border-blue-500/50 text-blue-300'}`}>
        {getLaneLabel(warrior.lane)}
      </div>

      {(() => {
        const img = card.image;
        return img && !isDead ? (
          <div
            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden mx-auto mt-1"
            style={{ border: `2px solid ${gradeColor}88` }}
          >
            <Image src={img} alt={card.name} fill sizes="(max-width: 640px) 40px, 48px" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="text-xl sm:text-2xl mt-1">{isDead ? '💀' : card.grade === 4 ? '🌟' : '⚔️'}</div>
        );
      })()}

      <div className="text-[11px] sm:text-xs font-bold text-white mt-1 truncate">{card.name}</div>
      <div className="text-[9px] font-medium" style={{ color: `${gradeColor}cc` }}>{card.faction}</div>

      <div className="mt-1.5 h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div className={`h-full ${hpColor} transition-all duration-300 ease-out`} style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="text-[9px] sm:text-[10px] text-white/70 font-medium mt-0.5">
        {warrior.currentHp}/{warrior.maxHp}
      </div>

      <div className="flex justify-center gap-1.5 sm:gap-2 mt-1 text-[9px] sm:text-[10px]">
        <span className="text-red-300 font-bold">⚔️{warrior.stats.attack}</span>
        <span className="text-yellow-300 font-bold">🏰{warrior.stats.defense}</span>
      </div>
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-0.5 text-[8px] sm:text-[9px]">
        <span className="text-sky-300 font-bold">🛡️{warrior.stats.command}</span>
        <span className="text-emerald-300 font-bold">🧠{warrior.stats.intel}</span>
      </div>

      {warrior.statusEffects.filter((e) => e.type !== 'ultimate_used').length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-1">
          {warrior.statusEffects
            .filter((e) => e.type !== 'ultimate_used')
            .map((e, i) => {
              const meta = getStatusMeta(e.type);
              return (
                <span
                  key={`${e.type}-${i}`}
                  className="text-[8px] sm:text-[9px] px-1 py-0.5 rounded border border-white/20 bg-black/40 text-white/90 leading-none"
                  title={`${meta.label} (${e.turnsLeft}턴)`}
                >
                  {meta.icon} {meta.showValue ? `${e.value >= 0 ? '+' : ''}${e.value}` : meta.label} · {e.turnsLeft}T
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}
