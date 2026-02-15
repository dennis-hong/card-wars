'use client';

import Image from 'next/image';
import { getWarriorById } from '@/data/cards';
import { TACTIC_IMAGES } from '@/lib/tactic-images';
import { BattleState } from '@/types/game';
import { useEffect, useState } from 'react';

interface LiveLogEntry {
  id: number;
  text: string;
  timestamp: number;
}

interface SkillBanner {
  warriorName: string;
  skillName: string;
  side: 'player' | 'enemy';
}

interface TacticAnnounce {
  name: string;
  cardId: string;
  side: 'player' | 'enemy';
}

interface Props {
  battle: BattleState;
  showFieldEvent: boolean;
  showSynergy: boolean;
  showUltimate: { cardId: string; skillName: string } | null;
  turnAnnounce: string | null;
  tacticAnnounce: TacticAnnounce | null;
  skillBanner: SkillBanner | null;
  liveLog: LiveLogEntry[];
}

function SkillBannerOverlay({ skillBanner }: { skillBanner: SkillBanner | null }) {
  if (!skillBanner) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="text-center" style={{ animation: 'skillBannerAnim 0.5s ease-out forwards' }}>
        <div
          className={`px-6 py-3 rounded-xl border-2 backdrop-blur-sm ${
            skillBanner.side === 'player'
              ? 'bg-blue-900/80 border-blue-400/60'
              : 'bg-red-900/80 border-red-400/60'
          }`}
        >
          <div className="text-xs font-bold mb-1" style={{ color: skillBanner.side === 'player' ? '#93c5fd' : '#fca5a5' }}>
            {skillBanner.side === 'player' ? '아군' : '적군'} 스킬 발동
          </div>
          <div className="text-lg font-black text-white">{skillBanner.warriorName}</div>
          <div className="text-base font-bold text-purple-300">⚡ {skillBanner.skillName}</div>
        </div>
      </div>
    </div>
  );
}

function TacticAnnounceOverlay({ tacticAnnounce }: { tacticAnnounce: TacticAnnounce | null }) {
  if (!tacticAnnounce) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="text-center" style={{ animation: 'tacticCardReveal 0.4s ease-out forwards' }}>
        <div
          className={`px-8 py-4 rounded-xl border-2 backdrop-blur-sm shadow-2xl ${
            tacticAnnounce.side === 'player'
              ? 'bg-blue-900/90 border-blue-400/60'
              : 'bg-red-900/90 border-red-400/60'
          }`}
        >
          <div
            className="text-xs font-bold mb-1"
            style={{ color: tacticAnnounce.side === 'player' ? '#93c5fd' : '#fca5a5' }}
          >
            {tacticAnnounce.side === 'player' ? '아군' : '적군'} 전법
          </div>
          {TACTIC_IMAGES[tacticAnnounce.cardId] ? (
            <div className="relative w-12 h-12 mx-auto mb-1 rounded overflow-hidden">
              <Image
                src={TACTIC_IMAGES[tacticAnnounce.cardId]}
                alt={tacticAnnounce.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="text-3xl mb-1">전법</div>
          )}
          <div className="text-xl font-black text-white">{tacticAnnounce.name}</div>
        </div>
      </div>
    </div>
  );
}

function TurnAnnouncement({ turnAnnounce }: { turnAnnounce: string | null }) {
  if (!turnAnnounce) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="text-center" style={{ animation: 'turnAnnounce 0.35s ease-out forwards' }}>
        <div
          className="text-3xl font-black text-white"
          style={{ textShadow: '0 0 20px rgba(255,200,0,0.6), 0 2px 8px rgba(0,0,0,0.8)' }}
        >
          {turnAnnounce}
        </div>
      </div>
    </div>
  );
}

function FieldEventBanner({ showFieldEvent, battle }: { showFieldEvent: boolean; battle: BattleState }) {
  if (!showFieldEvent) return null;

  return (
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
  );
}

function SynergyBanner({ showSynergy, battle }: { showSynergy: boolean; battle: BattleState }) {
  if (!showSynergy || !battle.activeSynergies || battle.activeSynergies.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ animation: 'synergyPulse 1.2s ease-out forwards' }}
    >
      {battle.activeSynergies.map((syn, i) => (
        <div key={i} className="text-center">
          <div
            className={`text-5xl mb-2 ${
              syn.faction === '위'
                ? 'text-blue-400'
                : syn.faction === '촉'
                  ? 'text-red-400'
                  : syn.faction === '오'
                    ? 'text-green-400'
                    : 'text-purple-400'
            }`}
          >
            {syn.faction === '위'
              ? '🛡️'
              : syn.faction === '촉'
                ? '⚔️'
                : syn.faction === '오'
                  ? '🧠'
                  : '👑'}
          </div>
          <div className="text-xl font-black text-white mb-1">{syn.faction} 세력 시너지!</div>
          <div
            className={`text-lg font-bold ${
              syn.faction === '위'
                ? 'text-blue-300'
                : syn.faction === '촉'
                  ? 'text-red-300'
                  : syn.faction === '오'
                    ? 'text-green-300'
                    : 'text-purple-300'
            }`}
          >
            {syn.effect}
          </div>
        </div>
      ))}
    </div>
  );
}

function UltimateOverlay({ showUltimate }: { showUltimate: { cardId: string; skillName: string } | null }) {
  if (!showUltimate) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" style={{ animation: 'ultimateFlash 0.8s ease-out forwards' }} />
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
  );
}

function LiveLogPanel({ liveLog }: { liveLog: LiveLogEntry[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  if (liveLog.length === 0) return null;

  return (
    <div className="fixed top-20 right-3 sm:right-4 z-30 pointer-events-none space-y-1 w-[58vw] sm:w-[320px] max-w-[320px]">
      {liveLog.map((entry) => {
        const age = now - entry.timestamp;
        const isFading = age > 3800;
        return (
          <div
            key={entry.id}
            className="text-[11px] sm:text-xs px-2.5 py-1.5 bg-black/72 border border-gray-600/45 rounded-lg text-gray-200 backdrop-blur-sm text-right leading-tight truncate"
            style={{
              animation: isFading ? 'liveLogOut 0.5s ease-out forwards' : 'liveLogIn 0.3s ease-out',
            }}
          >
            {entry.text}
          </div>
        );
      })}
    </div>
  );
}

export default function BattleOverlays({
  battle,
  showFieldEvent,
  showSynergy,
  showUltimate,
  turnAnnounce,
  tacticAnnounce,
  skillBanner,
  liveLog,
}: Props) {
  return (
    <>
      <FieldEventBanner showFieldEvent={showFieldEvent} battle={battle} />
      <SynergyBanner showSynergy={showSynergy} battle={battle} />
      <UltimateOverlay showUltimate={showUltimate} />
      <TurnAnnouncement turnAnnounce={turnAnnounce} />
      <TacticAnnounceOverlay tacticAnnounce={tacticAnnounce} />
      <SkillBannerOverlay skillBanner={skillBanner} />
      <LiveLogPanel liveLog={liveLog} />
    </>
  );
}
