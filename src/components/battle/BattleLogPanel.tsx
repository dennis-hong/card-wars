'use client';

interface LiveLogEntry {
  id: number;
  text: string;
  timestamp: number;
}

interface LiveLogPanelProps {
  logs: LiveLogEntry[];
}

export function BattleLiveLogPanel({ logs }: LiveLogPanelProps) {
  if (logs.length === 0) return null;

  return (
    <div className="fixed top-20 right-3 sm:right-4 z-30 pointer-events-none space-y-1 w-[58vw] sm:w-[320px] max-w-[320px]">
      {logs.map((entry) => {
        const age = Date.now() - entry.timestamp;
        const isFading = age > 3800;
        return (
          <div
            key={entry.id}
            className="text-[11px] sm:text-xs px-2.5 py-1.5 bg-black/72 border border-gray-600/45 rounded-lg text-gray-200 backdrop-blur-sm text-right leading-tight truncate"
            style={{ animation: isFading ? 'liveLogOut 0.5s ease-out forwards' : 'liveLogIn 0.3s ease-out' }}
          >
            {entry.text}
          </div>
        );
      })}
    </div>
  );
}

interface BattleLogPanelProps {
  open: boolean;
  log: string[];
  onClose: () => void;
}

export default function BattleLogPanel({ open, log, onClose }: BattleLogPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl p-4 max-w-md w-full max-h-[70vh] overflow-y-auto border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 sticky top-0 bg-gray-900/95 pb-2 border-b border-white/10">
          <h3 className="text-white font-bold text-lg">📜 전투 로그</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-1">
          {[...log].reverse().map((msg, i) => {
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
  );
}
