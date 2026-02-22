'use client';

interface Props {
  label?: string;
  className?: string;
}

export default function LoadingScreen({ label = '로딩 중...', className }: Props) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-[#040d24] px-6 ${className ?? ''}`}>
      <div className="w-full max-w-[220px] space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
        <div className="ui-loading-skeleton h-2.5 w-2/3 rounded-full" />
        <div className="ui-loading-skeleton h-2.5 w-full rounded-full" />
        <div className="ui-loading-skeleton h-2.5 w-5/6 rounded-full" />
      </div>
      <div className="mt-4 text-sm font-semibold tracking-wide text-slate-200/80">{label}</div>
    </div>
  );
}
