// ============================================================
// Station — pre-login landing page (LandingApp)
// Real app content (Home.tsx) rebuilt on the Presstronic design system.
// Reuses the established Station classes; hero has 3 switchable layouts.
// ============================================================

const HEADLINES = {
  'Guild — “like a pro”':
    'Manage your gaming guild <span class="accent">like a pro</span>.',
  'Flagship, not a spreadsheet':
    'Run your org like a <span class="accent">flagship</span>, not a spreadsheet.',
  'Command center':
    'Your org deserves a <span class="accent">command center</span>.',
};

// ---- product console mock (org overview) ----------------------
function Console() {
  return (
    <div
      className="console"
      role="img"
      aria-label="Station org command dashboard preview"
    >
      <div className="console-bar">
        <div className="console-dots">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <span className="console-title">
          station.app / atlas-vanguard / overview
        </span>
      </div>
      <div className="console-body">
        <aside className="console-side">
          <div className="side-item active">
            <i data-lucide="layout-dashboard"></i> Overview
          </div>
          <div className="side-item">
            <i data-lucide="rocket"></i> Fleet
          </div>
          <div className="side-item">
            <i data-lucide="package"></i> Inventory
          </div>
          <div className="side-item">
            <i data-lucide="users"></i> Members
          </div>
          <div className="side-item">
            <i data-lucide="shield-check"></i> Roles
          </div>
          <div className="side-sep"></div>
          <div className="side-item">
            <i data-lucide="landmark"></i> Treasury
          </div>
          <div className="side-item">
            <i data-lucide="scroll-text"></i> Contracts
          </div>
        </aside>
        <div className="console-main">
          <h4>
            Atlas Vanguard <span className="live">Live</span>
          </h4>
          <div className="stat-row">
            <div className="stat">
              <div className="label">Members</div>
              <div className="value">312</div>
              <div className="delta">+18 this week</div>
            </div>
            <div className="stat">
              <div className="label">Active Roles</div>
              <div className="value">24</div>
              <div className="delta">synced to Discord</div>
            </div>
            <div className="stat">
              <div className="label">Org Treasury</div>
              <div className="value">8.42M</div>
              <div className="delta warm">+4.1% this cycle</div>
            </div>
          </div>
          <div className="console-list">
            <div className="row">
              <span className="ship-ico">
                <i data-lucide="shield-check"></i>
              </span>
              <span className="name">Fleet Officer</span>
              <span className="meta">14 members · 9 scopes</span>
              <span className="pill-badge active">Role</span>
            </div>
            <div className="row">
              <span className="ship-ico">
                <i data-lucide="user-round"></i>
              </span>
              <span className="name">Vesper “Nyx” Calderon</span>
              <span className="meta">Quartermaster</span>
              <span className="pill-badge ready">Online</span>
            </div>
            <div className="row">
              <span className="ship-ico">
                <i data-lucide="user-plus"></i>
              </span>
              <span className="name">3 applications pending</span>
              <span className="meta">Recruitment</span>
              <span className="pill-badge warm">Review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- logo + nav ----------------------------------------------
function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Station home">
      <span className="logo-mark">
        <i data-lucide="orbit"></i>
      </span>
      <span className="logo-word">STATION</span>
    </a>
  );
}

function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={'nav' + (scrolled ? ' scrolled' : '')}>
      <div className="nav-inner">
        <Logo />
        <nav>
          <ul className="nav-links">
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#features">Security</a>
            </li>
            <li>
              <a href="#cta">Discord</a>
            </li>
          </ul>
        </nav>
        <div className="nav-actions">
          <a className="btn btn-ghost btn-sm" href="#">
            Sign in
          </a>
          <a className="btn btn-primary btn-sm" href="#">
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}

// ---- hero -----------------------------------------------------
function Hero({ layout, headlineKey, showConsole }) {
  return (
    <section
      className="lhero"
      id="top"
      data-hero={layout}
      data-console={showConsole ? 'on' : 'off'}
    >
      <div className="lhero-bg"></div>
      <div className="lhero-grid"></div>
      <div className="lhero-inner wrap">
        <div className="lhero-copy">
          <span className="lhero-pill">
            <span className="tag">New</span>
            Station Bot syncs roles to Discord in real time
          </span>
          <span className="eyebrow">For Star Citizen orgs</span>
          <h1
            className="lhero-title"
            style={{ marginTop: 'var(--space-4)' }}
            dangerouslySetInnerHTML={{
              __html: HEADLINES[headlineKey] || Object.values(HEADLINES)[0],
            }}
          ></h1>
          <p className="lhero-sub">
            Multi-org management, fine-grained role permissions, and member
            coordination — purpose-built for competitive gaming orgs that run
            like a business.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href="#">
              <i data-lucide="rocket"></i> Get started free
            </a>
            <a className="btn btn-ghost btn-lg" href="#">
              <i data-lucide="log-in"></i> Sign in
            </a>
          </div>
          <div className="lhero-trust">
            <i data-lucide="shield-check"></i>
            Free for squads up to 25 · No card required
          </div>
        </div>
        <div className="lhero-visual">
          <Console />
        </div>
      </div>
    </section>
  );
}

