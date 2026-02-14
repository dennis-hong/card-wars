'use client';

import { Card, Grade, MAX_LEVEL, OwnedCard, GRADE_COLORS, GRADE_LABELS, GRADE_NAMES, FACTION_COLORS } from '@/types/game';
import { getTacticEffectLines } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';

type ActionTone = 'primary' | 'accent' | 'danger' | 'neutral';

interface CardDetailAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: ActionTone;
  hint?: string;
}

interface Props {
  card: Card | null;
  owned?: OwnedCard | null;
  ownedCount?: number;
  isNew?: boolean;
  sourceTag?: string;
  onClose: () => void;
  primaryAction?: CardDetailAction;
  secondaryAction?: CardDetailAction;
}

const ACTION_TONE_CLASSES: Record<ActionTone, string> = {
  primary: 'bg-blue-600 text-white border-blue-500/60',
  accent: 'bg-amber-600 text-white border-amber-500/60',
  danger: 'bg-red-600 text-white border-red-500/60',
  neutral: 'bg-slate-700 text-slate-200 border-slate-500/60',
};

const SKILL_TYPE_LABEL = {
  active: '액티브',
  passive: '패시브',
  ultimate: '궁극기',
} as const;

const SKILL_TYPE_COLORS = {
  active: 'text-green-300 border-green-500/40 bg-green-900/20',
  passive: 'text-blue-300 border-blue-500/40 bg-blue-900/20',
  ultimate: 'text-amber-300 border-amber-500/40 bg-amber-900/20',
} as const;

const SKILL_TIMING = {
  active: '턴 시작/조건부 발동',
  passive: '전투 중 지속/조건 발동',
  ultimate: '궁극기 조건 충족 시 1회',
} as const;

const FACTION_SYNERGY: Record<'위' | '촉' | '오' | '군벌', { minor: string; major: string; tip: string }> = {
  '위': {
    minor: '2무장: 방어 +1',
    major: '3무장: 방어 +2',
    tip: '장기전과 라인 유지에 강합니다.',
  },
  '촉': {
    minor: '2무장: 무력 +1',
    major: '3무장: 무력 +2',
    tip: '빠른 압박과 마무리 속도가 높습니다.',
  },
  '오': {
    minor: '2무장: 지력 +1',
    major: '3무장: 지력 +2',
    tip: '스킬/전법 중심 운영과 궁합이 좋습니다.',
  },
  '군벌': {
    minor: '2무장: 통솔 +1 (HP +3)',
    major: '3무장: 통솔 +2 (HP +6)',
    tip: '생존력 기반의 반격 운영에 유리합니다.',
  },
};

function getEstimatedLane(attack: number, command: number, intel: number, defense: number) {
  const frontlineScore = defense + command;
  if (frontlineScore >= attack + 4) return '전위 추천';
  if (intel >= attack + 1) return '후위 추천';
  return '중위 추천';
}

function getTacticRole(description: string): string[] {
  const tags: string[] = [];
  if (description.includes('전체')) tags.push('광역');
  if (description.includes('회복')) tags.push('회복');
  if (description.includes('기절') || description.includes('도발')) tags.push('제어');
  if (description.includes('상승') || description.includes('증가')) tags.push('버프');
  if (description.includes('감소') || description.includes('무효')) tags.push('디버프');
  return tags.length > 0 ? tags.slice(0, 3) : ['전술'];
}

function ActionButton({ action, full }: { action: CardDetailAction; full?: boolean }) {
  const tone = action.tone ?? 'primary';
  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      className={`rounded-xl border px-4 py-3 font-bold transition-all ${
        full ? 'w-full' : ''
      } ${action.disabled ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : ACTION_TONE_CLASSES[tone]}`}
    >
      {action.label}
    </button>
  );
}

