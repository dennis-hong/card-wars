'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { BattleState, BattleWarrior, BattleAction, Deck, OwnedCard, CombatEvent, GRADE_COLORS, Grade } from '@/types/game';
import { getWarriorById, getTacticById } from '@/data/cards';
import { getWarriorImage } from '@/lib/warrior-images';
import { initBattle, applyTactic, resolveCombat, selectAITactic } from '@/lib/battle-engine';
import { SFX } from '@/lib/sound';

interface Props {
  deck: Deck;
  ownedCards: OwnedCard[];
  wins: number;
  onBattleEnd: (result: 'win' | 'lose' | 'draw') => void;
  onExit: () => void;
  streakReward?: { type: string; streak: number } | null;
}

// ─── Floating Damage Number ───
interface FloatingNumber {
  id: string;
  targetId: string;
  value: number;
  type: 'damage' | 'heal' | 'miss' | 'skill';
  isSkill?: boolean;
  skillName?: string;
}

// ─── Live Log Entry ───
interface LiveLogEntry {
  id: number;
  text: string;
  timestamp: number;
}

interface TacticPreview {
  title: string;
  lines: string[];
  warnings: string[];
}

interface TargetForecastRow {
  attackerSide: 'player' | 'enemy';
  lane: 'front' | 'mid' | 'back';
  attackerName: string;
  targetName: string;
}

let floatCounter = 0;
let logCounter = 0;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 7919.31) * 10000;
  return x - Math.floor(x);
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

function getFirstAlive(warriors: BattleWarrior[]) {
  const order: Array<'front' | 'mid' | 'back'> = ['front', 'mid', 'back'];
  for (const lane of order) {
    const target = warriors.find((w) => w.lane === lane && w.isAlive);
    if (target) return target;
  }
  return undefined;
}

function getForecastTarget(enemies: BattleWarrior[]) {
  const taunter = enemies.find((w) => w.isAlive && w.statusEffects.some((e) => e.type === 'taunt' && e.turnsLeft > 0));
  if (taunter) return taunter;
  return getFirstAlive(enemies);
}

function getFieldEffectSummary(effect: string): { applied: string[]; pending: string[] } {
  switch (effect) {
    case 'defense_plus_2':
      return { applied: ['전 무장 방어 +2'], pending: [] };
    case 'attack_plus_2':
      return { applied: ['전 무장 무력 +2'], pending: [] };
    case 'front_defense_plus_3':
      return { applied: ['전위 방어 +3'], pending: [] };
    case 'back_attack_minus_2':
      return { applied: ['후위 무력 -2 (최소 1)'], pending: [] };
    case 'morale_boost':
      return { applied: ['전 무장 무력 +1'], pending: [] };
    case 'wu_bonus':
      return { applied: ['오 세력 전 스탯 +1'], pending: [] };
    case 'fire_boost':
      return { applied: ['화공 데미지 x2'], pending: [] };
    case 'disable_fire':
      return { applied: ['화공 무효화'], pending: [] };
    case 'skip_front_first_turn':
      return { applied: ['1턴 전위 행동 불가 (아군/적군)'], pending: [] };
    case 'ambush_boost':
      return { applied: ['매복 사용 시 아군 전체 회피 부여'], pending: [] };
    default:
      return { applied: [], pending: [] };
  }
}

function WarriorSlot({
  warrior,
  isPlayer,
  isAttacking,
  isHit,
  floatingNumbers,
  showSkillName,
}: {
  warrior: BattleWarrior;
  isPlayer: boolean;
  isAttacking: boolean;
  isHit: boolean;
  floatingNumbers: FloatingNumber[];
  showSkillName: string | null;
}) {
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
      {/* Floating damage/heal numbers */}
      {floatingNumbers.map((fn) => (
        <div
          key={fn.id}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20 font-black text-xl"
          style={{
            animation: 'damageFloat 0.4s ease-out forwards',
            color:
              fn.type === 'heal' ? '#4ade80' :
              fn.type === 'miss' ? '#9ca3af' :
              fn.isSkill ? '#a78bfa' : '#ef4444',
            textShadow: '0 0 10px currentColor, 0 2px 6px rgba(0,0,0,0.9)',
            top: '-12px',
          }}
        >
          {fn.type === 'heal' ? `+${fn.value}` : fn.type === 'miss' ? 'MISS' : `-${fn.value}`}
        </div>
      ))}

      {/* Skill name popup */}
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

      {/* Death overlay */}
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl bg-black/40">
          <span className="text-3xl">💀</span>
        </div>
      )}

      {/* Lane label */}
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold border
        ${warrior.lane === 'front' ? 'bg-red-900/80 border-red-500/50 text-red-300' :
          warrior.lane === 'mid' ? 'bg-yellow-900/80 border-yellow-500/50 text-yellow-300' :
          'bg-blue-900/80 border-blue-500/50 text-blue-300'}`}>
        {warrior.lane === 'front' ? '전위' : warrior.lane === 'mid' ? '중위' : '후위'}
      </div>

      {/* Portrait */}
      {(() => {
        const img = getWarriorImage(warrior.cardId);
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

      {/* Name + faction */}
      <div className="text-[11px] sm:text-xs font-bold text-white mt-1 truncate">{card.name}</div>
      <div className="text-[9px] font-medium" style={{ color: `${gradeColor}cc` }}>{card.faction}</div>

      {/* HP bar */}
      <div className="mt-1.5 h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full ${hpColor} transition-all duration-300 ease-out`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className="text-[9px] sm:text-[10px] text-white/70 font-medium mt-0.5">
        {warrior.currentHp}/{warrior.maxHp}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-1 text-[9px] sm:text-[10px]">
        <span className="text-red-300 font-bold">⚔️{warrior.stats.attack}</span>
        <span className="text-yellow-300 font-bold">🏰{warrior.stats.defense}</span>
      </div>
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-0.5 text-[8px] sm:text-[9px]">
        <span className="text-sky-300 font-bold">🛡️{warrior.stats.command}</span>
        <span className="text-emerald-300 font-bold">🧠{warrior.stats.intel}</span>
      </div>

      {/* Status effects with turns/value for strategy readability */}
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

// ─── Slash Effect Component ───
function SlashEffect({ style, side }: {
  style: React.CSSProperties;
  side: 'player' | 'enemy';
}) {
  return (
    <div style={style} className="pointer-events-none">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: side === 'player'
            ? 'linear-gradient(90deg, transparent, rgba(100,180,255,0.9), rgba(200,230,255,0.95), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,100,100,0.9), rgba(255,200,200,0.95), transparent)',
          animation: 'slashTravel 0.12s ease-out forwards',
          boxShadow: side === 'player'
            ? '0 0 8px rgba(100,180,255,0.6), 0 0 16px rgba(100,180,255,0.3)'
            : '0 0 8px rgba(255,100,100,0.6), 0 0 16px rgba(255,100,100,0.3)',
        }}
      />
    </div>
  );
}

