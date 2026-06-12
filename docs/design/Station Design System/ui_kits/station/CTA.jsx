function FinalCTA() {
  return (
    <section className="section cta-band">
      <div className="wrap">
        <div className="cta-card">
          <div className="cta-card-glow"></div>
          <h2>Your org deserves a command center.</h2>
          <p>
            Bring your fleets, finances, and members under one roof. Set up
            Station in minutes — your crew stays right where they are, in
            Discord.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href="#">
              <i data-lucide="rocket"></i> Launch your org free
            </a>
            <a
              className="btn btn-ghost btn-lg"
              href="#"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <i data-lucide="calendar"></i> Book a demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ['Product', ['Features', 'Pricing', 'Station Bot', 'Changelog', 'Status']],
    ['Resources', ['Docs', 'API', 'Guides', 'Community', 'Support']],
    ['Company', ['About Presstronic', 'Blog', 'Privacy', 'Terms']],
  ];
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Logo />
            <p>
              The full-stack command center for gaming guilds and orgs. A
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
            Made by <b>Presstronic</b> · © 2026 Presstronic LLC
          </p>
          <div className="foot-social">
            <a href="#" aria-label="Discord">
              <i data-lucide="message-circle"></i>
            </a>
            <a href="#" aria-label="Bluesky">
              <i data-lucide="cloud"></i>
            </a>
            <a href="#" aria-label="X">
              <i data-lucide="at-sign"></i>
            </a>
            <a href="#" aria-label="GitHub">
              <i data-lucide="github"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

window.FinalCTA = FinalCTA;
window.Footer = Footer;
