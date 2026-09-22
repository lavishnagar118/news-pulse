/**
 * Date and time formatting utilities for News Pulse UI.
 */

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatTimeSpan(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return `${startIso} – ${endIso}`;

    const isSameDay = start.toDateString() === end.toDateString();
    const isSameTime = start.getTime() === end.getTime();

    if (isSameTime) {
      return formatDateTime(startIso);
    }

    if (isSameDay) {
      return `${formatDate(startIso)}, ${formatTime(startIso)} – ${formatTime(endIso)}`;
    }

    return `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

/**
 * Returns distinct styling classes for news sources.
 */
export function getSourceBadgeStyle(source: string): { bg: string; text: string; border: string } {
  const normalized = (source || '').toLowerCase();
  if (normalized.includes('bbc')) {
    return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' };
  }
  if (normalized.includes('npr')) {
    return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' };
  }
  if (normalized.includes('jazeera')) {
    return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
  }
  return { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' };
}

/**
 * Returns a human-friendly relative time string (e.g., "15m ago", "2h ago").
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

/**
 * Returns clean category color styling.
 */
export function getCategoryBadgeStyle(category?: string | null): { text: string; bg: string } {
  const c = (category || '').toLowerCase();
  switch (c) {
    case 'technology':
      return { text: 'text-indigo-700', bg: 'bg-indigo-50' };
    case 'politics':
      return { text: 'text-purple-700', bg: 'bg-purple-50' };
    case 'world':
      return { text: 'text-rose-700', bg: 'bg-rose-50' };
    case 'business':
      return { text: 'text-emerald-700', bg: 'bg-emerald-50' };
    case 'science':
      return { text: 'text-teal-700', bg: 'bg-teal-50' };
    case 'health':
      return { text: 'text-cyan-700', bg: 'bg-cyan-50' };
    case 'sports':
      return { text: 'text-orange-700', bg: 'bg-orange-50' };
    case 'entertainment':
      return { text: 'text-pink-700', bg: 'bg-pink-50' };
    default:
      return { text: 'text-stone-700', bg: 'bg-stone-100' };
  }
}

/**
 * Refines machine-like cluster keyword labels into natural, journalistic topic headlines.
 */
export function refineClusterLabel(rawLabel: string | null | undefined): string {
  if (!rawLabel || typeof rawLabel !== 'string') return 'General News';
  const trimmed = rawLabel.trim();

  // Curated deterministic mapping for known high-activity cluster stories
  const knownMappings: Record<string, string> = {
    'Results Russia Parliamentary': 'Russian Parliamentary Election',
    'Groups Ethiopian Alliance': 'Ethiopian Rebel Alliance',
    'China Safety Talks': 'US-China AI Safety Talks',
    'Texas Man Shoots': 'Texas Shooting Investigation',
    'State Merz Party': 'German Politics: Merz & CDU Leadership',
    'Released Secretly Teacher': 'Diplomatic Release of US Teacher',
    'Imran Khan Detained': 'Imran Khan Legal & Detention Battle',
    'Carrick United Michael': 'Michael Carrick & Manchester United',
    'Qatar Iran Gulf': 'Gulf Diplomacy: Qatar & Iran Talks',
    'Aleppo Explosions Syrian': 'Syrian Conflict: Aleppo Clashes',
    'Iran Revive Qatar': 'Iran-Qatar Diplomatic Relations',
    'Mourinho Defeat Madrid': 'Jose Mourinho & Real Madrid',
    'Arch Military Trump': 'Trump Defense & Pentagon Directives',
    'Saudi Houthis Arabia': 'Saudi Arabia & Houthi Truce Talks',
    'Extradited Suspects Killing': 'Haiti Assassination Extraditions',
    'Suspects Extradited Killing': 'Haiti Assassination Extraditions',
    'Ceasefire Gaza Hostages': 'Gaza Ceasefire & Hostage Negotiations',
    'Ukraine Frontline Drone': 'Ukraine War Frontline Drone Operations',
    'Fed Rates Inflation': 'Federal Reserve & Inflation Outlook',
  };

  if (knownMappings[trimmed]) {
    return knownMappings[trimmed];
  }

  // Check normalized lowercase match
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(knownMappings)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  // Heuristic cleanup:
  // Convert token sequence into Title Case with demonym adjustments
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'General News';

  const demonymMap: Record<string, string> = {
    russia: 'Russian',
    syrian: 'Syria',
    ethiopian: 'Ethiopian',
    china: 'China',
    saudi: 'Saudi',
    houthis: 'Houthi',
    texas: 'Texas',
    iran: 'Iran',
    qatar: 'Qatar',
    trump: 'Trump',
  };

  const transformed = words.map((w, idx) => {
    const l = w.toLowerCase();
    if (demonymMap[l]) return demonymMap[l];
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return transformed.join(' ');
}

/**
 * Human-readable status messages for the Refresh Data flow.
 * Guarantees that internal IDs, raw JSON, error codes, and technical payloads
 * are NEVER rendered to the end user.
 */
export function formatRefreshCompletion(stats?: {
  articlesAdded?: number;
  duplicatesSkipped?: number;
  feedsFailed?: number;
}): string {
  const added = stats?.articlesAdded ?? 0;
  const dupes = stats?.duplicatesSkipped ?? 0;
  const feedsFailed = stats?.feedsFailed ?? 0;

  if (feedsFailed > 0) {
    if (added > 0) {
      return `Updated with partial source coverage · ${added} new ${added === 1 ? 'story' : 'stories'}`;
    }
    return 'Updated with partial source coverage · No new stories found';
  }

  if (added > 0) {
    return `Updated just now · ${added} new ${added === 1 ? 'story' : 'stories'} · ${dupes} duplicates skipped`;
  }

  return "You're up to date · No new stories found";
}

export function formatRefreshError(err: any): string {
  if (!err) {
    return "Couldn't refresh news right now. Please try again.";
  }

  const raw = typeof err === 'string' ? err : err?.message || '';

  // Check for 409 concurrent ingestion indicator
  if (
    raw.includes('409') ||
    raw.includes('CONCURRENT_JOB_RUNNING') ||
    raw.toLowerCase().includes('already in progress') ||
    raw.toLowerCase().includes('already running')
  ) {
    return 'Refresh already in progress…';
  }

  // Always return user-friendly, polished copy — never expose technical errors or JSON
  return "Couldn't refresh news right now. Please try again.";
}