export default function CardDetailModal({
  card,
  owned,
  ownedCount = 0,
  isNew,
  sourceTag,
  onClose,
  primaryAction,
  secondaryAction,
}: Props) {
  if (!card) return null;

  const grade = card.grade as Grade;
  const level = Math.max(1, owned?.level ?? 1);
  const maxLevel = MAX_LEVEL[grade];
  const levelRatio = Math.min(100, Math.round((level / maxLevel) * 100));
  const countLabel = owned ? `${Math.max(1, ownedCount)}장 보유` : '신규 획득';

  const warriorStats = card.type === 'warrior'
    ? {
        attack: card.stats.attack + (level - 1),
        command: card.stats.command + (level - 1),
        intel: card.stats.intel + (level - 1),
        defense: card.stats.defense + Math.floor((level - 1) * 0.5),
      }
    : null;

  const hp = warriorStats ? warriorStats.command * 3 : null;
  const damageSamples = warriorStats
    ? [2, 5, 8].map((defense) => ({ defense, damage: Math.max(1, warriorStats.attack - defense) }))
    : [];
  const tacticEffectLines = card.type === 'tactic' ? getTacticEffectLines(card, level) : [];

  const tacticTags = card.type === 'tactic' ? getTacticRole(card.description) : [];

  return (
    <div className="fixed inset-0 z-[90] bg-black/88 backdrop-blur-sm">
      <div className="mx-auto flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-slate-950/95">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-3">
          <div className="flex items-center gap-2">
            {sourceTag && <span className="text-[11px] font-bold tracking-wide text-slate-400">{sourceTag}</span>}
            {isNew && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">NEW</span>}
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:text-white">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-6">
          <div className="mb-4 flex flex-col items-center">
            {card.type === 'warrior' ? (
              <WarriorCardView card={card} owned={owned ?? undefined} size="lg" showDetails />
            ) : (
              <TacticCardView card={card} owned={owned ?? undefined} size="lg" />
            )}
          </div>

          <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-white">{card.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5" style={{ color: GRADE_COLORS[grade] }}>
                    {GRADE_LABELS[grade]} {GRADE_NAMES[grade]}
                  </span>
                  {card.type === 'warrior' ? (
                    <span
                      className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5"
                      style={{ color: FACTION_COLORS[card.faction] }}
                    >
                      {card.faction}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-violet-300">전법</span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">
                <div>{countLabel}</div>
                <div className="mt-0.5">Lv.{level} / {maxLevel}</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-700/70">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${levelRatio}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-slate-400">성장 진행도 {levelRatio}%</div>
            </div>
          </div>

          {card.type === 'warrior' && warriorStats && (
            <>
              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 text-sm font-bold text-slate-200">전투 인사이트</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-black/25 p-2"><span className="text-red-300">⚔️ 무력</span> <span className="font-bold">{warriorStats.attack}</span></div>
                  <div className="rounded-lg bg-black/25 p-2"><span className="text-green-300">🛡️ 통솔</span> <span className="font-bold">{warriorStats.command}</span></div>
                  <div className="rounded-lg bg-black/25 p-2"><span className="text-blue-300">🧠 지력</span> <span className="font-bold">{warriorStats.intel}</span></div>
                  <div className="rounded-lg bg-black/25 p-2"><span className="text-yellow-300">🏰 방어</span> <span className="font-bold">{warriorStats.defense}</span></div>
                </div>
                <div className="mt-2 text-xs text-slate-300">예상 생존력: HP {hp} ({getEstimatedLane(warriorStats.attack, warriorStats.command, warriorStats.intel, warriorStats.defense)})</div>
              </div>

              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 text-sm font-bold text-slate-200">기본 공격 예상 피해</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {damageSamples.map((sample) => (
                    <div key={sample.defense} className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-slate-200">
                      적 방어 {sample.defense}: <span className="font-bold text-red-300">{sample.damage}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 text-sm font-bold text-slate-200">스킬 상세</div>
                <div className="space-y-2">
                  {card.skills.map((skill) => (
                    <div key={skill.name} className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SKILL_TYPE_COLORS[skill.type]}`}>
                          {SKILL_TYPE_LABEL[skill.type]}
                        </span>
                        <span className="text-sm font-bold text-white">{skill.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{SKILL_TIMING[skill.type]}</div>
                      <div className="mt-1 text-xs text-slate-200">{skill.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 text-sm font-bold text-slate-200">세력 시너지</div>
                <div className="rounded-lg bg-black/25 p-3 text-xs text-slate-200">
                  <div>{FACTION_SYNERGY[card.faction].minor}</div>
                  <div className="mt-1">{FACTION_SYNERGY[card.faction].major}</div>
                  <div className="mt-2 text-slate-400">{FACTION_SYNERGY[card.faction].tip}</div>
                </div>
              </div>
            </>
          )}

          {card.type === 'tactic' && (
            <>
              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 text-sm font-bold text-slate-200">전법 효과</div>
                <div className="rounded-lg bg-black/25 p-3">
                  <div className="text-sm text-slate-100">{card.description}</div>
                  <div className="mt-2 space-y-1 text-xs text-emerald-200">
                    {tacticEffectLines.map((line, index) => (
                      <div key={`${card.id}-detail-${index}`}>• {line}</div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-300">
                  기반 능력치: {card.baseStat === 'none' ? '능력치 무관' : card.baseStat}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {card.baseStat === '지력' && '지력이 높은 무장 중심 덱에서 효율이 상승합니다.'}
                  {card.baseStat === '무력' && '무력이 높은 무장으로 마무리 각을 잡을 때 좋습니다.'}
                  {card.baseStat === 'none' && '상황 대응형 전법으로 덱 안정성을 높입니다.'}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 text-sm font-bold text-slate-200">전략 태그</div>
                <div className="flex flex-wrap gap-2">
                  {tacticTags.map((tag) => (
                    <span key={tag} className="rounded-full border border-violet-500/35 bg-violet-900/20 px-2 py-1 text-xs font-bold text-violet-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="border-t border-white/10 bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto flex w-full max-w-2xl gap-2">
              {secondaryAction && <ActionButton action={secondaryAction} />}
              {primaryAction && <ActionButton action={primaryAction} full={!secondaryAction} />}
            </div>
            {primaryAction?.hint && (
              <div className="mx-auto mt-2 w-full max-w-2xl text-center text-[11px] text-slate-400">{primaryAction.hint}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
