const STATION_TWEAKS = /*EDITMODE-BEGIN*/ {
  theme: 'dark',
}; /*EDITMODE-END*/

function StationApp() {
  const [t, setTweak] = useTweaks(STATION_TWEAKS);
  const theme = t.theme === 'light' ? 'light' : 'dark';

  // Render Lucide icons after mount.
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, []);

  const toggleTheme = () =>
    setTweak('theme', theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="station" data-theme={theme === 'dark' ? 'dark' : undefined}>
      <Nav theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance" />
        <TweakRadio
          label="Theme"
          value={theme === 'dark' ? 'Dark' : 'Light'}
          options={['Dark', 'Light']}
          onChange={(v) => setTweak('theme', v === 'Dark' ? 'dark' : 'light')}
        />
      </TweaksPanel>
    </div>
  );
}

window.StationApp = StationApp;
