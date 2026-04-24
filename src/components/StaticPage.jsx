// ── StaticPage.jsx ────────────────────────────────────────────────────────
// Shared wrapper for About / Business / Advertise / Terms / Privacy /
// Trust & Safety / Support. Content is boilerplate. Anything with legal
// weight (Terms, Privacy) gets a visible "EXAMPLE TEXT" banner so nobody
// mistakes this for a binding policy.

const SUPPORT_EMAIL = 'adamcrubin@gmail.com'; // single inbox during beta

const VERSION_LINE = 'Beta v0.5 · policies will expand before general launch';

// ── Page id → { title, icon, body, legal? } ─────────────────────────────
const PAGES = {
  about: {
    title: 'About Locale',
    icon:  'ℹ',
    body: () => (
      <>
        <H>Locale is your personal weekend planner.</H>
        <P>
          DC's weekend has hundreds of concerts, markets, comedy shows, new
          restaurants, and outdoor events happening at once. Most of them are
          scattered across a dozen newsletters and venue sites. Locale reads
          those sources for you, filters by your preferences and the weather,
          and surfaces what's actually worth your weekend.
        </P>
        <P>
          Locale is built by Adam Rubin. It's in beta — curation runs every
          night, sources are transparently listed inside the app, and every
          event shows which source it came from.
        </P>
        <P>
          More about Adam:{' '}
          <A href="https://adamcrubin.com">adamcrubin.com</A>
          {' · '}
          <A href="https://linkedin.com/in/Adam-c-Rubin">LinkedIn</A>
        </P>
        <P>
          Questions, ideas, complaints: <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>.
        </P>
      </>
    ),
  },

  business: {
    title: 'Locale for Businesses',
    icon:  '🏢',
    body: () => (
      <>
        <H>Get your venue in front of active weekend planners.</H>
        <P>
          If you run a venue, gallery, comedy club, brewery, restaurant, or a
          recurring event series in the DC metro, Locale can include your
          listings in our curated feed at no cost.
        </P>
        <Bullets items={[
          'Your events appear alongside editorial picks from Washingtonian, DCist, WaPo — with equal visibility.',
          'Users tag events with interest signals, so well-attended recurring events climb the rankings naturally.',
          'Source transparency: users can see their events came from you.',
        ]} />
        <P>
          To suggest your events page as a source, email{' '}
          <A href={`mailto:${SUPPORT_EMAIL}?subject=Locale%20for%20Businesses`}>{SUPPORT_EMAIL}</A>{' '}
          with your URL.
        </P>
      </>
    ),
  },

  advertise: {
    title: 'Advertise on Locale',
    icon:  '📢',
    body: () => (
      <>
        <H>Sponsored placements, piloting now.</H>
        <P>
          Locale users are in active planning mode for the next 48 hours —
          the highest-intent moment for local businesses. We're running a
          small pilot with a handful of DC partners on sponsored event
          spotlights and premium source placement.
        </P>
        <P>
          Interested? Email{' '}
          <A href={`mailto:${SUPPORT_EMAIL}?subject=Locale%20advertising`}>{SUPPORT_EMAIL}</A>{' '}
          with what you had in mind.
        </P>
      </>
    ),
  },

  terms: {
    title: 'Terms of Service',
    icon:  '📄',
    legal: true,
    body: () => (
      <>
        <H>1. The service</H>
        <P>
          Locale is a personalized weekend event discovery app. It aggregates
          publicly available event information from third-party websites and
          surfaces it with personalization.
        </P>
        <H>2. Your account</H>
        <P>
          You sign in with Google. You're responsible for keeping your
          credentials safe. You can delete your account at any time in
          Settings — we permanently remove your profile, preferences, and
          saved events when you do.
        </P>
        <H>3. Content & third-party sources</H>
        <P>
          Event information is pulled from third-party sources. We do our
          best to keep it accurate but don't guarantee correctness,
          availability, pricing, or suitability. Always verify details on the
          event's own page before showing up.
        </P>
        <H>4. Acceptable use</H>
        <P>
          Don't scrape, abuse, or misuse the service. Don't submit malicious
          sources. Don't use Locale to promote illegal activity.
        </P>
        <H>5. Disclaimers</H>
        <P>
          Locale is provided "as is" during beta. We make no warranties and
          aren't liable for outcomes that follow from using the app — missed
          events, bad meals, rained-out hikes, questionable dates.
        </P>
        <H>6. Changes</H>
        <P>
          These terms will be updated before general launch. We'll notify
          signed-in users when that happens.
        </P>
        <H>7. Contact</H>
        <P>
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>
        </P>
      </>
    ),
  },

  privacy: {
    title: 'Privacy Policy',
    icon:  '🔐',
    legal: true,
    body: () => (
      <>
        <H>What we collect</H>
        <Bullets items={[
          'Your email + name from Google sign-in.',
          'Events you save, add to calendar, thumbs-up / thumbs-down.',
          'Profile preferences you enter in Settings.',
          'Basic device/browser info for debugging.',
        ]} />
        <H>What we don't do</H>
        <Bullets items={[
          'We don\'t sell your data.',
          'We don\'t track you across other sites.',
          'We don\'t share your event activity with anyone except the friends you explicitly connect with inside Locale.',
        ]} />
        <H>Third parties we use</H>
        <Bullets items={[
          'Supabase — authentication + database (your data lives here).',
          'Anthropic — AI model that extracts events from source pages.',
          'Google Calendar — only if you connect your calendar; we store a refresh token to write events on your behalf.',
        ]} />
        <H>Cookies & local storage</H>
        <P>
          We use localStorage to cache your feed and remember your settings,
          and cookies from Google OAuth to keep you signed in. No third-party
          tracking cookies.
        </P>
        <H>Your rights</H>
        <P>
          Delete your account in Settings → Account → Delete account. That
          removes every row tied to your user id from our database. Email{' '}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> for any
          other privacy requests.
        </P>
      </>
    ),
  },

  trust: {
    title: 'Trust & Safety',
    icon:  '🛡',
    legal: true,
    body: () => (
      <>
        <H>How we pick sources</H>
        <P>
          Every source in Locale is manually curated or vetted before it
          starts appearing in the feed. You can see the full list any time in
          Settings → Data Sources, including which source each event came
          from.
        </P>
        <H>What we won't surface</H>
        <Bullets items={[
          'Illegal activities, scams, unsafe events.',
          'Events explicitly marketed to minors without parent/guardian context.',
          'Content from sources we\'ve found to be unreliable or spammy.',
        ]} />
        <H>Reporting a problem</H>
        <P>
          If an event is wrong, unsafe, or shouldn't be surfaced, email{' '}
          <A href={`mailto:${SUPPORT_EMAIL}?subject=Trust%20%26%20Safety`}>{SUPPORT_EMAIL}</A>{' '}
          with a screenshot or the event title. We usually respond within two
          business days and remove confirmed issues immediately.
        </P>
      </>
    ),
  },

  support: {
    title: 'Support',
    icon:  '💬',
    body: () => (
      <>
        <H>Common questions</H>
        <H3>Event details are wrong. Can I fix it?</H3>
        <P>
          Thumbs-down the event to see less like it. Email us the event title
          + what was wrong and we'll fix it at the source.
        </P>
        <H3>A venue I love is missing. Can you add it?</H3>
        <P>
          Yes — email us the venue and a link to their events page. We'll
          vet it and usually have it in the feed within a day or two.
        </P>
        <H3>How do I cancel or delete my account?</H3>
        <P>
          Settings → Account → Delete account. Permanent, instant.
        </P>
        <H>Get in touch</H>
        <P>
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>
          <br />Usually responds within 2 business days.
        </P>
      </>
    ),
  },
};

