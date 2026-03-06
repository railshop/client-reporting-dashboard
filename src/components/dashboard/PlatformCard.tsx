interface PlatformCardProps {
  platform: string;
  metrics: { label: string; value: string }[];
  spend: string;
}

export function PlatformCard({ platform, metrics, spend }: PlatformCardProps) {
  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] p-5 hover:border-border-2 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-[13px] text-text-v1">{platform}</span>
        <span className="font-mono text-[10px] text-v1-gold font-medium">{spend}</span>
      </div>
      <div className="flex gap-6">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="font-mono text-[9px] text-text-3 uppercase tracking-[0.1em] mb-1">{m.label}</div>
            <div className="text-[20px] font-extrabold text-blue tracking-[-0.02em]">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