export default function BattleArena({ deck, ownedCards, wins, onBattleEnd, onExit, streakReward }: Props) {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [targetForecastSide, setTargetForecastSide] = useState<'player' | 'enemy'>('player');
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [skillNames, setSkillNames] = useState<Record<string, string>>({});
  const [skillBanner, setSkillBanner] = useState<{ warriorName: string; skillName: string; side: 'player' | 'enemy' } | null>(null);
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitId, setHitId] = useState<string | null>(null);
  const [showFieldEvent, setShowFieldEvent] = useState(true);
  const [showSynergy, setShowSynergy] = useState(false);
  const [showUltimate, setShowUltimate] = useState<{ cardId: string; skillName: string } | null>(null);
  const [turnAnnounce, setTurnAnnounce] = useState<string | null>(null);
  const [tacticAnnounce, setTacticAnnounce] = useState<{ name: string; emoji: string; side: 'player' | 'enemy' } | null>(null);
  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([]);
  const [slashEffect, setSlashEffect] = useState<{ style: React.CSSProperties; side: 'player' | 'enemy' } | null>(null);
  // Tactic card animation: 'activating' = glow+fly, 'fading' = shrink+fade, 'removed' = hidden
  const [tacticAnimState, setTacticAnimState] = useState<Record<number, 'activating' | 'fading' | 'removed'>>({});
  const tacticAnimRef = useRef<Record<number, 'activating' | 'fading' | 'removed'>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const warriorRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setTacticAnim = useCallback((idx: number, state: 'activating' | 'fading' | 'removed') => {
    tacticAnimRef.current = { ...tacticAnimRef.current, [idx]: state };
    setTacticAnimState(prev => ({ ...prev, [idx]: state }));
  }, []);

  const addLiveLog = useCallback((text: string) => {
    const entry: LiveLogEntry = { id: ++logCounter, text, timestamp: Date.now() };
    setLiveLog(prev => {
      const next = [...prev, entry];
      // Keep a longer stack for better situational awareness.
      return next.slice(-6);
    });
  }, []);

  // Fade out old log entries
  useEffect(() => {
    if (liveLog.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLiveLog(prev => prev.filter(e => now - e.timestamp < 5000));
    }, 500);
    return () => clearInterval(interval);
  }, [liveLog.length]);

  useEffect(() => {
    const b = initBattle(deck, ownedCards, wins);
    setBattle(b);

    // Show field event banner first, then synergy sequentially (no overlap)
    setShowFieldEvent(true);
    const t1 = setTimeout(() => setShowFieldEvent(false), 1200);

    // Show synergy AFTER field event disappears
    if (b.activeSynergies && b.activeSynergies.length > 0) {
      const t2 = setTimeout(() => setShowSynergy(true), 1400);
      const t3 = setTimeout(() => setShowSynergy(false), 2600);
      timerRef.current.push(t2, t3);
    }

    timerRef.current.push(t1);
    const timers = [...timerRef.current];
    return () => timers.forEach(clearTimeout);
  }, [deck, ownedCards, wins]);

  // Apply combat events to display state (floating numbers + skill names)
  const showCombatEvents = useCallback((events: CombatEvent[]) => {
    const newFloats: FloatingNumber[] = [];
    const newSkills: Record<string, string> = {};

    for (const ev of events) {
      if (ev.type === 'damage') {
        newFloats.push({
          id: `f-${++floatCounter}`,
          targetId: ev.targetInstanceId,
          value: ev.value || 0,
          type: 'damage',
          isSkill: ev.isSkillDamage,
        });
      } else if (ev.type === 'heal') {
        newFloats.push({
          id: `f-${++floatCounter}`,
          targetId: ev.targetInstanceId,
          value: ev.value || 0,
          type: 'heal',
        });
      } else if (ev.type === 'miss') {
        newFloats.push({
          id: `f-${++floatCounter}`,
          targetId: ev.targetInstanceId,
          value: 0,
          type: 'miss',
        });
      } else if (ev.type === 'skill' && ev.skillName) {
        newSkills[ev.targetInstanceId] = ev.skillName;
      }
    }

    if (newFloats.length > 0) {
      setFloatingNumbers(newFloats);
      setTimeout(() => setFloatingNumbers([]), 450);
    }

    if (Object.keys(newSkills).length > 0) {
      setSkillNames(newSkills);
      setTimeout(() => setSkillNames({}), 600);
    }
  }, []);

  // ─── Sequential Action Playback ───
  const playActions = useCallback(async (
    actions: BattleAction[],
    finalState: BattleState,
  ) => {
    const allWarriors = [...finalState.player.warriors, ...finalState.enemy.warriors];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      switch (action.type) {
        case 'turn_start': {
          setTurnAnnounce(`턴 ${action.turn} 시작!`);
          await delay(350);
          setTurnAnnounce(null);
          break;
        }

        case 'tactic_use': {
          // Find which tactic index was used (player side only for card animation)
          let playerTacticIdx = -1;
          if (action.side === 'player') {
            playerTacticIdx = finalState.player.tactics.findIndex((t) => t.instanceId === action.tacticInstanceId);
            if (playerTacticIdx >= 0) {
              // Phase 1: Activation glow
              setTacticAnim(playerTacticIdx, 'activating');
              await delay(300);
            }
          }

          setTacticAnnounce({ name: action.tacticName, emoji: action.tacticEmoji, side: action.side });
          SFX.skillActivate();
          action.log.forEach(msg => addLiveLog(msg));
          await delay(500);
          setTacticAnnounce(null);
          // Show tactic combat effects
          showCombatEvents(action.events);

          // Phase 2: Fade out the used player tactic card
          if (playerTacticIdx >= 0) {
            setTacticAnim(playerTacticIdx, 'fading');
            await delay(500);
            setTacticAnim(playerTacticIdx, 'removed');
          }
          await delay(200);
          break;
        }

        case 'passive_skill': {
          setSkillNames({ [action.warriorId]: action.skillName });
          {
            const w = allWarriors.find(w => w.instanceId === action.warriorId);
            const wCard = w ? getWarriorById(w.cardId) : null;
            setSkillBanner({ warriorName: wCard?.name || '', skillName: action.skillName, side: action.side });
          }
          action.log.forEach(msg => addLiveLog(msg));
          await delay(500);
          setSkillNames({});
          setSkillBanner(null);
          break;
        }

        case 'active_skill': {
          setSkillNames({ [action.warriorId]: action.skillName });
          {
            const w = allWarriors.find(w => w.instanceId === action.warriorId);
            const wCard = w ? getWarriorById(w.cardId) : null;
            setSkillBanner({ warriorName: wCard?.name || '', skillName: action.skillName, side: action.side });
          }
          SFX.skillActivate();
          action.log.forEach(msg => addLiveLog(msg));
          showCombatEvents(action.events);
          await delay(500);
          setSkillNames({});
          setSkillBanner(null);
          break;
        }

        case 'ultimate_skill': {
          setShowUltimate({ cardId: action.cardId, skillName: action.skillName });
          SFX.skillActivate();
          action.log.forEach(msg => addLiveLog(msg));
          showCombatEvents(action.events);
          await delay(800);
          setShowUltimate(null);
          break;
        }

        case 'attack': {
          // 1. Highlight attacker
          setAttackingId(action.attackerId);
          SFX.attack();
          await delay(100);

          // 2. Show slash effect
          const attackerEl = warriorRefs.current.get(action.attackerId);
          const targetEl = warriorRefs.current.get(action.targetId);
          if (attackerEl && targetEl) {
            const aRect = attackerEl.getBoundingClientRect();
            const tRect = targetEl.getBoundingClientRect();
            const startX = aRect.left + aRect.width / 2;
            const startY = action.side === 'player' ? aRect.top : aRect.bottom;
            const endX = tRect.left + tRect.width / 2;
            const endY = action.side === 'player' ? tRect.bottom : tRect.top;
            const dx = endX - startX;
            const dy = endY - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            setSlashEffect({
              side: action.side,
              style: {
                position: 'fixed',
                left: startX,
                top: startY,
                width: dist,
                height: 3,
                transformOrigin: '0 50%',
                transform: `rotate(${angle}deg)`,
                zIndex: 40,
              },
            });
          }
          await delay(80);

          // 3. Hit target - shake + damage numbers
          setHitId(action.targetId);
          showCombatEvents(action.events);
          action.log.forEach(msg => addLiveLog(msg));

          // Show skill name if applicable
          if (action.skillName) {
            setSkillNames(prev => ({ ...prev, [action.attackerId]: action.skillName! }));
            const w = allWarriors.find(w => w.instanceId === action.attackerId);
            const wCard = w ? getWarriorById(w.cardId) : null;
            setSkillBanner({ warriorName: wCard?.name || '', skillName: action.skillName, side: action.side });
          }

          // 4. Update warrior HP in displayed state
          setBattle(prev => {
            if (!prev) return prev;
            const next = structuredClone(prev);
            // Apply damage/heal/death from events to displayed state
            for (const ev of action.events) {
              const allW = [...next.player.warriors, ...next.enemy.warriors];
              const w = allW.find(w => w.instanceId === ev.targetInstanceId);
              if (!w) continue;
              if (ev.type === 'damage' && ev.value) {
                w.currentHp = Math.max(0, w.currentHp - ev.value);
                if (w.currentHp <= 0) w.isAlive = false;
              } else if (ev.type === 'heal' && ev.value) {
                w.currentHp = Math.min(w.maxHp, w.currentHp + ev.value);
              } else if (ev.type === 'death') {
                w.isAlive = false;
              }
            }
            return next;
          });

          await delay(350);

          // 5. Clear attack state
          setAttackingId(null);
          setHitId(null);
          setSlashEffect(null);
          setSkillNames({});
          setSkillBanner(null);
          await delay(100);
          break;
        }

        case 'stun_skip': {
          setSkillNames({ [action.warriorId]: '💫 기절' });
          action.log.forEach(msg => addLiveLog(msg));
          await delay(300);
          setSkillNames({});
          break;
        }

        case 'forced_skip': {
          setSkillNames({ [action.warriorId]: '🌙 행동불가' });
          action.log.forEach(msg => addLiveLog(msg));
          await delay(300);
          setSkillNames({});
          break;
        }

        case 'turn_end': {
          // Apply final state with log and result
          setBattle(prev => {
            if (!prev) return prev;
            return {
              ...finalState,
              // Keep partial display state but update result/phase/turn
              result: action.result,
              phase: action.phase,
              turn: action.phase === 'tactic' ? action.newTurn : prev.turn,
              player: {
                ...finalState.player,
                selectedTactic: null,
              },
              enemy: {
                ...finalState.enemy,
                selectedTactic: null,
              },
            };
          });

          if (action.result) {
            action.log.forEach(msg => addLiveLog(msg));
            await delay(500);
            if (action.result === 'win') SFX.victory();
            else if (action.result === 'lose') SFX.defeat();
          }
          break;
        }
      }
    }
  }, [showCombatEvents, addLiveLog, setTacticAnim]);

  const handleSelectTactic = useCallback((index: number) => {
    if (!battle || battle.phase !== 'tactic' || animating) return;
    SFX.buttonClick();
    setBattle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          selectedTactic: prev.player.selectedTactic === index ? null : index,
        },
      };
    });
  }, [battle, animating]);

  const handleConfirmTactic = useCallback(async () => {
    if (!battle || battle.phase !== 'tactic' || animating) return;
    setAnimating(true);

    const allActions: BattleAction[] = [];
    let currentState = structuredClone(battle);

    // Apply player tactic
    if (battle.player.selectedTactic !== null) {
      const result = applyTactic(currentState, 'player', battle.player.selectedTactic);
      currentState = result.state;
      if (result.action) allActions.push(result.action);
    }

    const playerAliveAfterPlayerTactic = currentState.player.warriors.some((w) => w.isAlive);
    const enemyAliveAfterPlayerTactic = currentState.enemy.warriors.some((w) => w.isAlive);

    // AI selects and applies tactic
    if (playerAliveAfterPlayerTactic && enemyAliveAfterPlayerTactic) {
      const aiTactic = selectAITactic(currentState);
      if (aiTactic !== null) {
        const result = applyTactic(currentState, 'enemy', aiTactic);
        currentState = result.state;
        if (result.action) allActions.push(result.action);
      }
    }

    const playerAliveAfterTactics = currentState.player.warriors.some((w) => w.isAlive);
    const enemyAliveAfterTactics = currentState.enemy.warriors.some((w) => w.isAlive);
    if (!playerAliveAfterTactics || !enemyAliveAfterTactics) {
      const result = enemyAliveAfterTactics ? 'lose' as const : 'win' as const;
      const finalState = structuredClone(currentState);
      finalState.result = result;
      finalState.phase = 'result';
      const msg = result === 'win' ? '🎉 승리! 적 전멸!' : '💀 패배... 아군 전멸...';
      finalState.log.push(msg);
      allActions.push({ type: 'turn_end', newTurn: finalState.turn, phase: 'result', result, log: [msg] });
      await playActions(allActions, finalState);
      setAnimating(false);
      return;
    }

    // Resolve combat - get actions
    const combatResult = resolveCombat(currentState);
    allActions.push(...combatResult.actions);

    // Play all actions sequentially
    await playActions(allActions, combatResult.state);

    setAnimating(false);
  }, [battle, animating, playActions]);

  const fieldEffectSummary = useMemo(() => getFieldEffectSummary(battle?.fieldEvent.effect || ''), [battle?.fieldEvent.effect]);

  const tacticPreview = useMemo<TacticPreview | null>(() => {
    if (!battle || battle.phase !== 'tactic' || battle.player.selectedTactic === null) return null;
    const selected = battle.player.tactics[battle.player.selectedTactic];
    if (!selected) return null;
    const tc = getTacticById(selected.cardId);
    if (!tc) return null;
    const tacticLevel = Math.max(1, selected.level || 1);

    const lines: string[] = [];
    const warnings: string[] = [];

    const enemyNullifier = battle.enemy.warriors.find((w) =>
      w.isAlive && w.statusEffects.some((e) => e.type === 'tactic_nullify' && e.turnsLeft > 0)
    );
    if (enemyNullifier) {
      const nullName = getWarriorById(enemyNullifier.cardId)?.name || '적 무장';
      warnings.push(`${nullName} 전법 무효 준비: 이번 전법이 무효화될 수 있습니다.`);
    }

    const enemyCounter = battle.enemy.tactics.find((t) => t.cardId === 't-counter' && !t.used);
    if (enemyCounter && tc.id !== 't-counter') {
      const aliveCount = battle.player.warriors.filter((w) => w.isAlive).length;
      const reflected = 3 + (Math.max(1, enemyCounter.level || 1) - 1);
      warnings.push(`적 반계 가능: 반사 시 아군 ${aliveCount}명에게 각 ${reflected} 피해 (총 ${aliveCount * reflected}).`);
    }

    switch (tc.id) {
      case 't-fire': {
        if (battle.fieldEvent.effect === 'disable_fire') {
          warnings.push('전장 효과 폭우로 화공이 무효화됩니다.');
          break;
        }
        let dmg = 4 + (tacticLevel - 1);
        if (battle.fieldEvent.effect === 'fire_boost') dmg *= 2;
        if (battle.player.warriors.some((w) => w.cardId === 'w-zhou-yu' && w.isAlive)) dmg *= 2;
        if (battle.player.warriors.some((w) => w.cardId === 'w-zhuge-liang' && w.isAlive)) dmg *= 2;
        const targetCount = battle.enemy.warriors.filter((w) => w.isAlive).length;
        lines.push(`예상 피해: 적 생존 ${targetCount}명에게 각 ${dmg} (총 ${dmg * targetCount})`);
        break;
      }
      case 't-ambush': {
        const evasionTurns = 1 + Math.floor((tacticLevel - 1) / 5);
        if (battle.fieldEvent.effect === 'ambush_boost') {
          const aliveCount = battle.player.warriors.filter((w) => w.isAlive).length;
          lines.push(`예상 효과: 아군 생존 ${aliveCount}명 전체 회피 ${evasionTurns}턴`);
        } else {
          const target = getFirstAlive(battle.player.warriors);
          const name = target ? (getWarriorById(target.cardId)?.name || '아군') : '대상 없음';
          lines.push(`예상 효과: ${name} 회피 ${evasionTurns}턴`);
        }
        break;
      }
      case 't-chain': {
        const target = getFirstAlive(battle.enemy.warriors);
        const name = target ? (getWarriorById(target.cardId)?.name || '적군') : '대상 없음';
        const stunTurns = 1 + Math.floor((tacticLevel - 1) / 6);
        lines.push(`예상 효과: ${name} ${stunTurns}턴 기절`);
        break;
      }
      case 't-taunt': {
        const target = battle.player.warriors.find((w) => w.lane === 'front' && w.isAlive);
        const name = target ? (getWarriorById(target.cardId)?.name || '전위') : '전위 없음';
        const tauntTurns = 1 + Math.floor((tacticLevel - 1) / 6);
        lines.push(`예상 효과: 적 공격을 ${name}에게 ${tauntTurns}턴 집중`);
        break;
      }
      case 't-heal': {
        const alive = battle.player.warriors.filter((w) => w.isAlive);
        if (alive.length > 0) {
          const target = alive.reduce((a, b) => (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b);
          const rawHeal = 5 + (tacticLevel - 1);
          const heal = Math.min(rawHeal, target.maxHp - target.currentHp);
          const name = getWarriorById(target.cardId)?.name || '아군';
          lines.push(`예상 회복: ${name} +${heal} (기본 ${rawHeal})`);
        }
        break;
      }
      case 't-buff': {
        const target = getFirstAlive(battle.player.warriors);
        const name = target ? (getWarriorById(target.cardId)?.name || '아군') : '대상 없음';
        const buffValue = 3 + (tacticLevel - 1);
        const buffTurns = 1 + Math.floor((tacticLevel - 1) / 6);
        lines.push(`예상 효과: ${name} 무력 +${buffValue} (${buffTurns}턴)`);
        break;
      }
      case 't-rockfall': {
        const target = getFirstAlive(battle.enemy.warriors);
        if (target) {
          const name = getWarriorById(target.cardId)?.name || '적군';
          const dmg = Math.max(1, (8 + (tacticLevel - 1)) - target.stats.defense);
          lines.push(`예상 피해: ${name} ${dmg} (방어 ${target.stats.defense} 반영)`);
        }
        break;
      }
      case 't-counter': {
        lines.push('예상 효과: 다음 적 전법 1회 반사 준비');
        break;
      }
    }

    return {
      title: `${tc.emoji} ${tc.name}`,
      lines,
      warnings,
    };
  }, [battle]);

  const targetForecast = useMemo<TargetForecastRow[]>(() => {
    if (!battle || battle.phase !== 'tactic') return [];
    const rows: TargetForecastRow[] = [];
    const lanes: Array<'front' | 'mid' | 'back'> = ['front', 'mid', 'back'];

    for (const lane of lanes) {
      const attacker = battle.player.warriors.find((w) => w.lane === lane && w.isAlive);
      if (!attacker) continue;
      const attackerName = getWarriorById(attacker.cardId)?.name || '아군';
      const fieldBlocked = lane === 'front' && battle.turn === 1 && battle.fieldEvent.effect === 'skip_front_first_turn';
      const stunned = attacker.statusEffects.some((e) => e.type === 'stun' && e.turnsLeft > 0);
      if (fieldBlocked) {
        rows.push({ attackerSide: 'player', lane, attackerName, targetName: '행동불가(야간 기습)' });
      } else if (stunned) {
        rows.push({ attackerSide: 'player', lane, attackerName, targetName: '행동불가(기절)' });
      } else {
        const target = getForecastTarget(battle.enemy.warriors);
        if (target) {
          rows.push({
            attackerSide: 'player',
            lane,
            attackerName,
            targetName: getWarriorById(target.cardId)?.name || '적군',
          });
        }
      }
    }

    for (const lane of lanes) {
      const attacker = battle.enemy.warriors.find((w) => w.lane === lane && w.isAlive);
      if (!attacker) continue;
      const attackerName = getWarriorById(attacker.cardId)?.name || '적군';
      const fieldBlocked = lane === 'front' && battle.turn === 1 && battle.fieldEvent.effect === 'skip_front_first_turn';
      const stunned = attacker.statusEffects.some((e) => e.type === 'stun' && e.turnsLeft > 0);
      if (fieldBlocked) {
        rows.push({ attackerSide: 'enemy', lane, attackerName, targetName: '행동불가(야간 기습)' });
      } else if (stunned) {
        rows.push({ attackerSide: 'enemy', lane, attackerName, targetName: '행동불가(기절)' });
      } else {
        const target = getForecastTarget(battle.player.warriors);
        if (target) {
          rows.push({
            attackerSide: 'enemy',
            lane,
            attackerName,
            targetName: getWarriorById(target.cardId)?.name || '아군',
          });
        }
      }
    }
    return rows;
  }, [battle]);

  const hpRace = useMemo(() => {
    if (!battle) return { playerHp: 0, enemyHp: 0, diff: 0 };
    const playerHp = battle.player.warriors.reduce((sum, w) => sum + Math.max(0, w.currentHp), 0);
    const enemyHp = battle.enemy.warriors.reduce((sum, w) => sum + Math.max(0, w.currentHp), 0);
    return { playerHp, enemyHp, diff: playerHp - enemyHp };
  }, [battle]);

  if (!battle) {
    return <div className="text-white text-center p-8">전투 준비 중...</div>;
  }

  return (
    <div
      className="min-h-screen p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/battle-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes damageFloat {
          0% { opacity: 1; transform: translate(-50%, 0) scale(0.5); }
          15% { opacity: 1; transform: translate(-50%, -8px) scale(1.4); }
          30% { opacity: 1; transform: translate(-50%, -16px) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -50px) scale(0.8); }
        }
        @keyframes skillPopup {
          0% { opacity: 0; transform: translate(-50%, 10px) scale(0.5); }
          15% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
          80% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }
        }
        @keyframes skillBannerAnim {
          0% { opacity: 0; transform: scale(0.5); }
          15% { opacity: 1; transform: scale(1.08); }
          30% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9) translateY(-10px); }
        }
        @keyframes fieldEventBanner {
          0% { opacity: 0; transform: translateY(-20px) scale(0.8); }
          10% { opacity: 1; transform: translateY(0) scale(1.05); }
          20% { transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
        }
        @keyframes synergyPulse {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.1); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        @keyframes ultimateFlash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ultimateText {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
          20% { opacity: 1; transform: translate(-50%,-50%) scale(1.1); }
          40% { transform: translate(-50%,-50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.2); }
        }
        @keyframes streakBounce {
          0% { transform: translateY(100px); opacity: 0; }
          40% { transform: translateY(-10px); opacity: 1; }
          60% { transform: translateY(5px); }
          100% { transform: translateY(0); opacity: 1; }
        }

        /* ─── New battle animations ─── */
        @keyframes attackLunge {
          0% { transform: translateY(0); }
          40% { transform: translateY(-14px) scale(1.08); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes attackLungeDown {
          0% { transform: translateY(0); }
          40% { transform: translateY(14px) scale(1.08); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes hitShake {
          0% { transform: translate(0, 0); }
          15% { transform: translate(-5px, -2px); }
          30% { transform: translate(5px, 2px); }
          45% { transform: translate(-4px, 3px); }
          60% { transform: translate(4px, -2px); }
          75% { transform: translate(-2px, 1px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes deathFade {
          0% { transform: scale(1); filter: brightness(1) grayscale(0); }
          50% { transform: scale(0.95); filter: brightness(1.5) grayscale(0.5); }
          100% { transform: scale(1); filter: brightness(0.6) grayscale(1); opacity: 0.4; }
        }
        @keyframes slashTravel {
          0% { clip-path: inset(0 100% 0 0); opacity: 0.3; }
          30% { clip-path: inset(0 40% 0 0); opacity: 1; }
          70% { clip-path: inset(0 0 0 30%); opacity: 1; }
          100% { clip-path: inset(0 0 0 100%); opacity: 0; }
        }
        @keyframes turnAnnounce {
          0% { opacity: 0; transform: scale(0.5) rotate(-5deg); }
          20% { opacity: 1; transform: scale(1.15) rotate(0deg); }
          40% { transform: scale(1) rotate(0deg); }
          80% { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(0.9) rotate(2deg); }
        }
        @keyframes tacticCardReveal {
          0% { opacity: 0; transform: translateY(30px) scale(0.7) rotateX(15deg); }
          30% { opacity: 1; transform: translateY(-5px) scale(1.05) rotateX(0deg); }
          70% { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
          100% { opacity: 0; transform: translateY(-15px) scale(0.95) rotateX(-5deg); }
        }
        @keyframes liveLogIn {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes liveLogOut {
          0% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes battleBtnPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,0.5), 0 0 40px rgba(245,158,11,0.3), 0 4px 15px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 30px rgba(220,38,38,0.7), 0 0 60px rgba(245,158,11,0.5), 0 4px 20px rgba(0,0,0,0.4); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* ─── Tactic card activation animations ─── */
        @keyframes tacticActivate {
          0% { transform: scale(1); filter: brightness(1); }
          30% { transform: scale(1.15) translateY(-8px); filter: brightness(1.8); }
          60% { transform: scale(1.1) translateY(-12px); filter: brightness(2); }
          100% { transform: scale(1.08) translateY(-10px); filter: brightness(1.6); }
        }
        @keyframes tacticFadeOut {
          0% { opacity: 1; transform: scale(1.08) translateY(-10px); filter: brightness(1.6); }
          30% { opacity: 0.8; transform: scale(1.15) translateY(-20px); filter: brightness(2); }
          60% { opacity: 0.4; transform: scale(0.6) translateY(-30px); filter: brightness(2.5) blur(2px); }
          100% { opacity: 0; transform: scale(0) translateY(-40px); filter: brightness(3) blur(4px); }
        }
        @keyframes tacticGlowPulse {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes tacticParticleBurst {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--tx, 20px), var(--ty, -20px)) scale(0); }
        }
      `}</style>

      {/* Slash Effect Overlay */}
      {slashEffect && (
        <SlashEffect
          style={slashEffect.style}
          side={slashEffect.side}
        />
      )}

      {/* Field Event Full-screen Banner */}
      {showFieldEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ animation: 'fieldEventBanner 1.2s ease-out forwards' }}
        >
          <div className="bg-gradient-to-r from-amber-900/90 via-yellow-800/90 to-amber-900/90 border-2 border-amber-400/50 rounded-2xl px-8 py-6 text-center shadow-2xl shadow-amber-500/20 max-w-sm">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-xl font-black text-amber-300 mb-1">{battle.fieldEvent.name}</div>
            <div className="text-sm text-amber-100/80">{battle.fieldEvent.description}</div>
          </div>
        </div>
      )}

      {/* Synergy Effect Banner */}
      {showSynergy && battle.activeSynergies && battle.activeSynergies.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ animation: 'synergyPulse 1.2s ease-out forwards' }}
        >
          {battle.activeSynergies.map((syn, i) => (
            <div key={i} className="text-center">
              <div className={`text-5xl mb-2 ${
                syn.faction === '위' ? 'text-blue-400' :
                syn.faction === '촉' ? 'text-red-400' :
                syn.faction === '오' ? 'text-green-400' :
                'text-purple-400'
              }`}>
                {syn.faction === '위' ? '🛡️' :
                 syn.faction === '촉' ? '⚔️' :
                 syn.faction === '오' ? '🧠' : '👑'}
              </div>
              <div className="text-xl font-black text-white mb-1">{syn.faction} 세력 시너지!</div>
              <div className={`text-lg font-bold ${
                syn.faction === '위' ? 'text-blue-300' :
                syn.faction === '촉' ? 'text-red-300' :
                syn.faction === '오' ? 'text-green-300' :
                'text-purple-300'
              }`}>
                {syn.effect}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ultimate Skill Overlay */}
      {showUltimate && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70"
            style={{ animation: 'ultimateFlash 0.8s ease-out forwards' }}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ animation: 'ultimateText 0.8s ease-out forwards' }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🌟</div>
              <div className="text-3xl font-black text-yellow-300 mb-2" style={{ textShadow: '0 0 30px rgba(253,224,71,0.5)' }}>
                궁극기 발동!
              </div>
              <div className="text-xl text-yellow-100 font-bold">
                {getWarriorById(showUltimate.cardId)?.name} - {showUltimate.skillName}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Skill Banner Overlay */}
      {skillBanner && !showUltimate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            className="text-center"
            style={{ animation: 'skillBannerAnim 0.5s ease-out forwards' }}
          >
            <div className={`px-6 py-3 rounded-xl border-2 backdrop-blur-sm ${
              skillBanner.side === 'player'
                ? 'bg-blue-900/80 border-blue-400/60'
                : 'bg-red-900/80 border-red-400/60'
            }`}>
              <div className="text-xs font-bold mb-1" style={{ color: skillBanner.side === 'player' ? '#93c5fd' : '#fca5a5' }}>
                {skillBanner.side === 'player' ? '아군' : '적군'} 스킬 발동
              </div>
              <div className="text-lg font-black text-white">{skillBanner.warriorName}</div>
              <div className="text-base font-bold text-purple-300">⚡ {skillBanner.skillName}</div>
            </div>
          </div>
        </div>
      )}

      {/* Turn Announce Overlay */}
      {turnAnnounce && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            className="text-center"
            style={{ animation: 'turnAnnounce 0.35s ease-out forwards' }}
          >
            <div className="text-3xl font-black text-white" style={{ textShadow: '0 0 20px rgba(255,200,0,0.6), 0 2px 8px rgba(0,0,0,0.8)' }}>
              {turnAnnounce}
            </div>
          </div>
        </div>
      )}

      {/* Tactic Card Announce */}
      {tacticAnnounce && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="text-center"
            style={{ animation: 'tacticCardReveal 0.4s ease-out forwards' }}
          >
            <div className={`px-8 py-4 rounded-xl border-2 backdrop-blur-sm shadow-2xl ${
              tacticAnnounce.side === 'player'
                ? 'bg-blue-900/90 border-blue-400/60'
                : 'bg-red-900/90 border-red-400/60'
            }`}>
              <div className="text-xs font-bold mb-1" style={{ color: tacticAnnounce.side === 'player' ? '#93c5fd' : '#fca5a5' }}>
                {tacticAnnounce.side === 'player' ? '아군' : '적군'} 전법
              </div>
              <div className="text-3xl mb-1">{tacticAnnounce.emoji}</div>
              <div className="text-xl font-black text-white">{tacticAnnounce.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
          onClick={() => setShowLog(!showLog)}
          className="text-gray-300 text-xs sm:text-sm hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
        >
          📜 로그
        </button>
      </div>

      {/* Field Event Compact Banner */}
      <div className="relative z-10 bg-amber-900/40 backdrop-blur-sm border border-amber-500/30 rounded-xl p-2 mb-3 sm:mb-4 text-center">
        <div className="text-xs text-amber-300 font-bold">⚡ {battle.fieldEvent.name}</div>
        <div className="text-[10px] text-amber-200/60">{battle.fieldEvent.description}</div>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {fieldEffectSummary.applied.length > 0 ? fieldEffectSummary.applied.map((line, i) => (
            <span key={`applied-${i}`} className="text-[10px] px-2 py-0.5 rounded-full border border-green-400/30 bg-green-900/30 text-green-200">
              적용: {line}
            </span>
          )) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-500/30 bg-gray-800/40 text-gray-300">
              적용 수치 없음
            </span>
          )}
          {fieldEffectSummary.pending.map((line, i) => (
            <span key={`pending-${i}`} className="text-[10px] px-2 py-0.5 rounded-full border border-red-400/30 bg-red-900/25 text-red-200">
              참고: {line}
            </span>
          ))}
        </div>
      </div>

      {/* Enemy synergy */}
      {battle.activeSynergies && battle.activeSynergies.filter(s => s.side === 'enemy').length > 0 && (
        <div className="flex justify-center gap-2 mb-2">
          {battle.activeSynergies.filter(s => s.side === 'enemy').map((syn, i) => (
            <div key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              syn.faction === '위' ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' :
              syn.faction === '촉' ? 'bg-red-900/50 border-red-500/50 text-red-300' :
              syn.faction === '오' ? 'bg-green-900/50 border-green-500/50 text-green-300' :
              'bg-purple-900/50 border-purple-500/50 text-purple-300'
            }`}>
              적 {syn.faction} {'level' in syn && (syn as {level?:string}).level === 'major' ? '대시너지' : '소시너지'}: {syn.effect}
            </div>
          ))}
        </div>
      )}

      {/* Enemy side */}
      <div className="mb-2 text-center text-xs text-red-400 font-bold tracking-widest uppercase">적군</div>
      <div className="flex justify-center gap-2 mb-6">
        {(['front', 'mid', 'back'] as const).map((lane) => {
          const warrior = battle.enemy.warriors.find((w) => w.lane === lane);
          return warrior ? (
            <div
              key={lane}
              ref={(el) => { if (el) warriorRefs.current.set(warrior.instanceId, el); }}
            >
              <WarriorSlot
                warrior={warrior}
                isPlayer={false}
                isAttacking={attackingId === warrior.instanceId}
                isHit={hitId === warrior.instanceId}
                floatingNumbers={floatingNumbers.filter((f) => f.targetId === warrior.instanceId)}
                showSkillName={skillNames[warrior.instanceId] || null}
              />
            </div>
          ) : null;
        })}
      </div>

      {/* VS divider */}
      <div className="relative flex items-center justify-center my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-yellow-500/30" />
        </div>
        <div className="relative px-4 py-1 bg-yellow-900/50 backdrop-blur-sm rounded-full border border-yellow-500/40">
          <span className="text-xl font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(234,179,8,0.4)' }}>⚔️ VS</span>
        </div>
      </div>

      {/* Player side */}
      <div className="mb-2 text-center text-xs text-blue-400 font-bold tracking-widest uppercase">아군</div>
      <div className="flex justify-center gap-2 mb-6">
        {(['front', 'mid', 'back'] as const).map((lane) => {
          const warrior = battle.player.warriors.find((w) => w.lane === lane);
          return warrior ? (
            <div
              key={lane}
              ref={(el) => { if (el) warriorRefs.current.set(warrior.instanceId, el); }}
            >
              <WarriorSlot
                warrior={warrior}
                isPlayer={true}
                isAttacking={attackingId === warrior.instanceId}
                isHit={hitId === warrior.instanceId}
                floatingNumbers={floatingNumbers.filter((f) => f.targetId === warrior.instanceId)}
                showSkillName={skillNames[warrior.instanceId] || null}
              />
            </div>
          ) : null;
        })}
      </div>

      {/* Player synergy */}
      {battle.activeSynergies && battle.activeSynergies.filter(s => s.side === 'player').length > 0 && (
        <div className="flex justify-center gap-2 mb-3">
          {battle.activeSynergies.filter(s => s.side === 'player').map((syn, i) => (
            <div key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              syn.faction === '위' ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' :
              syn.faction === '촉' ? 'bg-red-900/50 border-red-500/50 text-red-300' :
              syn.faction === '오' ? 'bg-green-900/50 border-green-500/50 text-green-300' :
              'bg-purple-900/50 border-purple-500/50 text-purple-300'
            }`}>
              아군 {syn.faction} {'level' in syn && (syn as {level?:string}).level === 'major' ? '대시너지' : '소시너지'}: {syn.effect}
            </div>
          ))}
        </div>
      )}

      {/* Live Battle Log (top-right toast) */}
      {liveLog.length > 0 && (
        <div className="fixed top-20 right-3 sm:right-4 z-30 pointer-events-none space-y-1 w-[58vw] sm:w-[320px] max-w-[320px]">
          {liveLog.map((entry) => {
            const age = Date.now() - entry.timestamp;
            const isFading = age > 3800;
            return (
              <div
                key={entry.id}
                className="text-[11px] sm:text-xs px-2.5 py-1.5 bg-black/72 border border-gray-600/45 rounded-lg text-gray-200 backdrop-blur-sm text-right leading-tight truncate"
                style={{
                  animation: isFading
                    ? 'liveLogOut 0.5s ease-out forwards'
                    : 'liveLogIn 0.3s ease-out',
                }}
              >
                {entry.text}
              </div>
            );
          })}
        </div>
      )}

      {/* Tactic Phase Controls */}
      {battle.phase === 'tactic' && !battle.result && (() => {
        const availableTactics = battle.player.tactics.filter((t, i) => !t.used && tacticAnimState[i] !== 'removed');
        const hasAvailableTactics = availableTactics.length > 0;
        return (
        <div className="relative z-10 mt-3 sm:mt-4 bg-black/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
          {hasAvailableTactics ? (
            <div className="text-center text-xs sm:text-sm text-gray-200 mb-2.5 sm:mb-3 font-bold">전법 카드 선택 <span className="text-gray-400 font-normal">(선택사항)</span></div>
          ) : (
            <div className="text-center text-xs sm:text-sm text-gray-400 mb-2.5 sm:mb-3 font-bold">사용 가능한 전법 없음</div>
          )}
          {/* Bonus tactic explanation */}
          {hasAvailableTactics && battle.player.tactics.length > deck.tactics.length && (
            <div className="text-center text-[10px] text-green-300/80 mb-2 flex items-center justify-center gap-1">
              <span>📜</span> 손권 용병술: 전법 카드 +1장 추가!
            </div>
          )}

          {targetForecast.length > 0 && (
            <div className="mb-3 rounded-xl border border-cyan-500/30 bg-cyan-900/20 p-2">
              <div className="text-[11px] font-bold text-cyan-200 mb-1">🎯 현재 상태 기준 타겟 예측</div>
              <div className="flex gap-1 mb-1.5">
                <button
                  onClick={() => setTargetForecastSide('player')}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    targetForecastSide === 'player'
                      ? 'border-cyan-300 bg-cyan-700/40 text-cyan-100'
                      : 'border-cyan-700/50 bg-cyan-900/20 text-cyan-300/70'
                  }`}
                >
                  아군 공격
                </button>
                <button
                  onClick={() => setTargetForecastSide('enemy')}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    targetForecastSide === 'enemy'
                      ? 'border-cyan-300 bg-cyan-700/40 text-cyan-100'
                      : 'border-cyan-700/50 bg-cyan-900/20 text-cyan-300/70'
                  }`}
                >
                  적군 공격
                </button>
              </div>
              <div className="space-y-1">
                {targetForecast.filter((row) => row.attackerSide === targetForecastSide).map((row, i) => (
                  <div key={`${row.attackerSide}-${row.lane}-${i}`} className="text-[10px] text-cyan-100/90 flex items-center justify-between gap-2">
                    <span>
                      {row.attackerSide === 'player' ? '아군' : '적군'} {row.lane === 'front' ? '전위' : row.lane === 'mid' ? '중위' : '후위'}
                    </span>
                    <span className="truncate max-w-[70%] text-right">{row.attackerName} → {row.targetName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2.5 sm:gap-3 mb-3 sm:mb-4" style={{ transition: 'all 0.4s ease' }}>
            {battle.player.tactics.map((t, i) => {
              const tc = getTacticById(t.cardId);
              if (!tc) return null;
              const animState = tacticAnimState[i];
              const isBonus = i >= deck.tactics.length;
              // Completely hide removed cards
              if (animState === 'removed') return null;
              // Bonus tactics should disappear from the menu once used.
              if (isBonus && t.used) return null;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectTactic(i)}
                  disabled={t.used || !!animState}
                  className={`
                    relative px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm border-2 min-w-[110px] sm:min-w-[124px]
                    ${!animState ? 'transition-all' : ''}
                    ${t.used && !animState ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border-gray-700/50' : ''}
                    ${battle.player.selectedTactic === i && !animState ? 'bg-yellow-900/50 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}
                    ${!t.used && battle.player.selectedTactic !== i && !animState ? 'bg-gray-800/50 text-gray-200 border-gray-600/50 hover:border-gray-400/50 hover:bg-gray-700/50' : ''}
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
                  {/* Activation particle burst */}
                  {animState === 'activating' && (
                    <>
                      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
                        background: 'radial-gradient(circle, rgba(255,200,0,0.4) 0%, transparent 70%)',
                        animation: 'tacticGlowPulse 0.4s ease-out',
                      }} />
                      {[...Array(8)].map((_, pi) => {
                        const angle = (pi * 45) * Math.PI / 180;
                        const dist = 35 + seededRandom(pi + i * 10 + 1) * 15;
                        const tx = Math.cos(angle) * dist;
                        const ty = Math.sin(angle) * dist;
                        return (
                          <div key={pi} className="absolute pointer-events-none" style={{
                            left: '50%', top: '50%',
                            width: 5, height: 5,
                            marginLeft: -2.5, marginTop: -2.5,
                            borderRadius: '50%',
                            background: pi % 2 === 0 ? '#ffd700' : '#ff8c00',
                            boxShadow: `0 0 8px ${pi % 2 === 0 ? '#ffd700' : '#ff8c00'}`,
                            animation: `tacticParticleBurst 0.5s ease-out ${pi * 0.03}s forwards`,
                            '--tx': `${tx}px`,
                            '--ty': `${ty}px`,
                          } as React.CSSProperties} />
                        );
                      })}
                    </>
                  )}
                  {isBonus && !animState && (
                    <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-green-400/60">
                      보너스
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-black/45 border border-white/20 text-white/90">
                    Lv.{Math.max(1, t.level || 1)}
                  </div>
                  <div className="text-base sm:text-lg mb-0.5">{tc.emoji}</div>
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
              onClick={handleConfirmTactic}
              disabled={animating}
              className="relative px-8 sm:px-10 py-3 sm:py-4 text-white font-black text-base sm:text-lg rounded-xl transition-all disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95 overflow-hidden"
              style={!animating ? {
                background: 'linear-gradient(135deg, #dc2626, #f59e0b)',
                boxShadow: '0 0 20px rgba(220,38,38,0.5), 0 0 40px rgba(245,158,11,0.3), 0 4px 15px rgba(0,0,0,0.3)',
                animation: 'battleBtnPulse 2s ease-in-out infinite',
              } : {
                background: '#374151',
              }}
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
              <span className="relative z-10">
                {animating ? '전투 중...' : '⚔️ 전투 개시!'}
              </span>
            </button>
          </div>
        </div>
        );
      })()}

      {/* Result */}
      {battle.result && !animating && (
        <div className="mt-6 text-center">
          <div
            className={`inline-block px-8 py-4 rounded-2xl border-2 backdrop-blur-sm mb-4 ${
              battle.result === 'win'
                ? 'bg-yellow-900/40 border-yellow-500/50'
                : battle.result === 'lose'
                ? 'bg-red-900/40 border-red-500/50'
                : 'bg-gray-800/40 border-gray-500/50'
            }`}
            style={battle.result === 'win' ? { boxShadow: '0 0 30px rgba(234,179,8,0.3)' } : undefined}
          >
            <div className={`text-4xl font-black mb-2 ${
              battle.result === 'win' ? 'text-yellow-400' :
              battle.result === 'lose' ? 'text-red-400' : 'text-gray-400'
            }`} style={{ textShadow: '0 2px 10px currentColor' }}>
              {battle.result === 'win' ? '🎉 승리!' : battle.result === 'lose' ? '💀 패배...' : '🤝 무승부'}
            </div>
            {battle.result === 'win' && (
              <div className="text-sm text-green-300 font-bold mb-1">일반팩 1개 획득!</div>
            )}
            {streakReward && (
              <div
                className="text-sm font-bold mb-1"
                style={{
                  animation: 'streakBounce 0.6s ease-out',
                  color: streakReward.type === 'hero' ? '#a855f7' : '#3b82f6',
                }}
              >
                🔥 {streakReward.streak}연승 보상! {streakReward.type === 'hero' ? '영웅팩' : '희귀팩'} 획득!
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => onBattleEnd(battle.result!)}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Battle Log */}
      {showLog && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowLog(false)}>
          <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl p-4 max-w-md w-full max-h-[70vh] overflow-y-auto border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-gray-900/95 pb-2 border-b border-white/10">
              <h3 className="text-white font-bold text-lg">📜 전투 로그</h3>
              <button onClick={() => setShowLog(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-1">
              {[...battle.log].reverse().map((msg, i) => {
                // Determine log style based on content
                let colorClass = 'text-gray-300';
                let fontClass = 'text-xs';
                if (msg.includes('────') || msg.includes('턴 ')) {
                  return (
                    <div key={i} className="text-center text-yellow-500/80 font-bold text-xs py-2 border-t border-yellow-500/20 mt-2">
                      {msg.replace(/\n/g, '')}
                    </div>
                  );
                }
                if (msg.includes('🎉') || msg.includes('승리')) { colorClass = 'text-yellow-300'; fontClass = 'text-sm font-bold'; }
                else if (msg.includes('💀') || msg.includes('패배') || msg.includes('전사')) { colorClass = 'text-red-400'; fontClass = 'text-sm font-bold'; }
                else if (msg.includes('🌟') || msg.includes('궁극기')) { colorClass = 'text-yellow-300'; fontClass = 'text-xs font-bold'; }
                else if (msg.includes('⚔️')) colorClass = 'text-red-300';
                else if (msg.includes('💚') || msg.includes('치유') || msg.includes('HP+')) colorClass = 'text-green-300';
                else if (msg.includes('🔥') || msg.includes('화공')) colorClass = 'text-orange-300';
                else if (msg.includes('💫') || msg.includes('기절')) colorClass = 'text-purple-300';
                else if (msg.includes('🛡️') || msg.includes('방어')) colorClass = 'text-blue-300';
                else if (msg.includes('⬆️') || msg.includes('발동')) colorClass = 'text-cyan-300';
                else if (msg.includes('⚡')) colorClass = 'text-amber-300';

                return (
                  <div key={i} className={`${fontClass} ${colorClass} py-0.5 px-2 rounded hover:bg-white/5`}>
                    {msg}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Utility ───
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
