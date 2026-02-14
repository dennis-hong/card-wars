'use client';

import { motion } from 'motion/react';
import { Card } from '@/types/game';
import { getCardById } from '@/data/cards';
import WarriorCardView from '@/components/card/WarriorCardView';
import TacticCardView from '@/components/card/TacticCardView';

interface Props {
  cards: Card[];
  onCardClick: (card: Card, isNew: boolean) => void;
  onDone: () => void;
  remainingPacks: number;
  ownedBefore: Set<string>;
}

export default function PackSummaryModal({
  cards,
  onCardClick,
  onDone,
  remainingPacks,
  ownedBefore,
}: Props) {
  const sorted = [...cards].sort((a, b) => b.grade - a.grade);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="text-2xl font-bold mb-6 text-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: '#fde047' }}
      >
        획득한 카드
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3 max-w-lg mb-8">
        {sorted.map((card, i) => {
          const cardData = getCardById(card.id);
          if (!cardData) return null;
          const isNew = !ownedBefore.has(card.id);

          return (
            <motion.div
              key={`${card.id}-${i}`}
              className="relative cursor-pointer"
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 180, damping: 20 }}
              onClick={() => onCardClick(card, isNew)}
            >
              {cardData.type === 'warrior' ? (
                <WarriorCardView card={cardData} size="md" showDetails />
              ) : (
                <TacticCardView card={cardData} size="md" />
              )}
              <div
                className={`absolute -top-2 -right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isNew ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-200'
                }`}
              >
                {isNew ? 'NEW' : 'DUP'}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        onClick={onDone}
        className="ui-btn px-8 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold rounded-xl"
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {remainingPacks > 0 ? `다음 팩 개봉 (${remainingPacks}개 남음)` : '확인'}
      </motion.button>
    </motion.div>
  );
}
