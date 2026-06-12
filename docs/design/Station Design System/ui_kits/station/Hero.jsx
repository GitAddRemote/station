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
            <i data-lucide="pickaxe"></i> Mining
          </div>
          <div className="side-item">
            <i data-lucide="scroll-text"></i> Contracts
          </div>
          <div className="side-sep"></div>
          <div className="side-item">
            <i data-lucide="users"></i> Members
          </div>
          <div className="side-item">
            <i data-lucide="landmark"></i> Treasury
          </div>
          <div className="side-item">
            <i data-lucide="award"></i> Certs
          </div>
        </aside>
        <div className="console-main">
          <h4>
            Atlas Vanguard <span className="live">Live</span>
          </h4>
          <div className="stat-row">
            <div className="stat">
              <div className="label">Org Treasury</div>
              <div className="value">8.42M</div>
              <div className="delta">+4.1% this cycle</div>
            </div>
            <div className="stat">
              <div className="label">Active Members</div>
              <div className="value">312</div>
              <div className="delta">+18 this week</div>
            </div>
            <div className="stat">
              <div className="label">Open Contracts</div>
              <div className="value">27</div>
              <div className="delta warm">6 awaiting payout</div>
            </div>
          </div>
          <div className="console-list">
            <div className="row">
              <span className="ship-ico">
                <i data-lucide="rocket"></i>
              </span>
              <span className="name">Carrack · “Meridian”</span>
              <span className="meta">Exploration</span>
              <span className="pill-badge ready">Ready</span>
            </div>
            <div className="row">
              <span className="ship-ico">
                <i data-lucide="pickaxe"></i>
              </span>
              <span className="name">Prospector Wing</span>
              <span className="meta">Mining · 6 crew</span>
              <span className="pill-badge active">Deployed</span>
            </div>
            <div className="row">
              <span className="ship-ico">
                <i data-lucide="scroll-text"></i>
              </span>
              <span className="name">Quantanium Haul · Lot 0912</span>
              <span className="meta">Contract</span>
              <span className="pill-badge warm">Payout due</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg"></div>
      <div className="hero-grid"></div>
      <div className="hero-inner wrap">
        <span className="hero-pill">
          <span className="tag">New</span>
          Station Bot now syncs roles to Discord in real time
        </span>
        <h1>
          Run your org like a <span className="accent">flagship</span>, not a
          spreadsheet.
        </h1>
        <p className="hero-sub">
          Station is the full-stack command center for gaming guilds and orgs —
          fleets, inventory, mining, contracts, treasury, and HR, all wired
          straight into Discord.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#pricing">
            <i data-lucide="rocket"></i> Launch your org
          </a>
          <a className="btn btn-ghost btn-lg" href="#features">
            <i data-lucide="play"></i> See it in action
          </a>
        </div>
        <div className="hero-trust">
          <i data-lucide="shield-check" style={{ width: 16, height: 16 }}></i>
          Free for squads up to 25 · No card required
        </div>
      </div>
      <Console />
    </section>
  );
}

function Marquee() {
  const items = [
    ['users-round', 'Atlas Vanguard'],
    ['gem', 'Quantum Miners'],
    ['radar', 'Deepwatch'],
    ['swords', 'Iron Concord'],
    ['orbit', 'Nova Syndicate'],
  ];
  return (
    <section className="marquee">
      <div className="wrap">
        <div className="marquee-label">
          Trusted by orgs running thousands of members
        </div>
        <div className="marquee-row">
          {items.map(([ic, name]) => (
            <span className="marquee-item" key={name}>
              <i data-lucide={ic}></i> {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
window.Console = Console;
window.Marquee = Marquee;
