// ── AdminConsole.jsx ──────────────────────────────────────────────────────────
// Standalone admin console at /admin. Tabbed view of pipeline diagnostics,
// cron triggers, DB table viewer, and a read-only SQL playground. Locked to
// a single email (Adam's) — non-admin / unauthenticated visitors see a stub.
//
// Tab state lives in the URL hash so links are shareable / bookmarkable:
//   /admin             → defaults to #health
//   /admin#health      → source health triage
//   /admin#cron        → manual pipeline trigger buttons
//   /admin#tables      → DB table viewer (scraped_content, events, sources, etc.)
//   /admin#sql         → read-only SQL playground
//   /admin#sources     → source list + add / test / extractor / health
//   /admin#suggestions → source_suggestions queue
//
// Each tab is its own component in this directory. AdminConsole is just the
// shell (header, tab strip, auth gate, hash routing).

import { useEffect, useState } from 'react';
import OverviewTab     from './OverviewTab';
import HealthTab       from './HealthTab';
import CronTab         from './CronTab';
import TablesTab       from './TablesTab';
import SqlTab          from './SqlTab';
import SourcesTab      from './SourcesTab';
import SuggestionsTab  from './SuggestionsTab';

// Admin gate. Permissive on purpose — any logged-in Google account whose
// email contains 'adamcrubin' OR matches the @locale.app placeholder
// gets in. Handles case variations, plus-addressing (adamcrubin+x@
// gmail), and Google-token quirks where the email comes back with
// unexpected casing/whitespace.
export const ADMIN_EMAILS = new Set([
  'adamcrubin@gmail.com',
  'adam@locale.app',
]);

function isAdmin(user) {
  const email = (user?.email || '').trim().toLowerCase();
  if (!email) return false;
  if (ADMIN_EMAILS.has(email)) return true;
  // Substring fallback — catches plus-addressing (adamcrubin+work@gmail)
  // and any Google-name-aliasing weirdness.
  if (email.includes('adamcrubin')) return true;
  return false;
}

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: '📊', component: OverviewTab },
  { id: 'health',      label: 'Health',      icon: '🏥', component: HealthTab },
  { id: 'sources',     label: 'Sources',     icon: '🔌', component: SourcesTab },
  { id: 'suggestions', label: 'Suggestions', icon: '💡', component: SuggestionsTab },
  { id: 'cron',        label: 'Cron',        icon: '⚙',  component: CronTab },
  { id: 'tables',      label: 'Tables',      icon: '🗃', component: TablesTab },
  { id: 'sql',         label: 'SQL',         icon: '🔍', component: SqlTab },
];

function readHashTab() {
  try {
    const raw = window.location.hash || '';
    // Strip leading '#' then take the first segment (handles '#health?foo=bar')
    const id = raw.replace(/^#/, '').split(/[?/]/)[0];
    return TABS.find(t => t.id === id)?.id || 'overview';
  } catch { return 'health'; }
}

function writeHashTab(id) {
  try {
    if (readHashTab() !== id) {
      window.history.replaceState(null, '', `#${id}`);
    }
  } catch {}
}

export default function AdminConsole({ user, authLoading, signInWithGoogle }) {
  const [activeTab, setActiveTab] = useState(readHashTab);

  // Sync state with hash changes (back button, manual URL edit)
  useEffect(() => {
    const onHashChange = () => setActiveTab(readHashTab());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => writeHashTab(activeTab), [activeTab]);

  // Loading skeleton while auth is resolving
  if (authLoading) {
    return (
      <div style={shellStyle}>
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>
          Loading admin…
        </div>
      </div>
    );
  }

  // Unauthenticated → sign-in prompt
  if (!user) {
    return (
      <div style={shellStyle}>
        <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
          <div className="serif" style={{ fontSize: 28, fontWeight: 300, color: 'rgba(255,255,255,.9)', marginBottom: 8 }}>
            Locale Admin
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 24 }}>
            Sign in to continue.
          </div>
          <button onClick={signInWithGoogle} style={{
            background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.45)',
            color: '#C9A84C', padding: '10px 24px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
            Sign in with Google
          </button>
          <div style={{ marginTop: 30 }}>
            <a href="/" style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textDecoration: 'none' }}>← Back to feed</a>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not Adam → access denied
  if (!isAdmin(user)) {
    return (
      <div style={shellStyle}>
        <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
          <div className="serif" style={{ fontSize: 28, fontWeight: 300, color: 'rgba(255,255,255,.9)', marginBottom: 8 }}>
            Admin only
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
            This page is restricted.
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 24, fontFamily: 'monospace' }}>
            Signed in as: <strong style={{ color: 'rgba(255,255,255,.55)' }}>{user.email || '(no email)'}</strong>
            <br />
            Allowed: <span style={{ color: 'rgba(255,255,255,.45)' }}>{[...ADMIN_EMAILS].join(' · ')}</span>
          </div>
          <a href="/" style={{
            background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.12)',
            color: 'rgba(255,255,255,.7)', padding: '8px 18px', borderRadius: 8, fontSize: 12,
            textDecoration: 'none', display: 'inline-block', fontFamily: 'DM Sans, sans-serif',
          }}>← Back to feed</a>
        </div>
      </div>
    );
  }

  const Tab = TABS.find(t => t.id === activeTab)?.component || OverviewTab;

  return (
    <div style={shellStyle}>
      {/* Header */}
      <div style={{
        background: '#1C1A17', borderBottom: '0.5px solid rgba(255,255,255,.07)',
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="serif" style={{ fontSize: 20, color: 'rgba(255,255,255,.9)', fontWeight: 300 }}>
            Locale Admin
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>
            Pipeline diagnostics + raw DB access
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{user.email}</span>
          <a href="/" style={{
            background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.1)',
            borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
            color: 'rgba(255,255,255,.5)', textDecoration: 'none',
          }}>→ feed</a>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{
        background: '#1C1A17', borderBottom: '0.5px solid rgba(255,255,255,.07)',
        padding: '0 16px', display: 'flex', gap: 4, flexShrink: 0, overflowX: 'auto',
      }}>
        {TABS.map(t => {
          const active = t.id === activeTab;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
              padding: '12px 14px', fontSize: 12, cursor: 'pointer',
              color: active ? '#C9A84C' : 'rgba(255,255,255,.5)',
              fontWeight: active ? 600 : 400,
              fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
            }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <Tab user={user} />
      </div>
    </div>
  );
}

const shellStyle = {
  position: 'fixed', inset: 0, background: '#141210',
  display: 'flex', flexDirection: 'column',
  fontFamily: 'DM Sans, sans-serif',
  color: 'rgba(255,255,255,.85)',
};