// ── Small content primitives so body() stays readable ───────────────────
const H = ({ children }) => (
  <h2 style={{
    fontFamily:'Cormorant Garamond, serif', fontWeight:400,
    fontSize:22, color:'rgba(255,255,255,.95)',
    marginTop:24, marginBottom:8, lineHeight:1.25,
  }}>{children}</h2>
);
const H3 = ({ children }) => (
  <h3 style={{
    fontSize:13, fontWeight:600, color:'rgba(255,255,255,.85)',
    marginTop:14, marginBottom:4,
  }}>{children}</h3>
);
const P = ({ children }) => (
  <p style={{
    fontSize:13, lineHeight:1.65, color:'rgba(255,255,255,.72)',
    marginBottom:10,
  }}>{children}</p>
);
const A = ({ href, children }) => (
  <a href={href} style={{ color:'#C9A84C', textDecoration:'none', borderBottom:'0.5px dashed rgba(201,168,76,.5)' }}>{children}</a>
);
const Bullets = ({ items }) => (
  <ul style={{ fontSize:13, lineHeight:1.65, color:'rgba(255,255,255,.72)', marginBottom:10, paddingLeft:20 }}>
    {items.map((it, i) => <li key={i} style={{ marginBottom:4 }}>{it}</li>)}
  </ul>
);

