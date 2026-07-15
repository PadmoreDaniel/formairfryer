import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchFormAnalytics,
  isAnalyticsConfigured,
  AnalyticsSummary,
  StepFunnel,
} from '../services/analyticsService';

interface FormOption {
  id: string;
  name: string;
}

interface AnalyticsDashboardProps {
  forms: FormOption[];
  initialFormId?: string | null;
  onBack: () => void;
}

const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatPercent(v: number): string {
  if (!isFinite(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

export function AnalyticsDashboard({ forms, initialFormId, onBack }: AnalyticsDashboardProps) {
  const configured = isAnalyticsConfigured();
  const [selectedFormId, setSelectedFormId] = useState<string>(
    initialFormId || forms[0]?.id || ''
  );
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  const load = useCallback(async () => {
    if (!configured || !selectedFormId) return;
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchFormAnalytics(
        selectedFormId,
        isoDaysAgo(rangeDays),
        todayIso()
      );
      setData(summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [configured, selectedFormId, rangeDays]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>Form Analytics</h1>
        <div className="analytics-controls">
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            aria-label="Select form"
          >
            {forms.length === 0 && <option value="">No forms</option>}
            {forms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            aria-label="Date range"
          >
            {RANGE_PRESETS.map((r) => (
              <option key={r.days} value={r.days}>{r.label}</option>
            ))}
          </select>
          <button className="btn-small" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {!configured && (
        <div className="analytics-empty">
          <div className="empty-icon">📊</div>
          <h2>Analytics not configured</h2>
          <p>
            Set <code>REACT_APP_ANALYTICS_API</code> (and deploy the analytics
            backend) to view live form analytics here.
          </p>
        </div>
      )}

      {configured && error && (
        <div className="analytics-error">{error}</div>
      )}

      {configured && loading && !data && (
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics…</p>
        </div>
      )}

      {configured && !loading && data && data.views === 0 && (
        <div className="analytics-empty">
          <div className="empty-icon">📭</div>
          <h2>No data yet</h2>
          <p>Once this form receives traffic, funnel and drop-off data appears here.</p>
        </div>
      )}

      {configured && data && data.views > 0 && (
        <div className="analytics-content">
          <SummaryCards data={data} />
          <FunnelChart steps={data.steps} />
          <div className="analytics-two-col">
            <Breakdown title="By device" map={data.byDevice} />
            <Breakdown title="By source" map={data.bySource} />
          </div>
          <TrendChart trend={data.trend} />
        </div>
      )}
    </div>
  );
}

function SummaryCards({ data }: { data: AnalyticsSummary }) {
  const cards = [
    { label: 'Views', value: String(data.views) },
    { label: 'Starts', value: String(data.starts) },
    { label: 'Submissions', value: String(data.submissions) },
    { label: 'Completion rate', value: formatPercent(data.completionRate) },
    { label: 'Avg. time to complete', value: formatDuration(data.avgTimeToCompleteMs) },
    {
      label: 'Biggest drop-off',
      value: data.biggestDropStepIndex != null ? `Step ${data.biggestDropStepIndex + 1}` : '—',
    },
  ];
  return (
    <div className="analytics-cards">
      {cards.map((c) => (
        <div key={c.label} className="analytics-card">
          <span className="analytics-card-value">{c.value}</span>
          <span className="analytics-card-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelChart({ steps }: { steps: StepFunnel[] }) {
  const max = useMemo(() => Math.max(1, ...steps.map((s) => s.reached)), [steps]);
  if (!steps || steps.length === 0) {
    return null;
  }
  return (
    <div className="analytics-section">
      <h3>Step funnel &amp; drop-off</h3>
      <div className="funnel">
        {steps.map((s) => {
          const reachedPct = (s.reached / max) * 100;
          const completedPct = (s.completed / max) * 100;
          const dropPct = s.reached > 0 ? (s.dropOff / s.reached) : 0;
          return (
            <div key={s.stepId || s.stepIndex} className="funnel-row">
              <div className="funnel-label" title={s.title || `Step ${s.stepIndex + 1}`}>
                <span className="funnel-step-num">{s.stepIndex + 1}</span>
                <span className="funnel-step-title">{s.title || `Step ${s.stepIndex + 1}`}</span>
              </div>
              <div className="funnel-bar-track">
                <div className="funnel-bar-reached" style={{ width: `${reachedPct}%` }}>
                  <div className="funnel-bar-completed" style={{ width: `${max ? (completedPct / (reachedPct || 1)) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="funnel-stats">
                <span>{s.reached} reached</span>
                <span className="funnel-drop">{formatPercent(dropPct)} drop</span>
                <span>{formatDuration(s.avgTimeMs)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="funnel-legend">
        <span className="legend-swatch legend-reached" /> Reached
        <span className="legend-swatch legend-completed" /> Completed
      </div>
    </div>
  );
}

function Breakdown({ title, map }: { title: string; map: Record<string, number> }) {
  const entries = useMemo(
    () => Object.entries(map || {}).sort((a, b) => b[1] - a[1]),
    [map]
  );
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
  return (
    <div className="analytics-section">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="field-hint">No data.</p>
      ) : (
        <div className="breakdown">
          {entries.map(([key, value]) => (
            <div key={key} className="breakdown-row">
              <span className="breakdown-key">{key || 'unknown'}</span>
              <div className="breakdown-bar-track">
                <div className="breakdown-bar" style={{ width: `${(value / total) * 100}%` }} />
              </div>
              <span className="breakdown-value">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendChart({ trend }: { trend: AnalyticsSummary['trend'] }) {
  if (!trend || trend.length === 0) return null;
  const width = 640;
  const height = 160;
  const pad = 24;
  const maxY = Math.max(1, ...trend.map((t) => Math.max(t.views, t.submissions)));
  const stepX = trend.length > 1 ? (width - pad * 2) / (trend.length - 1) : 0;
  const toY = (v: number) => height - pad - (v / maxY) * (height - pad * 2);
  const line = (key: 'views' | 'submissions') =>
    trend
      .map((t, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * stepX} ${toY(t[key])}`)
      .join(' ');
  return (
    <div className="analytics-section">
      <h3>Views vs. submissions</h3>
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Trend chart">
        <path d={line('views')} className="trend-line trend-views" fill="none" />
        <path d={line('submissions')} className="trend-line trend-submissions" fill="none" />
      </svg>
      <div className="funnel-legend">
        <span className="legend-swatch legend-reached" /> Views
        <span className="legend-swatch legend-completed" /> Submissions
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
