'use client';

import { CSSProperties, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { BattleState, BattleAction, Deck, OwnedCard, CombatEvent, BattleWarrior } from '@/types/game';
import { getWarriorById, getTacticById } from '@/data/cards';
import { initBattle, applyTactic, resolveCombat, selectAITactic } from '@/lib/battle-engine';
import { SFX } from '@/lib/sound';
import { BATTLE_ANIMATION_PRESETS } from '@/lib/animation-presets';
import { BattleEngineOptions } from '@/lib/battle/types';
import { getFieldEffectSummary, getForecastTarget, getFirstAlive } from '@/lib/battle/preview-utils';
import { BATTLE_LANES as ARENA_LANES } from '@/lib/display-constants';
import BattleAnimationStyles from '@/components/battle/BattleAnimationStyles';
import BattleHeader from '@/components/battle/BattleHeader';
import BattleOverlays from '@/components/battle/BattleOverlays';
import BattleLogPanel from '@/components/battle/BattleLogPanel';
import TacticPanel from '@/components/battle/TacticPanel';
import WarriorSlot, { FloatingNumber } from '@/components/battle/WarriorSlot';
import SlashEffect from '@/components/battle/SlashEffect';
import CardDetailModal from '@/components/card/CardDetailModal';

interface Props {
  deck: Deck;
  ownedCards: OwnedCard[];
  wins: number;
  onBattleEnd: (result: 'win' | 'lose' | 'draw') => void;
  onBattleEndWithSummary?: (result: 'win' | 'lose' | 'draw') => void;
  onExit: () => void;
  streakReward?: { type: string; streak: number } | null;
  battleOptions?: BattleEngineOptions;
}

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

interface ForecastLine {
  id: string;
  attackerSide: 'player' | 'enemy';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ForecastMarker {
  id: string;
  side: 'player' | 'enemy';
  x: number;
  y: number;
}

interface WarriorDetailTarget {
  cardId: string;
  owned: OwnedCard | null;
  side: 'player' | 'enemy';
}

type TacticAnimState = 'activating' | 'fading' | 'removed';

type Lane = 'front' | 'mid' | 'back';

let floatCounter = 0;
let logCounter = 0;

function computeBattleFieldRace(battle: BattleState | null) {
  if (!battle) return { playerHp: 0, enemyHp: 0, diff: 0 };
  const playerHp = battle.player.warriors.reduce((sum, w) => sum + Math.max(0, w.currentHp), 0);
  const enemyHp = battle.enemy.warriors.reduce((sum, w) => sum + Math.max(0, w.currentHp), 0);
  return { playerHp, enemyHp, diff: playerHp - enemyHp };
}

const DELAY = {
  ...BATTLE_ANIMATION_PRESETS.actionDelays,
  turnStart: BATTLE_ANIMATION_PRESETS.combatFx.turnStart,
  battleTxt: 350,
  tacticReveal: 500,
  tacticButtonReset: 200,
  tacticClearState: 200,
  tacticButtonFade: 500,
  tacticSelectClear: 250,
};

export default function BattleArena({
  deck,
  ownedCards,
  wins,
  onBattleEnd,
  onBattleEndWithSummary,
  onExit,
  streakReward,
  battleOptions,
}: Props) {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [skillNames, setSkillNames] = useState<Record<string, string>>({});
  const [skillBanner, setSkillBanner] = useState<{ warriorName: string; skillName: string; side: 'player' | 'enemy' } | null>(null);
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitId, setHitId] = useState<string | null>(null);
  const [showFieldEvent, setShowFieldEvent] = useState(true);
  const [showSynergy, setShowSynergy] = useState(false);
  const [showUltimate, setShowUltimate] = useState<{ cardId: string; skillName: string } | null>(null);
  const [turnAnnounce, setTurnAnnounce] = useState<string | null>(null);
  const [tacticAnnounce, setTacticAnnounce] = useState<{ name: string; cardId: string; side: 'player' | 'enemy' } | null>(null);
  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([]);
  const [slashEffect, setSlashEffect] = useState<{ style: CSSProperties; side: 'player' | 'enemy'; critical: boolean } | null>(null);
  const [criticalHits, setCriticalHits] = useState<Set<string>>(new Set());
  const [criticalFlash, setCriticalFlash] = useState(false);
  const [tacticAnimState, setTacticAnimState] = useState<Record<number, TacticAnimState>>({});
  const [forecastLines, setForecastLines] = useState<ForecastLine[]>([]);
  const [forecastMarkers, setForecastMarkers] = useState<ForecastMarker[]>([]);
  const [forecastPeekSide, setForecastPeekSide] = useState<'none' | 'player' | 'enemy'>('none');
  const [detailTarget, setDetailTarget] = useState<WarriorDetailTarget | null>(null);

  const tacticAnimRef = useRef<Record<number, TacticAnimState>>({});
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const arenaRef = useRef<HTMLDivElement>(null);
  const warriorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const arenaShakeControls = useAnimationControls();

  const setTacticAnim = useCallback((idx: number, state: TacticAnimState) => {
    tacticAnimRef.current = { ...tacticAnimRef.current, [idx]: state };
    setTacticAnimState((prev) => ({ ...prev, [idx]: state }));
  }, []);

  const clearScheduledTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, ms: number) => {
    const timeoutId = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, ms);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  const triggerCriticalImpact = useCallback((targetId: string) => {
    setCriticalHits(new Set([targetId]));
    setCriticalFlash(true);
    void arenaShakeControls.start({
      x: [0, -9, 9, -7, 7, -4, 4, 0],
      y: [0, -3, 3, -2, 2, 0, 0, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    });
    scheduleTimeout(() => setCriticalHits(new Set()), 420);
    scheduleTimeout(() => setCriticalFlash(false), 180);
  }, [arenaShakeControls, scheduleTimeout]);

  useEffect(() => {
    return () => clearScheduledTimeouts();
  }, [clearScheduledTimeouts]);

  const addLiveLog = useCallback((text: string) => {
    const entry: LiveLogEntry = {
      id: ++logCounter,
      text,
      timestamp: Date.now(),
    };
    setLiveLog((prev) => {
      const next = [...prev, entry];
      return next.slice(-6);
    });
  }, []);

  useEffect(() => {
    if (liveLog.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLiveLog((prev) => prev.filter((entry) => now - entry.timestamp < 5000));
    }, 500);
    return () => clearInterval(interval);
  }, [liveLog.length]);

  useEffect(() => {
    clearScheduledTimeouts();
    const b = initBattle(deck, ownedCards, wins, battleOptions);
    setBattle(b);

    setShowFieldEvent(true);
    scheduleTimeout(() => setShowFieldEvent(false), DELAY.showLogMs);
    setCriticalHits(new Set());
    setCriticalFlash(false);

    if (b.activeSynergies && b.activeSynergies.length > 0) {
      scheduleTimeout(() => setShowSynergy(true), DELAY.showLogMs + 200);
      scheduleTimeout(() => setShowSynergy(false), DELAY.showLogMs + 1200);
    }

    return () => clearScheduledTimeouts();
  }, [battleOptions, clearScheduledTimeouts, deck, ownedCards, scheduleTimeout, wins]);

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
      scheduleTimeout(() => setFloatingNumbers([]), DELAY.showHitMs);
    }

    if (Object.keys(newSkills).length > 0) {
      setSkillNames(newSkills);
      scheduleTimeout(() => setSkillNames({}), DELAY.showLogMs);
    }
  }, [scheduleTimeout]);

  const playActions = useCallback(
    async (
      actions: BattleAction[],
      finalState: BattleState,
    ) => {
      const allWarriors = [...finalState.player.warriors, ...finalState.enemy.warriors];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        switch (action.type) {
          case 'turn_start': {
            setTurnAnnounce(`턴 ${action.turn} 시작!`);
            await delay(DELAY.turnStart);
            setTurnAnnounce(null);
            break;
          }

          case 'tactic_use': {
            let playerTacticIdx = -1;
            if (action.side === 'player') {
              playerTacticIdx = finalState.player.tactics.findIndex((t) => t.instanceId === action.tacticInstanceId);
              if (playerTacticIdx >= 0) {
                setTacticAnim(playerTacticIdx, 'activating');
                await delay(DELAY.showSkillNameMs);
              }
            }

            setTacticAnnounce({ name: action.tacticName, cardId: action.tacticCardId, side: action.side });
            SFX.skillActivate();
            action.log.forEach((msg) => addLiveLog(msg));
            await delay(DELAY.tacticReveal);
            setTacticAnnounce(null);
            showCombatEvents(action.events);

            if (playerTacticIdx >= 0) {
              setTacticAnim(playerTacticIdx, 'fading');
              await delay(DELAY.tacticButtonReset);
              setTacticAnim(playerTacticIdx, 'removed');
            }
            await delay(DELAY.tacticSelectClear);
            break;
          }

          case 'passive_skill': {
            setSkillNames({ [action.warriorId]: action.skillName });
            {
              const w = allWarriors.find((w) => w.instanceId === action.warriorId);
              const wCard = w ? getWarriorById(w.cardId) : null;
              setSkillBanner({ warriorName: wCard?.name || '', skillName: action.skillName, side: action.side });
            }
            action.log.forEach((msg) => addLiveLog(msg));
            await delay(DELAY.showLogMs);
            setSkillNames({});
            setSkillBanner(null);
            break;
          }

          case 'active_skill': {
            setSkillNames({ [action.warriorId]: action.skillName });
            {
              const w = allWarriors.find((w) => w.instanceId === action.warriorId);
              const wCard = w ? getWarriorById(w.cardId) : null;
              setSkillBanner({ warriorName: wCard?.name || '', skillName: action.skillName, side: action.side });
            }
            SFX.skillActivate();
            action.log.forEach((msg) => addLiveLog(msg));
            showCombatEvents(action.events);
            await delay(DELAY.showLogMs);
            setSkillNames({});
            setSkillBanner(null);
            break;
          }

          case 'ultimate_skill': {
            setShowUltimate({ cardId: action.cardId, skillName: action.skillName });
            SFX.skillActivate();
            action.log.forEach((msg) => addLiveLog(msg));
            showCombatEvents(action.events);
            await delay(DELAY.battleTxt);
            setShowUltimate(null);
            break;
          }

          case 'attack': {
            setAttackingId(action.attackerId);
            SFX.attack();
            await delay(DELAY.showOverheadMs);

            const maxDamage = action.events.reduce((max, ev) => {
              if (ev.type !== 'damage' || !ev.value) return max;
              return Math.max(max, ev.value);
            }, 0);
            const targetSnapshot = allWarriors.find((w) => w.instanceId === action.targetId);
            const criticalThreshold = targetSnapshot
              ? Math.max(9, Math.ceil(targetSnapshot.maxHp * 0.35))
              : 9;
            const isCriticalHit = maxDamage > 0 && maxDamage >= criticalThreshold;

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
                critical: isCriticalHit,
                style: {
                  position: 'fixed',
                  left: startX,
                  top: startY,
                  width: dist,
                  height: isCriticalHit ? 4 : 3,
                  transformOrigin: '0 50%',
                  transform: `rotate(${angle}deg)`,
                  zIndex: 40,
                },
              });
            }

            if (isCriticalHit) {
              triggerCriticalImpact(action.targetId);
            }

            await delay(DELAY.showSlashMs);

            setHitId(action.targetId);
            showCombatEvents(action.events);
            action.log.forEach((msg) => addLiveLog(msg));

            if (action.skillName) {
              setSkillNames((prev) => ({ ...prev, [action.attackerId]: action.skillName! }));
              const w = allWarriors.find((w) => w.instanceId === action.attackerId);
              const wCard = w ? getWarriorById(w.cardId) : null;
              setSkillBanner({
                warriorName: wCard?.name || '',
                skillName: action.skillName,
                side: action.side,
              });
            }

            setBattle((prev) => {
              if (!prev) return prev;
              const next = structuredClone(prev);
              for (const ev of action.events) {
                const allW = [...next.player.warriors, ...next.enemy.warriors];
                const w = allW.find((w) => w.instanceId === ev.targetInstanceId);
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

            await delay(DELAY.showHitMs);

            setAttackingId(null);
            setHitId(null);
            setSlashEffect(null);
            setCriticalHits(new Set());
            setSkillNames({});
            setSkillBanner(null);
            await delay(DELAY.clearStateMs);
            break;
          }

          case 'stun_skip': {
            setSkillNames({ [action.warriorId]: '💫 기절' });
            action.log.forEach((msg) => addLiveLog(msg));
            await delay(DELAY.clearStateMs);
            setSkillNames({});
            break;
          }

          case 'forced_skip': {
            setSkillNames({ [action.warriorId]: '🌙 행동불가' });
            action.log.forEach((msg) => addLiveLog(msg));
            await delay(DELAY.clearStateMs);
            setSkillNames({});
            break;
          }

          case 'turn_end': {
            setBattle((prev) => {
              if (!prev) return prev;
              return {
                ...finalState,
                player: { ...finalState.player, selectedTactic: null },
                enemy: { ...finalState.enemy, selectedTactic: null },
              };
            });

            if (action.result) {
              action.log.forEach((msg) => addLiveLog(msg));
              await delay(DELAY.battleTxt);
              if (action.result === 'win') SFX.victory();
              else if (action.result === 'lose') SFX.defeat();
            }
            break;
          }
        }
      }
    }, [setTacticAnim, showCombatEvents, addLiveLog, triggerCriticalImpact]
  );

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

    if (battle.player.selectedTactic !== null) {
      const result = applyTactic(currentState, 'player', battle.player.selectedTactic);
      currentState = result.state;
      if (result.action) allActions.push(result.action);
    }

    const playerAliveAfterPlayerTactic = currentState.player.warriors.some((w) => w.isAlive);
    const enemyAliveAfterPlayerTactic = currentState.enemy.warriors.some((w) => w.isAlive);

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

    const combatResult = resolveCombat(currentState);
    allActions.push(...combatResult.actions);

    await playActions(allActions, combatResult.state);

    setAnimating(false);
  }, [battle, animating, playActions]);

  const fieldEffectSummary = useMemo(
    () => (battle ? getFieldEffectSummary(battle.fieldEvent.effect) : { applied: [], pending: [] }),
    [battle]
  );

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
      case 't-counter':
        lines.push('예상 효과: 다음 적 전법 1회 반사 준비');
        break;
      default:
        break;
    }

    return {
      title: tc.name,
      lines,
      warnings,
    };
  }, [battle]);

  const updateTargetForecastOverlay = useCallback(() => {
    if (!arenaRef.current || !battle || battle.phase !== 'tactic' || battle.result || animating) {
      setForecastLines([]);
      setForecastMarkers([]);
      return;
    }

    const arenaRect = arenaRef.current.getBoundingClientRect();
    const lines: ForecastLine[] = [];
    const markerMap = new Map<string, ForecastMarker>();

    const pushLine = (attacker: BattleWarrior, target: BattleWarrior, attackerSide: 'player' | 'enemy') => {
      const attackerEl = warriorRefs.current.get(attacker.instanceId);
      const targetEl = warriorRefs.current.get(target.instanceId);
      if (!attackerEl || !targetEl) return;

      const attackerRect = attackerEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const x1 = attackerRect.left - arenaRect.left + attackerRect.width / 2;
      const y1 = attackerRect.top - arenaRect.top + (attackerSide === 'player' ? attackerRect.height * 0.3 : attackerRect.height * 0.7);
      const x2 = targetRect.left - arenaRect.left + targetRect.width / 2;
      const y2 = targetRect.top - arenaRect.top + (attackerSide === 'player' ? targetRect.height * 0.7 : targetRect.height * 0.3);

      lines.push({
        id: `${attacker.instanceId}-${target.instanceId}`,
        attackerSide,
        x1,
        y1,
        x2,
        y2,
      });

      markerMap.set(target.instanceId, {
        id: target.instanceId,
        side: attackerSide,
        x: x2,
        y: y2,
      });
    };

    for (const lane of ARENA_LANES) {
      const attacker = battle.player.warriors.find((w) => w.lane === lane && w.isAlive);
      if (!attacker) continue;
      const fieldBlocked = lane === 'front' && battle.turn === 1 && battle.fieldEvent.effect === 'skip_front_first_turn';
      const stunned = attacker.statusEffects.some((e) => e.type === 'stun' && e.turnsLeft > 0);
      if (fieldBlocked || stunned) continue;
      const target = getForecastTarget(battle.enemy.warriors);
      if (target) {
        pushLine(attacker, target, 'player');
      }
    }

    for (const lane of ARENA_LANES) {
      const attacker = battle.enemy.warriors.find((w) => w.lane === lane && w.isAlive);
      if (!attacker) continue;
      const fieldBlocked = lane === 'front' && battle.turn === 1 && battle.fieldEvent.effect === 'skip_front_first_turn';
      const stunned = attacker.statusEffects.some((e) => e.type === 'stun' && e.turnsLeft > 0);
      if (fieldBlocked || stunned) continue;
      const target = getForecastTarget(battle.player.warriors);
      if (target) {
        pushLine(attacker, target, 'enemy');
      }
    }

    setForecastLines(lines);
    setForecastMarkers(Array.from(markerMap.values()));
  }, [animating, battle]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => updateTargetForecastOverlay());
    return () => cancelAnimationFrame(raf);
  }, [updateTargetForecastOverlay]);

  useEffect(() => {
    const handleResize = () => updateTargetForecastOverlay();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateTargetForecastOverlay]);

  useEffect(() => {
    if (!battle || battle.phase !== 'tactic' || battle.result || animating) {
      setForecastPeekSide('none');
    }
  }, [animating, battle]);

  const handleOpenWarriorDetail = useCallback((warrior: BattleWarrior, side: 'player' | 'enemy') => {
    const playerOwned = ownedCards.find((owned) => owned.instanceId === warrior.instanceId) ?? null;
    const fallbackOwned: OwnedCard = {
      instanceId: warrior.instanceId,
      cardId: warrior.cardId,
      level: Math.max(1, warrior.level),
      duplicates: 0,
    };

    setDetailTarget({
      cardId: warrior.cardId,
      side,
      owned: side === 'player' ? (playerOwned ?? fallbackOwned) : fallbackOwned,
    });
  }, [ownedCards]);

  const detailCard = useMemo(() => {
    if (!detailTarget) return null;
    return getWarriorById(detailTarget.cardId) ?? null;
  }, [detailTarget]);

  const hpRace = useMemo(() => computeBattleFieldRace(battle), [battle]);

  if (!battle) {
    return <div className="text-white text-center p-8">전투 준비 중...</div>;
  }

  return (
    <motion.div
      ref={arenaRef}
      className="min-h-screen p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/battle-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      animate={arenaShakeControls}
    >
      <BattleAnimationStyles />

      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />

      {slashEffect && <SlashEffect style={slashEffect.style} side={slashEffect.side} critical={slashEffect.critical} />}

      <AnimatePresence>
        {criticalFlash && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{ background: 'radial-gradient(circle at center, rgba(250,204,21,0.25), transparent 62%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          />
        )}
      </AnimatePresence>

      <BattleOverlays
        battle={battle}
        showFieldEvent={showFieldEvent}
        showSynergy={showSynergy}
        showUltimate={showUltimate}
        turnAnnounce={turnAnnounce}
        tacticAnnounce={tacticAnnounce}
        skillBanner={skillBanner}
        liveLog={liveLog}
      />

      <BattleHeader
        battle={battle}
        hpRace={hpRace}
        onExit={onExit}
        onToggleLog={() => setShowLog(!showLog)}
        fieldEffectSummary={fieldEffectSummary}
      />

      {battle.phase === 'tactic' && !battle.result && !animating && forecastPeekSide !== 'none' && forecastLines.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-[6]">
          <svg className="h-full w-full">
            {forecastLines
              .filter((line) => line.attackerSide === forecastPeekSide)
              .map((line) => {
              const color = line.attackerSide === 'player'
                ? 'rgba(56, 189, 248, 0.45)'
                : 'rgba(248, 113, 113, 0.45)';
              const dx = line.x2 - line.x1;
              const dy = line.y2 - line.y1;
              const len = Math.sqrt((dx * dx) + (dy * dy)) || 1;
              const ux = dx / len;
              const uy = dy / len;
              const arrowLen = 10;
              const arrowWidth = 4.5;
              const baseX = line.x2 - (ux * arrowLen);
              const baseY = line.y2 - (uy * arrowLen);
              const leftX = baseX + (-uy * arrowWidth);
              const leftY = baseY + (ux * arrowWidth);
              const rightX = baseX - (-uy * arrowWidth);
              const rightY = baseY - (ux * arrowWidth);

              return (
                <g key={line.id}>
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={color}
                    strokeWidth={1.8}
                    strokeDasharray={line.attackerSide === 'player' ? '6 6' : '2 6'}
                    strokeLinecap="round"
                  />
                  <circle cx={line.x1} cy={line.y1} r={2.1} fill={color} />
                  <circle cx={line.x2} cy={line.y2} r={2.4} fill={color} />
                  <polygon points={`${line.x2},${line.y2} ${leftX},${leftY} ${rightX},${rightY}`} fill={color} />
                </g>
              );
            })}
          </svg>
          {forecastMarkers
            .filter((marker) => marker.side === forecastPeekSide)
            .map((marker) => (
            <span
              key={`marker-${marker.id}`}
              className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border animate-pulse"
              style={{
                left: marker.x,
                top: marker.y,
                borderColor: marker.side === 'player' ? 'rgba(56, 189, 248, 0.55)' : 'rgba(248, 113, 113, 0.55)',
                boxShadow: marker.side === 'player'
                  ? '0 0 16px rgba(56, 189, 248, 0.22)'
                  : '0 0 16px rgba(248, 113, 113, 0.22)',
              }}
            />
          ))}
        </div>
      )}

      {battle.activeSynergies && battle.activeSynergies.filter((s) => s.side === 'enemy').length > 0 && (
        <div className="flex justify-center gap-2 mb-2">
          {battle.activeSynergies.filter((s) => s.side === 'enemy').map((syn, i) => (
            <div
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                syn.faction === '위'
                  ? 'bg-blue-900/50 border-blue-500/50 text-blue-300'
                  : syn.faction === '촉'
                    ? 'bg-red-900/50 border-red-500/50 text-red-300'
                    : syn.faction === '오'
                      ? 'bg-green-900/50 border-green-500/50 text-green-300'
                      : 'bg-purple-900/50 border-purple-500/50 text-purple-300'
              }`}
            >
              적 {syn.faction} {syn.level === 'major' ? '대시너지' : '소시너지'}: {syn.effect}
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 text-center text-xs text-red-400 font-bold tracking-widest uppercase">적군</div>
      <div className="flex justify-center gap-2 mb-6">
          {ARENA_LANES.map((lane: Lane) => {
          const warrior = battle.enemy.warriors.find((w) => w.lane === lane);
          return warrior ? (
            <div key={lane} ref={(el) => { if (el) warriorRefs.current.set(warrior.instanceId, el); }}>
              <WarriorSlot
                key={warrior.instanceId}
                warrior={warrior}
                isPlayer={false}
                isAttacking={attackingId === warrior.instanceId}
                isHit={hitId === warrior.instanceId}
                isCriticalHit={criticalHits.has(warrior.instanceId)}
                floatingNumbers={floatingNumbers.filter((f) => f.targetId === warrior.instanceId)}
                showSkillName={skillNames[warrior.instanceId] || null}
                onOpenDetail={() => handleOpenWarriorDetail(warrior, 'enemy')}
              />
            </div>
          ) : null;
        })}
      </div>

      <div className="relative flex items-center justify-center my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-yellow-500/30" />
        </div>
        <div className="relative flex items-center gap-2 px-3 py-1 bg-yellow-900/50 backdrop-blur-sm rounded-full border border-yellow-500/40">
          <span className="text-xl font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(234,179,8,0.4)' }}>⚔️ VS</span>
          {battle.phase === 'tactic' && !battle.result && !animating && (
            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onMouseDown={() => setForecastPeekSide('player')}
                onMouseUp={() => setForecastPeekSide('none')}
                onMouseLeave={() => setForecastPeekSide('none')}
                onTouchStart={() => setForecastPeekSide('player')}
                onTouchEnd={() => setForecastPeekSide('none')}
                onTouchCancel={() => setForecastPeekSide('none')}
                className="rounded-full border border-cyan-300/45 bg-cyan-900/35 px-2 py-0.5 text-[10px] font-bold text-cyan-100 active:scale-95"
              >
                홀드: 아군
              </button>
              <button
                type="button"
                onMouseDown={() => setForecastPeekSide('enemy')}
                onMouseUp={() => setForecastPeekSide('none')}
                onMouseLeave={() => setForecastPeekSide('none')}
                onTouchStart={() => setForecastPeekSide('enemy')}
                onTouchEnd={() => setForecastPeekSide('none')}
                onTouchCancel={() => setForecastPeekSide('none')}
                className="rounded-full border border-red-300/45 bg-red-900/35 px-2 py-0.5 text-[10px] font-bold text-red-100 active:scale-95"
              >
                홀드: 적군
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-2 text-center text-xs text-blue-400 font-bold tracking-widest uppercase">아군</div>
      <div className="flex justify-center gap-2 mb-6">
        {ARENA_LANES.map((lane: Lane) => {
          const warrior = battle.player.warriors.find((w) => w.lane === lane);
          return warrior ? (
            <div key={lane} ref={(el) => { if (el) warriorRefs.current.set(warrior.instanceId, el); }}>
              <WarriorSlot
                key={warrior.instanceId}
                warrior={warrior}
                isPlayer
                isAttacking={attackingId === warrior.instanceId}
                isHit={hitId === warrior.instanceId}
                isCriticalHit={criticalHits.has(warrior.instanceId)}
                floatingNumbers={floatingNumbers.filter((f) => f.targetId === warrior.instanceId)}
                showSkillName={skillNames[warrior.instanceId] || null}
                onOpenDetail={() => handleOpenWarriorDetail(warrior, 'player')}
              />
            </div>
          ) : null;
        })}
      </div>

      {battle.activeSynergies && battle.activeSynergies.filter((s) => s.side === 'player').length > 0 && (
        <div className="flex justify-center gap-2 mb-3">
          {battle.activeSynergies.filter((s) => s.side === 'player').map((syn, i) => (
            <div
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                syn.faction === '위'
                  ? 'bg-blue-900/50 border-blue-500/50 text-blue-300'
                  : syn.faction === '촉'
                    ? 'bg-red-900/50 border-red-500/50 text-red-300'
                    : syn.faction === '오'
                      ? 'bg-green-900/50 border-green-500/50 text-green-300'
                      : 'bg-purple-900/50 border-purple-500/50 text-purple-300'
              }`}
            >
              아군 {syn.faction} {syn.level === 'major' ? '대시너지' : '소시너지'}: {syn.effect}
            </div>
          ))}
        </div>
      )}

      <TacticPanel
        battle={battle}
        deck={deck}
        animating={animating}
        tacticAnimState={tacticAnimState}
        tacticPreview={tacticPreview}
        onSelectTactic={handleSelectTactic}
        onConfirmTactic={handleConfirmTactic}
      />

      <AnimatePresence>
        {battle.result && !animating && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/74"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className={`relative w-full max-w-sm rounded-3xl border-2 px-6 py-7 text-center backdrop-blur-md ${
                battle.result === 'win'
                  ? 'border-yellow-400/60 bg-yellow-900/28'
                  : battle.result === 'lose'
                    ? 'border-red-400/60 bg-red-900/28'
                    : 'border-slate-400/60 bg-slate-900/25'
              }`}
              initial={{ y: 34, opacity: 0, scale: 0.88, rotateX: 18 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ y: 18, opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.82 }}
              style={{
                boxShadow:
                  battle.result === 'win'
                    ? '0 0 32px rgba(250,204,21,0.35), 0 16px 42px rgba(15,23,42,0.52)'
                    : battle.result === 'lose'
                      ? '0 0 32px rgba(248,113,113,0.3), 0 16px 42px rgba(15,23,42,0.52)'
                      : '0 0 24px rgba(148,163,184,0.28), 0 16px 42px rgba(15,23,42,0.52)',
              }}
            >
              <motion.div
                className={`text-5xl font-black mb-2 ${
                  battle.result === 'win' ? 'text-yellow-300' : battle.result === 'lose' ? 'text-red-300' : 'text-slate-300'
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 320, damping: 20 }}
                style={{ textShadow: '0 0 24px currentColor, 0 4px 16px rgba(0,0,0,0.5)' }}
              >
                {battle.result === 'win' ? '🎉 승리!' : battle.result === 'lose' ? '💀 패배...' : '🤝 무승부'}
              </motion.div>

              {battle.result === 'win' && (
                <motion.div
                  className="text-sm text-green-300 font-bold mb-1"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.14 }}
                >
                  일반팩 1개 획득!
                </motion.div>
              )}

              {streakReward && (
                <motion.div
                  className="text-sm font-bold mb-1"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ color: streakReward.type === 'hero' ? '#a855f7' : '#3b82f6' }}
                >
                  🔥 {streakReward.streak}연승 보상! {streakReward.type === 'hero' ? '영웅팩' : '희귀팩'} 획득!
                </motion.div>
              )}

              <motion.button
                onClick={() => {
                  onBattleEndWithSummary?.(battle.result!);
                  onBattleEnd(battle.result!);
                }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.93 }}
                className="mt-4 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
                style={{ boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}
              >
                확인
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CardDetailModal
        card={detailCard}
        owned={detailTarget?.owned ?? null}
        sourceTag={detailTarget ? (detailTarget.side === 'player' ? '아군 장수' : '적군 장수') : undefined}
        onClose={() => setDetailTarget(null)}
      />

      <BattleLogPanel open={showLog} log={battle.log} onClose={() => setShowLog(false)} />
    </motion.div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
