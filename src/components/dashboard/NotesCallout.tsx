interface NotesCalloutProps {
  title: string;
  notes: string; // newline-separated bullet points
}

export function NotesCallout({ title, notes }: NotesCalloutProps) {
  const items = notes.split('\n').filter((n) => n.trim());

  return (
    <div className="bg-v1-gold/[0.06] border border-v1-gold/20 rounded-[11px] p-5 mb-7">
      <div className="font-mono text-[10px] font-semibold text-v1-gold uppercase tracking-[0.08em] mb-3">
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-[13px] text-text-2 leading-[1.65] pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-[5px] before:h-[5px] before:rounded-full before:bg-v1-gold/40">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
