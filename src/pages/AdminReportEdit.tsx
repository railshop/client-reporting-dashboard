import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReport } from '@/hooks/useReport';
import { apiFetch } from '@/lib/api';
import { formatPeriod } from '@/lib/utils';
import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { KpiEditor } from '@/components/admin/KpiEditor';
import { TableEditor } from '@/components/admin/TableEditor';
import { PriorityEditor } from '@/components/admin/PriorityEditor';
import { NotesEditor } from '@/components/admin/NotesEditor';
import { RawDataViewer } from '@/components/admin/RawDataViewer';
import { CsvUploadPanel } from '@/components/admin/CsvUploadPanel';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { KpiItem, TableDef, Overview } from '@/shared/schemas/common';
import type { ReportSection } from '@/types/report';

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-1.5 text-[12px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';
const LABEL_CLS = 'block font-mono text-[10px] text-text-3 mb-1.5 tracking-[0.05em]';

const ALL_SOURCES: SourceType[] = ['ga4', 'gsc', 'google_ads', 'meta', 'lsa', 'servicetitan', 'gbp'];

interface RawIngestion {
  id: string;
  source: string;
  raw_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

// ── Data Ingestion Panel ──

function IngestionPanel({
  clientSlug,
  periodStart,
}: {
  clientSlug: string;
  periodStart: string;
}) {
  const [ingesting, setIngesting] = useState(false);
  const [ingestions, setIngestions] = useState<RawIngestion[]>([]);
  const [loadingIngestions, setLoadingIngestions] = useState(true);
  const [results, setResults] = useState<Record<string, { status: string; error?: string }> | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadIngestions = () => {
    setLoadingIngestions(true);
    apiFetch<{ ingestions: RawIngestion[] }>(
      `/raw-ingestions-list?clientSlug=${clientSlug}&periodStart=${periodStart}`
    )
      .then((res) => setIngestions(res.ingestions))
      .catch(() => setIngestions([]))
      .finally(() => setLoadingIngestions(false));
  };

  useEffect(() => {
    loadIngestions();
  }, [clientSlug, periodStart]);

  const handlePullData = async () => {
    setIngesting(true);
    setResults(null);
    try {
      const res = await apiFetch<{ results: Record<string, { status: string; error?: string }> }>(
        '/data-ingest',
        {
          method: 'POST',
          body: JSON.stringify({ clientSlug, periodStart }),
        }
      );
      setResults(res.results);
      loadIngestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] px-6 py-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em]">
          Data Ingestion
        </div>
        <div className="flex items-center gap-2">
          {ingestions.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {ingestions.length} source{ingestions.length !== 1 ? 's' : ''} ingested
            </Badge>
          )}
          <CsvUploadPanel
            clientSlug={clientSlug}
            periodStart={periodStart}
            onUploaded={loadIngestions}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePullData}
            disabled={ingesting}
          >
            {ingesting ? 'Pulling...' : 'Pull Data'}
          </Button>
        </div>
      </div>

      {/* Pull results */}
      {results && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {Object.entries(results).map(([source, result]) => (
            <div
              key={source}
              className={cn(
                'rounded-lg px-3 py-2 text-[11px] border',
                result.status === 'success'
                  ? 'bg-v1-green/10 border-v1-green/20 text-v1-green'
                  : result.status === 'error'
                    ? 'bg-red/10 border-red/20 text-red'
                    : 'bg-surface-2 border-border-v1 text-text-3'
              )}
            >
              <div className="font-semibold">{SOURCE_LABELS[source as SourceType] || source}</div>
              <div className="text-[10px] mt-0.5">
                {result.status === 'success' ? 'Pulled' : result.status === 'error' ? result.error : 'Skipped'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw data viewer toggle */}
      {ingestions.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="font-mono text-[10px] text-blue hover:text-blue-dim transition-colors"
          >
            {expanded ? 'HIDE RAW DATA ▾' : 'VIEW RAW DATA ▸'}
          </button>
          {expanded && !loadingIngestions && (
            <div className="mt-3 min-w-0 overflow-hidden">
              <RawDataViewer ingestions={ingestions} />
            </div>
          )}
        </>
      )}

      {loadingIngestions && ingestions.length === 0 && (
        <div className="text-sm text-muted-foreground animate-pulse">Loading ingestion data...</div>
      )}
    </div>
  );
}

// ── AI Report Generation Panel ──

function AIGeneratePanel({
  clientSlug,
  periodStart,
  onGenerated,
}: {
  clientSlug: string;
  periodStart: string;
  onGenerated: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiFetch('/report-generate-ai', {
        method: 'POST',
        body: JSON.stringify({
          clientSlug,
          periodStart,
          prompt: prompt || undefined,
        }),
      });
      setShowPrompt(false);
      setPrompt('');
      onGenerated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] px-6 py-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em]">
          AI Report Generation
        </div>
        <button
          type="button"
          onClick={() => setShowPrompt(!showPrompt)}
          className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors"
        >
          {showPrompt ? 'CANCEL' : 'ADD GUIDANCE'}
        </button>
      </div>

      <p className="text-[12px] text-muted-foreground mb-3">
        Generate a complete report from ingested raw data using AI. This will create the overview, all section KPIs, tables, notes, and priorities.
      </p>

      {showPrompt && (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className={INPUT_CLS + ' resize-y mb-3'}
          placeholder="Optional guidance (e.g. 'Focus on lead generation performance', 'Highlight the Meta spend increase')..."
        />
      )}

      <Button
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? 'Generating with AI...' : 'Generate Report with AI'}
      </Button>
    </div>
  );
}

