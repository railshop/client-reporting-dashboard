import { useState } from 'react';
import { apiFetch } from '@/lib/api';

const TEXTAREA_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-2 text-[12px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors resize-y';

interface NotesEditorProps {
  notes: string;
  onChange: (notes: string) => void;
  label?: string;
  aiContext?: {
    type: 'section' | 'overview';
    source?: string;
    kpis?: any[];
    tables?: Record<string, any>;
    campaigns?: any[];
  };
}

export function NotesEditor({ notes, onChange, label = 'RAILSHOP NOTES', aiContext }: NotesEditorProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const handleGenerate = async () => {
    if (!aiContext) return;
    setGenerating(true);
    try {
      const result = await apiFetch<{ summary: string }>('/ai-generate-summary', {
        method: 'POST',
        body: JSON.stringify({
          type: aiContext.type,
          source: aiContext.source,
          kpis: aiContext.kpis,
          tables: aiContext.tables,
          campaigns: aiContext.campaigns,
          userPrompt: userPrompt || undefined,
        }),
      });
      onChange(result.summary);
      setShowPrompt(false);
      setUserPrompt('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] text-text-3 tracking-[0.05em]">{label}</div>
        {aiContext && (
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors"
          >
            {showPrompt ? 'CANCEL' : 'AI GENERATE'}
          </button>
        )}
      </div>
      {showPrompt && aiContext && (
        <div className="mb-2 space-y-2">
          <input
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-1.5 text-[11px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors"
            placeholder="Optional context (e.g. 'mention we focused on lead gen this month')..."
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="font-mono text-[9px] tracking-[0.05em] text-bg bg-blue px-3 py-1 rounded-lg hover:bg-blue-dim transition-colors disabled:opacity-50"
          >
            {generating ? 'GENERATING...' : 'GENERATE SUMMARY'}
          </button>
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={TEXTAREA_CLS}
        placeholder="Analysis notes, insights, recommendations..."
      />
    </div>
  );
}
