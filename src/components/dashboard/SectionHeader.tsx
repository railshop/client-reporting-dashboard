interface SectionHeaderProps {
  title: string;
  tag?: string;
}

export function SectionHeader({ title, tag }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-[10px] mb-4">
      <span className="text-[15px] font-bold text-text-v1 tracking-[-0.01em]">{title}</span>
      {tag && (
        <span className="font-mono text-[9px] text-blue bg-blue-glow border border-blue-border rounded px-2 py-[2px] uppercase tracking-[0.08em]">
          {tag}
        </span>
      )}
    </div>
  );
}