// ── Overview Editor ──

function OverviewEditor({
  reportPeriodId,
  overview,
  notes,
  priorities,
  onSaved,
}: {
  reportPeriodId: string;
  overview: Overview;
  notes: string;
  priorities: string[];
  onSaved: () => void;
}) {
  const [headline, setHeadline] = useState(overview.headline ?? '');
  const [summary, setSummary] = useState(overview.summary ?? '');
  const [heroStats, setHeroStats] = useState<KpiItem[]>(overview.hero_stats ?? []);
  const [platformCards, setPlatformCards] = useState(overview.platform_cards ?? []);
  const [rnotes, setRnotes] = useState(notes);
  const [prios, setPrios] = useState(priorities);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const result = await apiFetch<{ summary: string }>('/ai-generate-summary', {
        method: 'POST',
        body: JSON.stringify({
          type: 'overview',
          kpis: heroStats,
          tables: Object.fromEntries(platformCards.map((c, i) => [`platform_${i}`, { title: c.platform, metrics: c.metrics, spend: c.spend }])),
          userPrompt: aiPrompt || undefined,
        }),
      });
      setSummary(result.summary);
      setShowAiPrompt(false);
      setAiPrompt('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/report-update', {
        method: 'PUT',
        body: JSON.stringify({
          reportPeriodId,
          overview: {
            headline,
            summary,
            hero_stats: heroStats,
            platform_cards: platformCards,
          },
          railshop_notes: rnotes,
          next_priorities: prios,
        }),
      });
      onSaved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Platform card helpers
  const addPlatformCard = () =>
    setPlatformCards([...platformCards, { platform: '', metrics: [{ label: '', value: '' }], spend: '' }]);

  const updatePlatformCard = (i: number, field: string, value: any) => {
    const cards = [...platformCards];
    cards[i] = { ...cards[i], [field]: value };
    setPlatformCards(cards);
  };

  const removePlatformCard = (i: number) =>
    setPlatformCards(platformCards.filter((_, idx) => idx !== i));

  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] px-6 py-5 mb-6">
      <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em] mb-4">
        Overview
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className={LABEL_CLS}>HEADLINE</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} className={INPUT_CLS} placeholder="Monthly performance headline..." />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-mono text-[10px] text-text-3 tracking-[0.05em]">SUMMARY</label>
            <button
              type="button"
              onClick={() => setShowAiPrompt(!showAiPrompt)}
              className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors"
            >
              {showAiPrompt ? 'CANCEL' : 'AI GENERATE'}
            </button>
          </div>
          {showAiPrompt && (
            <div className="mb-2 flex gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className={INPUT_CLS}
                placeholder="Optional context for the AI..."
              />
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="shrink-0 font-mono text-[9px] tracking-[0.05em] text-bg bg-blue px-3 py-1.5 rounded-lg hover:bg-blue-dim transition-colors disabled:opacity-50"
              >
                {generatingSummary ? 'GENERATING...' : 'GENERATE'}
              </button>
            </div>
          )}
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className={INPUT_CLS + ' resize-y'} placeholder="Executive summary..." />
        </div>
      </div>

      <div className="mb-4">
        <KpiEditor kpis={heroStats} onChange={setHeroStats} />
      </div>

      {/* Platform Cards */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] text-text-3 tracking-[0.05em]">PLATFORM CARDS</div>
          <button type="button" onClick={addPlatformCard} className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors">
            + ADD CARD
          </button>
        </div>
        <div className="space-y-3">
          {platformCards.map((card, ci) => (
            <div key={ci} className="bg-surface-2 border border-border-v1 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <input value={card.platform} onChange={(e) => updatePlatformCard(ci, 'platform', e.target.value)} className={INPUT_CLS + ' max-w-[200px]'} placeholder="Platform name" />
                <input value={card.spend} onChange={(e) => updatePlatformCard(ci, 'spend', e.target.value)} className={INPUT_CLS + ' max-w-[120px]'} placeholder="$0.00" />
                <button type="button" onClick={() => removePlatformCard(ci)} className="font-mono text-[9px] text-text-3 hover:text-red transition-colors ml-auto">
                  REMOVE
                </button>
              </div>
              <div className="space-y-1">
                {card.metrics.map((m: { label: string; value: string }, mi: number) => (
                  <div key={mi} className="flex gap-2">
                    <input
                      value={m.label}
                      onChange={(e) => {
                        const metrics = [...card.metrics];
                        metrics[mi] = { ...metrics[mi], label: e.target.value };
                        updatePlatformCard(ci, 'metrics', metrics);
                      }}
                      className={INPUT_CLS}
                      placeholder="Metric label"
                    />
                    <input
                      value={m.value}
                      onChange={(e) => {
                        const metrics = [...card.metrics];
                        metrics[mi] = { ...metrics[mi], value: e.target.value };
                        updatePlatformCard(ci, 'metrics', metrics);
                      }}
                      className={INPUT_CLS + ' max-w-[120px]'}
                      placeholder="Value"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const metrics = card.metrics.filter((_: any, idx: number) => idx !== mi);
                        updatePlatformCard(ci, 'metrics', metrics);
                      }}
                      className="text-text-3 hover:text-red text-[9px] shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updatePlatformCard(ci, 'metrics', [...card.metrics, { label: '', value: '' }])}
                  className="font-mono text-[9px] text-blue hover:text-blue-dim"
                >
                  + metric
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <NotesEditor
          notes={rnotes}
          onChange={setRnotes}
          aiContext={{
            type: 'overview',
            kpis: heroStats,
            tables: Object.fromEntries(platformCards.map((c, i) => [`platform_${i}`, { title: c.platform, metrics: c.metrics, spend: c.spend }])),
          }}
        />
        <PriorityEditor priorities={prios} onChange={setPrios} />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Overview'}
      </Button>
    </div>
  );
}

// ── Section Editor ──

function SectionEditor({
  reportPeriodId,
  source,
  section,
  onSaved,
}: {
  reportPeriodId: string;
  source: SourceType;
  section: ReportSection | null;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(!!section);
  const [kpis, setKpis] = useState<KpiItem[]>(section?.kpis ?? []);
  const [tables, setTables] = useState<Record<string, TableDef>>(section?.tables ?? {});
  const [notes, setNotes] = useState(section?.railshop_notes ?? '');
  const [priorities, setPriorities] = useState<string[]>(section?.next_priorities ?? []);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);

  useEffect(() => {
    setKpis(section?.kpis ?? []);
    setTables(section?.tables ?? {});
    setNotes(section?.railshop_notes ?? '');
    setPriorities(section?.next_priorities ?? []);
  }, [section]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await apiFetch('/report-regenerate-section', {
        method: 'POST',
        body: JSON.stringify({
          reportPeriodId,
          source,
          prompt: regenPrompt || undefined,
        }),
      });
      setShowRegenPrompt(false);
      setRegenPrompt('');
      onSaved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apiFetch<{ section: { id: string } }>('/report-section-upsert', {
        method: 'PUT',
        body: JSON.stringify({
          reportPeriodId,
          source,
          kpis,
          tables,
          railshop_notes: notes,
          next_priorities: priorities,
        }),
      });

      if ((source === 'google_ads' || source === 'meta') && section?.campaigns?.length) {
        await apiFetch('/report-campaign-upsert', {
          method: 'PUT',
          body: JSON.stringify({
            reportSectionId: result.section.id,
            campaigns: section.campaigns,
          }),
        });
      }

      onSaved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addTable = () => {
    const key = `table_${Object.keys(tables).length}`;
    setTables({
      ...tables,
      [key]: { title: '', columns: [{ key: 'col_0', label: '', align: 'left' }], rows: [] },
    });
  };

  const updateTable = (key: string, table: TableDef) => {
    setTables({ ...tables, [key]: table });
  };

  const removeTable = (key: string) => {
    const { [key]: _, ...rest } = tables;
    setTables(rest);
  };

  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3.5 flex items-center justify-between text-left hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-text-v1">
            {SOURCE_LABELS[source]}
          </span>
          {section && (
            <span className="font-mono text-[9px] text-v1-green tracking-[0.05em]">
              {kpis.length} KPIs · {Object.keys(tables).length} tables
            </span>
          )}
          {!section && (
            <span className="font-mono text-[9px] text-text-3 tracking-[0.05em]">
              Empty
            </span>
          )}
        </div>
        <span className="text-text-3 text-[12px]">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="px-6 pb-5 border-t border-border-v1 pt-4">
          <div className="mb-4">
            <KpiEditor kpis={kpis} onChange={setKpis} />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] text-text-3 tracking-[0.05em]">TABLES</div>
              <button type="button" onClick={addTable} className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors">
                + ADD TABLE
              </button>
            </div>
            {Object.entries(tables).map(([key, table]) => (
              <div key={key} className="relative">
                <TableEditor table={table} onChange={(t) => updateTable(key, t)} />
                <button
                  type="button"
                  onClick={() => removeTable(key)}
                  className="absolute top-3 right-4 font-mono text-[9px] text-text-3 hover:text-red transition-colors"
                >
                  REMOVE TABLE
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <NotesEditor
              notes={notes}
              onChange={setNotes}
              aiContext={{
                type: 'section',
                source,
                kpis,
                tables,
                campaigns: section?.campaigns,
              }}
            />
            <PriorityEditor priorities={priorities} onChange={setPriorities} />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : `Save ${SOURCE_LABELS[source]}`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenPrompt(!showRegenPrompt)}
              disabled={regenerating}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate with AI'}
            </Button>
          </div>

          {showRegenPrompt && (
            <div className="mt-3 flex gap-2">
              <input
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                className={INPUT_CLS}
                placeholder="Optional guidance (e.g. 'Focus on conversion trends')..."
              />
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="shrink-0"
              >
                {regenerating ? 'Working...' : 'Regenerate'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export function AdminReportEditPage() {
  const { clientSlug, period } = useParams();
  const { report, loading, error, refetch } = useReport(clientSlug, period);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handlePublishToggle = async () => {
    if (!report) return;
    setPublishing(true);
    try {
      const action = report.period.status === 'published' ? 'unpublish' : 'publish';
      await apiFetch('/report-publish', {
        method: 'PUT',
        body: JSON.stringify({ reportPeriodId: report.period.id, action }),
      });
      refetch();
    } catch {
      // silent
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerate = async () => {
    if (!clientSlug || !period) return;
    setGenerating(true);
    try {
      await apiFetch('/report-generate', {
        method: 'POST',
        body: JSON.stringify({ clientSlug, periodStart: `${period}-01` }),
      });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm animate-pulse">Loading report...</div>;
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-sm mb-2">{error || 'Report not found'}</p>
        <Link to={`/admin/clients/${clientSlug}/reports`} className="text-primary text-sm hover:underline">
          Back to reports list
        </Link>
      </div>
    );
  }

  const sectionMap = Object.fromEntries(
    report.sections.map((s) => [s.source, s])
  );

  return (
    <>
      <AdminBreadcrumb items={[
        { label: clientSlug ?? '', href: `/admin/clients/${clientSlug}/profile` },
        { label: 'Reports', href: `/admin/clients/${clientSlug}/reports` },
        { label: formatPeriod(report.period.period_start) },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-2">
          {formatPeriod(report.period.period_start)}
        </h1>
        <div className="flex items-center gap-3">
          <span className={cn(
            'text-xs',
            report.period.status === 'published' ? 'text-primary' : 'text-muted-foreground'
          )}>
            {report.period.status === 'published' ? 'Published' : 'Draft'}
          </span>
          <Button
            variant={report.period.status === 'draft' ? 'default' : 'outline'}
            size="sm"
            onClick={handlePublishToggle}
            disabled={publishing}
          >
            {publishing ? '...' : report.period.status === 'draft' ? 'Publish' : 'Unpublish'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate (Mechanical)'}
          </Button>
        </div>
      </div>

      {/* Data Ingestion */}
      <IngestionPanel
        clientSlug={clientSlug!}
        periodStart={`${period}-01`}
      />

      {/* AI Report Generation */}
      <AIGeneratePanel
        clientSlug={clientSlug!}
        periodStart={`${period}-01`}
        onGenerated={refetch}
      />

      {/* Overview */}
      <OverviewEditor
        reportPeriodId={report.period.id}
        overview={report.period.overview || {}}
        notes={report.period.railshop_notes ?? ''}
        priorities={report.period.next_priorities ?? []}
        onSaved={refetch}
      />

      {/* Source Sections */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Source Sections
      </div>
      {ALL_SOURCES.map((source) => (
        <SectionEditor
          key={source}
          reportPeriodId={report.period.id}
          source={source}
          section={sectionMap[source] ?? null}
          onSaved={refetch}
        />
      ))}
    </>
  );
}
