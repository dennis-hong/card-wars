'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRunContext } from '@/context/run-context';
import { useGameStateContext } from '@/context/GameStateContext';

export default function SettingsPage() {
  const router = useRouter();
  const { clearRun } = useRunContext();
  const { resetGame } = useGameStateContext();

  const handleResetGame = () => {
    if (!confirm('정말 게임을 초기화하시겠습니까? 모든 진행 데이터가 삭제됩니다.')) {
      return;
    }

    resetGame();
    clearRun();
    router.push('/');
  };

  return (
    <div className="min-h-screen ui-page bg-gray-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8">
        <div className="w-full rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md">
          <h1 className="text-2xl font-black text-center">설정</h1>
          <p className="mt-2 text-center text-sm text-gray-300">게임 데이터 초기화</p>
          <button
            type="button"
            onClick={handleResetGame}
            className="ui-btn ui-btn-danger mt-5 w-full py-3"
          >
            게임 초기화
          </button>
          <Link
            href="/"
            className="mt-4 block w-full rounded-xl border border-white/15 bg-black/20 py-3 text-center text-sm font-bold text-gray-200 transition-all hover:bg-white/10"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
