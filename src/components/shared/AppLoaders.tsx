import { motion } from 'framer-motion';

interface LoadingPanelProps {
  minHeightClass?: string;
  roundedClass?: string;
  tone?: 'default' | 'muted';
}

export function LoadingPanel({
  minHeightClass = 'min-h-[16rem]',
  roundedClass = 'rounded-[1.6rem]',
  tone = 'default',
}: LoadingPanelProps) {
  const toneClass =
    tone === 'muted'
      ? 'bg-[rgba(209,223,229,0.42)]'
      : 'border border-[rgba(220,229,239,0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.9))] shadow-[0_8px_22px_rgba(107,148,165,0.05)]';

  return <div className={`${minHeightClass} ${roundedClass} ${toneClass} animate-pulse`} />;
}

export function SessionLoadingView() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="grid content-center justify-center min-h-[60dvh] p-6 text-center"
    >
      <div className="mb-4 text-[#6bb8d9] font-display text-4xl font-black tracking-[-0.05em]">
        <strong>Elio</strong>
      </div>
      <div className="bg-white/84 backdrop-blur-xl border border-[rgba(209,223,229,0.92)] rounded-[32px] p-10 shadow-[0_20px_60px_rgba(100,140,160,0.11)] animate-pulse">
        <div>
          <h1 className="text-[#203143] text-xl font-extrabold tracking-tight">Saioa kargatzen</h1>
          <p className="mt-2 text-[0.92rem] font-semibold text-[#7a8d9d]">Datuak prestatzen ari gara.</p>
        </div>
      </div>
    </motion.section>
  );
}
