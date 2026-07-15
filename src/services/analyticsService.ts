import { auth } from '../firebase/config';

// Base URL of the authenticated analytics read API (AWS API Gateway).
// Configured at build time; when empty the dashboard shows a "not configured"
// state instead of attempting a request.
const ANALYTICS_API = process.env.REACT_APP_ANALYTICS_API || '';

export function isAnalyticsConfigured(): boolean {
  return !!ANALYTICS_API;
}

// Per-step funnel metrics returned by the read API.
export interface StepFunnel {
  stepId: string;
  stepIndex: number;
  title?: string;
  reached: number;
  completed: number;
  dropOff: number;
  avgTimeMs: number;
}

export interface TrendPoint {
  date: string;
  views: number;
  submissions: number;
}

// Aggregated analytics summary for a single form over a date range.
export interface AnalyticsSummary {
  formId: string;
  range: { from: string; to: string };
  views: number;
  starts: number;
  submissions: number;
  completionRate: number; // 0..1 (submissions / views)
  avgTimeToCompleteMs: number;
  biggestDropStepIndex: number | null;
  steps: StepFunnel[];
  byDevice: Record<string, number>;
  bySource: Record<string, number>;
  trend: TrendPoint[];
}

/**
 * Fetch aggregated analytics for a form. Sends the caller's Firebase ID token;
 * the API verifies it and confirms the user owns the form before responding.
 */
export async function fetchFormAnalytics(
  formId: string,
  from: string,
  to: string,
  segment?: string
): Promise<AnalyticsSummary> {
  if (!ANALYTICS_API) {
    throw new Error('Analytics API is not configured (REACT_APP_ANALYTICS_API).');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to view analytics.');
  }
  const token = await user.getIdToken();
  const url = new URL(`${ANALYTICS_API.replace(/\/$/, '')}/v1/analytics/${encodeURIComponent(formId)}`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  if (segment) url.searchParams.set('segment', segment);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('You do not have access to this form\u2019s analytics.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load analytics (${res.status}).`);
  }
  return (await res.json()) as AnalyticsSummary;
}
