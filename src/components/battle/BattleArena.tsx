'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BattleState, BattleWarrior, BattleAction, Deck, OwnedCard, CombatEvent } from '@/types/game';
import { getWarriorById, getTacticById } from '@/data/cards';
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

let floatCounter = 0;
let logCounter = 0;

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

  return (
    <div
      className={`
        relative rounded-lg p-2 text-center min-w-[90px] transition-all duration-300
        ${isDead ? 'opacity-40 grayscale' : 'opacity-100'}
        ${isAttacking ? 'z-10' : ''}
        ${isPlayer ? 'bg-blue-900/50 border border-blue-500/30' : 'bg-red-900/50 border border-red-500/30'}
      `}
      style={{
        animation: isAttacking
          ? (isPlayer ? 'attackLunge 0.2s ease-out' : 'attackLungeDown 0.2s ease-out')
          : isHit
          ? 'hitShake 0.15s ease-out'
          : isDead
          ? 'deathFade 0.3s ease-out forwards'
          : 'none',
        boxShadow: isAttacking
          ? '0 0 20px rgba(255,200,0,0.6), 0 0 40px rgba(255,200,0,0.3)'
          : isHit
          ? '0 0 15px rgba(255,0,0,0.5)'
          : 'none',
        border: isAttacking
          ? '2px solid rgba(255,200,0,0.8)'
          : undefined,
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
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg bg-black/30">
          <span className="text-3xl">💀</span>
        </div>
      )}

      {/* Lane label */}
      <div className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] px-1.5 rounded font-bold
        ${warrior.lane === 'front' ? 'bg-red-800 text-red-300' :
          warrior.lane === 'mid' ? 'bg-yellow-800 text-yellow-300' :
          'bg-blue-800 text-blue-300'}`}>
        {warrior.lane === 'front' ? '전위' : warrior.lane === 'mid' ? '중위' : '후위'}
      </div>

      <div className="text-lg">{isDead ? '💀' : card.grade === 4 ? '🌟' : '⚔️'}</div>
      <div className="text-xs font-bold text-white mt-1">{card.name}</div>
      <div className="text-[10px] text-gray-400">{card.faction}</div>

      {/* HP bar */}
      <div className="mt-1 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-600/50">
        <div
          className={`h-full ${hpColor} transition-all duration-300 ease-out`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        {warrior.currentHp}/{warrior.maxHp}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-1 mt-1 text-[9px] text-gray-300">
        <span>⚔️{warrior.stats.attack}</span>
        <span>🏰{warrior.stats.defense}</span>
      </div>

      {/* Status effects */}
      {warrior.statusEffects.length > 0 && (
        <div className="flex justify-center gap-0.5 mt-1">
          {warrior.statusEffects.map((e, i) => (
            <span key={i} className="text-[9px]">
              {e.type === 'stun' ? '💫' : e.type === 'attack_up' ? '⬆️' : e.type === 'evasion' ? '🌿' : e.type === 'taunt' ? '😤' : '🛡️'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Slash Effect Component ───
function SlashEffect({ attackerId, targetId, side, warriorRefs }: {
  attackerId: string;
  targetId: string;
  side: 'player' | 'enemy';
  warriorRefs: React.RefObject<Map<string, HTMLDivElement>>;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const map = warriorRefs.current;
    if (!map) return;
    const attackerEl = map.get(attackerId);
    const targetEl = map.get(targetId);

    if (attackerEl && targetEl) {
      const aRect = attackerEl.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();

      const startX = aRect.left + aRect.width / 2;
      const startY = side === 'player' ? aRect.top : aRect.bottom;
      const endX = tRect.left + tRect.width / 2;
      const endY = side === 'player' ? tRect.bottom : tRect.top;

      const dx = endX - startX;
      const dy = endY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      setStyle({
        position: 'fixed',
        left: startX,
        top: startY,
        width: dist,
        height: 3,
        transformOrigin: '0 50%',
        transform: `rotate(${angle}deg)`,
        zIndex: 40,
      });
      setVisible(true);
    }

    const timer = setTimeout(() => setVisible(false), 150);
    return () => clearTimeout(timer);
  }, [attackerId, targetId, side, warriorRefs]);

  if (!visible) return null;

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
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [skillNames, setSkillNames] = useState<Record<string, string>>({});
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitId, setHitId] = useState<string | null>(null);
  const [showFieldEvent, setShowFieldEvent] = useState(true);
  const [showSynergy, setShowSynergy] = useState(false);
  const [showUltimate, setShowUltimate] = useState<{ cardId: string; skillName: string } | null>(null);
  const [turnAnnounce, setTurnAnnounce] = useState<string | null>(null);
  const [tacticAnnounce, setTacticAnnounce] = useState<{ name: string; emoji: string; side: 'player' | 'enemy' } | null>(null);
  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([]);
  const [slashEffect, setSlashEffect] = useState<{ attackerId: string; targetId: string; side: 'player' | 'enemy' } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const warriorRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const addLiveLog = useCallback((text: string) => {
    const entry: LiveLogEntry = { id: ++logCounter, text, timestamp: Date.now() };
    setLiveLog(prev => {
      const next = [...prev, entry];
      // Keep only the last 3
      return next.slice(-3);
    });
  }, []);

  // Fade out old log entries
  useEffect(() => {
    if (liveLog.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLiveLog(prev => prev.filter(e => now - e.timestamp < 2000));
    }, 500);
    return () => clearInterval(interval);
  }, [liveLog.length]);

  useEffect(() => {
    const b = initBattle(deck, ownedCards, wins);
    setBattle(b);

    // Show field event banner with animation
    setShowFieldEvent(true);
    const t1 = setTimeout(() => setShowFieldEvent(false), 1200);

    // Show synergy if applicable
    if (b.activeSynergies && b.activeSynergies.length > 0) {
      const t2 = setTimeout(() => setShowSynergy(true), 200);
      const t3 = setTimeout(() => setShowSynergy(false), 1400);
      timerRef.current.push(t2, t3);
    }

    timerRef.current.push(t1);
    return () => timerRef.current.forEach(clearTimeout);
  }, [deck, ownedCards]);

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
    // Helper to apply intermediate state changes per action
    // We incrementally update the displayed battle state
    const intermediateState = structuredClone(finalState);

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
          setTacticAnnounce({ name: action.tacticName, emoji: action.tacticEmoji, side: action.side });
          SFX.skillActivate();
          action.log.forEach(msg => addLiveLog(msg));
          await delay(400);
          setTacticAnnounce(null);
          // Show tactic combat effects
          showCombatEvents(action.events);
          await delay(200);
          break;
        }

        case 'passive_skill': {
          setSkillNames({ [action.warriorId]: action.skillName });
          action.log.forEach(msg => addLiveLog(msg));
          await delay(300);
          setSkillNames({});
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
          setSlashEffect({ attackerId: action.attackerId, targetId: action.targetId, side: action.side });
          await delay(80);

          // 3. Hit target - shake + damage numbers
          setHitId(action.targetId);
          showCombatEvents(action.events);
          action.log.forEach(msg => addLiveLog(msg));

          // Show skill name if applicable
          if (action.skillName) {
            setSkillNames(prev => ({ ...prev, [action.attackerId]: action.skillName! }));
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
  }, [showCombatEvents, addLiveLog]);

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

    // AI selects and applies tactic
    const aiTactic = selectAITactic(currentState);
    if (aiTactic !== null) {
      const result = applyTactic(currentState, 'enemy', aiTactic);
      currentState = result.state;
      if (result.action) allActions.push(result.action);
    }

    // Resolve combat - get actions
    const combatResult = resolveCombat(currentState);
    allActions.push(...combatResult.actions);

    // Play all actions sequentially
    await playActions(allActions, combatResult.state);

    setAnimating(false);
  }, [battle, animating, playActions]);

  if (!battle) {
    return <div className="text-white text-center p-8">전투 준비 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4 relative overflow-hidden">
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
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes liveLogOut {
          0% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>

      {/* Slash Effect Overlay */}
      {slashEffect && (
        <SlashEffect
          attackerId={slashEffect.attackerId}
          targetId={slashEffect.targetId}
          side={slashEffect.side}
          warriorRefs={warriorRefs}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            className="text-center"
            style={{ animation: 'tacticCardReveal 0.4s ease-out forwards' }}
          >
            <div className={`px-8 py-4 rounded-xl border-2 ${
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
      <div className="flex justify-between items-center mb-4">
        <button onClick={onExit} className="text-gray-400 text-sm hover:text-white">
          ← 퇴각
        </button>
        <div className="text-center">
          <div className="text-white font-bold text-lg">턴 {battle.turn}/{battle.maxTurns}</div>
          <div className="text-xs text-yellow-400">{battle.fieldEvent.name}</div>
        </div>
        <button
          onClick={() => setShowLog(!showLog)}
          className="text-gray-400 text-sm hover:text-white"
        >
          📜 로그
        </button>
      </div>

      {/* Field Event Compact Banner */}
      <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-2 mb-4 text-center">
        <div className="text-xs text-amber-400">⚡ {battle.fieldEvent.name}</div>
        <div className="text-[10px] text-amber-300/70">{battle.fieldEvent.description}</div>
      </div>

      {/* Synergy indicator (compact) */}
      {battle.activeSynergies && battle.activeSynergies.length > 0 && (
        <div className="flex justify-center gap-2 mb-3">
          {battle.activeSynergies.map((syn, i) => (
            <div key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              syn.faction === '위' ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' :
              syn.faction === '촉' ? 'bg-red-900/50 border-red-500/50 text-red-300' :
              syn.faction === '오' ? 'bg-green-900/50 border-green-500/50 text-green-300' :
              'bg-purple-900/50 border-purple-500/50 text-purple-300'
            }`}>
              {syn.faction} 시너지: {syn.effect}
            </div>
          ))}
        </div>
      )}

      {/* Enemy side */}
      <div className="mb-2 text-center text-xs text-red-400 font-bold">적군</div>
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
      <div className="text-center text-2xl font-bold text-yellow-500 my-2">⚔️ VS</div>

      {/* Player side */}
      <div className="mb-2 text-center text-xs text-blue-400 font-bold">아군</div>
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

      {/* Live Battle Log (bottom overlay) */}
      {liveLog.length > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-30 pointer-events-none space-y-1">
          {liveLog.map((entry) => {
            const age = Date.now() - entry.timestamp;
            const isFading = age > 1500;
            return (
              <div
                key={entry.id}
                className="text-xs px-3 py-1.5 bg-black/70 border border-gray-600/40 rounded-lg text-gray-200 backdrop-blur-sm"
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
      {battle.phase === 'tactic' && !battle.result && (
        <div className="mt-4">
          <div className="text-center text-sm text-gray-300 mb-2">전법 카드 선택 (선택사항)</div>
          <div className="flex justify-center gap-2 mb-4">
            {battle.player.tactics.map((t, i) => {
              const tc = getTacticById(t.cardId);
              if (!tc) return null;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectTactic(i)}
                  disabled={t.used}
                  className={`
                    px-3 py-2 rounded-lg text-sm transition-all
                    ${t.used ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : ''}
                    ${battle.player.selectedTactic === i ? 'bg-yellow-600 text-white ring-2 ring-yellow-400' : ''}
                    ${!t.used && battle.player.selectedTactic !== i ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : ''}
                  `}
                >
                  <div>{tc.emoji} {tc.name}</div>
                  <div className="text-[10px] opacity-70">{tc.description}</div>
                </button>
              );
            })}
          </div>
          <div className="text-center">
            <button
              onClick={handleConfirmTactic}
              disabled={animating}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {animating ? '전투 중...' : '⚔️ 전투 개시!'}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {battle.result && !animating && (
        <div className="mt-6 text-center">
          <div className={`text-3xl font-bold mb-4 ${
            battle.result === 'win' ? 'text-yellow-400' :
            battle.result === 'lose' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {battle.result === 'win' ? '🎉 승리!' : battle.result === 'lose' ? '💀 패배...' : '🤝 무승부'}
          </div>
          {battle.result === 'win' && (
            <div className="text-sm text-green-400 mb-2">일반팩 1개 획득!</div>
          )}
          {streakReward && (
            <div
              className="text-sm font-bold mb-2"
              style={{
                animation: 'streakBounce 0.6s ease-out',
                color: streakReward.type === 'hero' ? '#a855f7' : '#3b82f6',
              }}
            >
              🔥 {streakReward.streak}연승 보상! {streakReward.type === 'hero' ? '영웅팩' : '희귀팩'} 획득!
            </div>
          )}
          <button
            onClick={() => onBattleEnd(battle.result!)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            확인
          </button>
        </div>
      )}

      {/* Battle Log */}
      {showLog && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-4 max-w-md w-full max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-bold">전투 로그</h3>
              <button onClick={() => setShowLog(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-1">
              {battle.log.map((msg, i) => (
                <div key={i} className="text-xs text-gray-300">{msg}</div>
              ))}
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
