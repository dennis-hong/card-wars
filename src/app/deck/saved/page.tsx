'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SFX } from '@/lib/sound';

function DeckSavedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedDeckName = searchParams.get('name') ?? '덱';

  return (
    <div className="min-h-screen ui-page flex items-center justify-center p-4">
      <div className="text-center max-w-xs w-full">
        <div className="text-5xl mb-4">✅</div>
        <div className="text-xl font-bold text-white mb-2">저장 완료!</div>
        <div className="text-sm text-gray-400 mb-8">
          &apos;{savedDeckName}&apos; 덱이 활성 덱으로 설정되었습니다.
        </div>
        <div className="space-y-3">
          <button
            onClick={() => {
              SFX.buttonClick();
              router.push('/battle');
            }}
            className="ui-btn ui-btn-danger w-full py-4 text-lg"
          >
            ⚔️ 바로 전투!
          </button>
          <button
            onClick={() => {
              SFX.buttonClick();
              router.push('/deck');
            }}
            className="ui-btn ui-btn-neutral w-full py-3"
          >
            🃏 덱 목록
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeckSavedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen ui-page flex items-center justify-center p-4">
          <div className="text-center text-sm text-gray-400">페이지를 불러오는 중...</div>
        </div>
      }
    >
      <DeckSavedPageContent />
    </Suspense>
  );
}
