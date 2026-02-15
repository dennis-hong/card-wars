'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getEventById } from '@/lib/roguelike/events';
import RunHeader from '@/components/roguelike/RunHeader';
import { useRunContext } from '@/context/run-context';

export default function RoguelikeEventPage() {
  const router = useRouter();
  const { state, chooseEvent } = useRunContext();

  const event = useMemo(() => {
    if (!state.pendingEventId) return null;
    return getEventById(state.pendingEventId);
  }, [state.pendingEventId]);

  if (!event) {
    return (
      <div className="min-h-screen ui-page flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-white">진행할 이벤트가 없습니다.</div>
          <button onClick={() => router.push('/roguelike/map')} className="ui-btn ui-btn-primary w-full py-3">
            맵으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <RunHeader />

      <div className="p-4">
        <div className="rounded-2xl border border-white/15 bg-black/40 p-4">
          <div className="text-2xl mb-1">{event.icon}</div>
          <h1 className="text-lg font-black">{event.title}</h1>
          <p className="text-sm text-gray-300 mt-2">{event.flavor}</p>
        </div>

        <div className="mt-4 space-y-3">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => {
                chooseEvent(choice.id);
                router.push('/roguelike/map');
              }}
              className="w-full rounded-xl border border-white/20 bg-black/30 p-3 text-left hover:bg-black/50"
            >
              <div className="font-bold text-white">{choice.title}</div>
              <div className="text-sm text-gray-300 mt-1">{choice.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
