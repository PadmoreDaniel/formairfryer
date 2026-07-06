/**
 * Reads page-history tracking values persisted by the
 * wp-react-page-history-tracking WordPress plugin.
 *
 * The plugin stores:
 *   - "referrer"   -> localStorage   (traffic source string)
 *   - "pageVisits" -> sessionStorage (array of { page, timestamp })
 *
 * There is no "lastInternalPage" key; it is derived from "pageVisits".
 */

export interface PageVisit {
  page: string;
  timestamp: string;
}

export interface TrackingData {
  referrer: string;
  lastInternalPage: string;
}

/** Reads the captured traffic source, or "" when unavailable. */
export function getReferrer(): string {
  try {
    return localStorage.getItem('referrer') || '';
  } catch (e) {
    return '';
  }
}

/** Reads the recorded page-visit history, or [] when unavailable. */
export function getPageVisits(): PageVisit[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('pageVisits') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/** Returns the most recent internal page visited before the current page. */
export function getPreviousInternalPage(
  pageVisits: PageVisit[] = [],
  currentPath: string = ''
): string {
  if (!Array.isArray(pageVisits) || pageVisits.length === 0) return '';

  // If currentPath not provided, assume the last visit is the current page
  const assumedCurrent = currentPath || pageVisits[pageVisits.length - 1]?.page || '';

  // Walk backwards to find the first page different from the current
  for (let i = pageVisits.length - 1; i >= 0; i--) {
    const p = pageVisits[i]?.page || '';
    if (p && p !== assumedCurrent) {
      return p;
    }
  }

  return '';
}

/** Convenience reader returning both tracking values for a submission. */
export function getTrackingData(): TrackingData {
  return {
    referrer: getReferrer(),
    lastInternalPage: getPreviousInternalPage(getPageVisits()),
  };
}
