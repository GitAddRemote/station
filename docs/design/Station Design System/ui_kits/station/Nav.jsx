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

function Nav({ theme, onToggleTheme }) {
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
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
            <li>
              <a href="#">Docs</a>
            </li>
          </ul>
        </nav>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
          >
            <i data-lucide="sun" className="ico-light"></i>
            <i data-lucide="moon" className="ico-dark"></i>
          </button>
          <a className="btn btn-ghost btn-sm" href="#">
            Sign in
          </a>
          <a className="btn btn-primary btn-sm" href="#pricing">
            Launch Station
          </a>
        </div>
      </div>
    </header>
  );
}

window.Nav = Nav;
window.Logo = Logo;
