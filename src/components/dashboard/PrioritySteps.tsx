interface PriorityStepsProps {
  priorities: string[];
}

export function PrioritySteps({ priorities }: PriorityStepsProps) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-[10px] mb-4">
        <span className="text-[15px] font-bold text-text-v1 tracking-[-0.01em]">Next Month Priorities</span>
      </div>
      <div className="space-y-3">
        {priorities.map((text, i) => (
          <div key={i} className="flex gap-4 items-start bg-surface border border-border-v1 rounded-[11px] px-5 py-4">
            <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue-border text-blue font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-[13.5px] text-text-2 leading-[1.65]">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
