const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-1.5 text-[12px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';

interface PriorityEditorProps {
  priorities: string[];
  onChange: (priorities: string[]) => void;
}

export function PriorityEditor({ priorities, onChange }: PriorityEditorProps) {
  const update = (index: number, value: string) => {
    const updated = [...priorities];
    updated[index] = value;
    onChange(updated);
  };

  const add = () => onChange([...priorities, '']);
  const remove = (index: number) => onChange(priorities.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] text-text-3 tracking-[0.05em]">PRIORITIES</div>
        <button type="button" onClick={add} className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors">
          + ADD
        </button>
      </div>
      <div className="space-y-1.5">
        {priorities.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-3 w-5 shrink-0">{i + 1}.</span>
            <input
              value={p}
              onChange={(e) => update(i, e.target.value)}
              className={INPUT_CLS}
              placeholder="Priority item..."
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="font-mono text-[10px] text-text-3 hover:text-red transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        {priorities.length === 0 && (
          <div className="text-text-3 text-[11px]">No priorities yet.</div>
        )}
      </div>
    </div>
  );
}