// ── Main component ─────────────────────────────────────────────────────
export default function StaticPage({ pageId, onClose }) {
  const page = PAGES[pageId];
  if (!page) return null;

  return (
    <div className="fade-enter" style={{
      position:'fixed', inset:0, background:'#141210', zIndex:70,
      overflowY:'auto', display:'flex', flexDirection:'column',
      fontFamily:'DM Sans, sans-serif',
    }}>
      <div style={{ background:'#1C1A17', borderBottom:'0.5px solid rgba(255,255,255,.07)',
        padding:'12px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <button onClick={onClose} style={{
          background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)',
          borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer',
          color:'rgba(255,255,255,.5)', fontFamily:'DM Sans, sans-serif',
        }}>← Back</button>
        <span style={{ fontSize:18 }}>{page.icon}</span>
        <span className="serif" style={{ fontFamily:'Cormorant Garamond, serif',
          fontSize:22, color:'rgba(255,255,255,.92)', fontWeight:300 }}>
          {page.title}
        </span>
      </div>

      <div style={{ padding:'24px 22px 60px', maxWidth:660, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
        {page.legal && (
          <div style={{
            padding:'10px 14px', marginBottom:20, borderRadius:8,
            background:'rgba(245,158,11,.1)', border:'0.5px solid rgba(245,158,11,.35)',
            fontSize:12, color:'#F59E0B', lineHeight:1.5,
          }}>
            ⚠ <strong>Example text, not a binding policy.</strong> This page is a
            placeholder for the {page.title.toLowerCase()} that will ship before
            general launch. Treat it as a preview of intent, not a legal document.
          </div>
        )}
        {page.body()}
        <div style={{
          marginTop:32, paddingTop:16, borderTop:'0.5px solid rgba(255,255,255,.08)',
          fontSize:10, color:'rgba(255,255,255,.3)', textAlign:'center',
        }}>
          © 2026 Locale · {VERSION_LINE}
        </div>
      </div>
    </div>
  );
}

// Named list of pages for the Settings section / welcome footer renderers.
export const STATIC_PAGE_LINKS = [
  { id:'about',     icon:'ℹ',  label:'About'                  },
  { id:'business',  icon:'🏢', label:'Locale for Businesses' },
  { id:'advertise', icon:'📢', label:'Advertise here'         },
  { id:'terms',     icon:'📄', label:'Terms of Service'       },
  { id:'privacy',   icon:'🔐', label:'Privacy Policy'         },
  { id:'trust',     icon:'🛡', label:'Trust & Safety'         },
  { id:'support',   icon:'💬', label:'Support'                },
];