// ---- features (bento) ----------------------------------------
function FeatureCard({ icon, title, children, span = 2, warm = false, chips }) {
  return (
    <article
      className={
        'fcard col-' +
        span +
        (warm ? ' warm' : '') +
        (chips ? ' feature-lg' : '')
      }
    >
      <div className="fcard-glow"></div>
      <div className="fico">
        <i data-lucide={icon}></i>
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {chips && (
        <div className="chip-row">
          {chips.map((c) => (
            <span className="chip" key={c}>
              <i data-lucide="check"></i> {c}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function Features() {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Capabilities</span>
          <h2 className="section-title">Everything your guild needs.</h2>
          <p className="section-sub">
            Professional-grade organization tooling for competitive gaming teams
            — roles, members, and operations in one cohesive command center.
          </p>
        </div>

        <div className="bento">
          <FeatureCard
            icon="boxes"
            title="Multi-organization support"
            span={3}
            chips={['Separate roles', 'Per-org permissions', 'One login']}
          >
            Manage multiple guilds from a single account, with independent
            roles, ranks, and permissions scoped to each organization you run or
            belong to.
          </FeatureCard>

          <FeatureCard
            icon="key-round"
            title="Advanced permissions"
            span={3}
            warm
            chips={[
              'Role-based access',
              'Granular scopes',
              'Per-member overrides',
            ]}
          >
            Fine-grained, role-based access control with flexible permission
            sets for every organization, division, and member — set it once,
            enforce it everywhere.
          </FeatureCard>

          <FeatureCard icon="layout-dashboard" title="Intuitive dashboard">
            A clean, modern command center for members, roles, and guild
            operations, with real-time updates the moment anything changes.
          </FeatureCard>
          <FeatureCard icon="zap" title="Lightning fast">
            Redis-powered caching keeps member lists and permission checks
            instant, even as your roster scales from a squad to an armada.
          </FeatureCard>
          <FeatureCard icon="id-card" title="Member profiles">
            Rich profiles with bio, contact, and role history across every
            organization a member belongs to — no more pinned-message rosters.
          </FeatureCard>

          <FeatureCard
            icon="shield-check"
            title="Secure &amp; reliable"
            span={6}
            chips={[
              'JWT + refresh tokens',
              'bcrypt hashing',
              'Audit logging',
              'Discord sync',
            ]}
          >
            Built on JWT authentication with refresh tokens, bcrypt password
            hashing, and comprehensive security measures — so your org’s data
            stays exactly where it belongs while roles and ranks stay in
            lockstep with Discord.
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

// ---- final CTA + footer --------------------------------------
function FinalCTA() {
  return (
    <section className="section cta-band" id="cta">
      <div className="wrap">
        <div className="cta-card">
          <div className="cta-card-glow"></div>
          <h2>Ready to level up your guild?</h2>
          <p>
            Join the gaming organizations using Station to run their teams like
            flagships. Set up in minutes — your crew stays right where they are,
            in Discord.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href="#">
              <i data-lucide="rocket"></i> Get started free
            </a>
            <a
              className="btn btn-ghost btn-lg"
              href="#"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <i data-lucide="log-in"></i> Sign in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ['Product', ['Features', 'Security', 'Station Bot', 'Changelog']],
    ['Resources', ['Docs', 'API', 'Community', 'Support']],
    ['Company', ['About Presstronic', 'Blog', 'Privacy', 'Terms']],
  ];
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Logo />
            <p>
              Organization management for competitive gaming guilds. A
              Presstronic product.
            </p>
          </div>
          {cols.map(([title, links]) => (
            <div className="foot-col" key={title}>
              <h5>{title}</h5>
              <ul>
                {links.map((l) => (
                  <li key={l}>
                    <a href="#">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-bottom">
          <p className="made">
            © 2026 Presstronic LLC · Built for competitive gaming guilds
          </p>
          <div className="foot-social">
            <a href="#" aria-label="Discord">
              <i data-lucide="message-circle"></i>
            </a>
            <a href="#" aria-label="GitHub">
              <i data-lucide="github"></i>
            </a>
            <a href="#" aria-label="X">
              <i data-lucide="at-sign"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---- tweaks defaults -----------------------------------------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  heroLayout: 'Centered',
  accent: 'Aqua',
  headline: 'Guild — “like a pro”',
  showConsole: true,
}; /*EDITMODE-END*/

function LandingApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // (re)build Lucide glyphs after every render so new icons resolve
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const layout = String(t.heroLayout || 'Centered').toLowerCase();
  const accent = String(t.accent || 'Aqua').toLowerCase();

  return (
    <div className="station" data-theme="dark" data-accent={accent}>
      <Nav />
      <Hero
        layout={layout}
        headlineKey={t.headline}
        showConsole={t.showConsole !== false}
      />
      <Features />
      <FinalCTA />
      <Footer />

      <TweaksPanel>
        <TweakSection label="Hero" />
        <TweakRadio
          label="Layout"
          value={t.heroLayout}
          options={['Centered', 'Split', 'Oversized']}
          onChange={(v) => setTweak('heroLayout', v)}
        />
        <TweakSelect
          label="Headline"
          value={t.headline}
          options={Object.keys(HEADLINES)}
          onChange={(v) => setTweak('headline', v)}
        />
        <TweakToggle
          label="Product preview"
          value={t.showConsole !== false}
          onChange={(v) => setTweak('showConsole', v)}
        />
        <TweakSection label="Brand" />
        <TweakRadio
          label="Accent"
          value={t.accent}
          options={['Aqua', 'Coral']}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

window.LandingApp = LandingApp;
