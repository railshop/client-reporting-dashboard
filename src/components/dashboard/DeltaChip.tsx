import { cn } from '@/lib/utils';

interface DeltaChipProps {
  delta: string;
  direction: 'up' | 'down' | 'neutral';
}

export function DeltaChip({ delta, direction }: DeltaChipProps) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '';

  return (
    <span
      className={cn(
        'font-mono text-[10px] font-medium px-[7px] py-[2px] rounded',
        direction === 'up' && 'bg-v1-green/10 text-v1-green',
        direction === 'down' && 'bg-v1-red/10 text-v1-red',
        direction === 'neutral' && 'bg-surface-2 text-text-3'
      )}
    >
      {arrow}{arrow ? ' ' : ''}{delta}
    </span>
  );
}
