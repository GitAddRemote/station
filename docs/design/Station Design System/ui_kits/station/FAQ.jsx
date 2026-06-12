function FAQItem({ q, a, open, onToggle }) {
  const ref = React.useRef(null);
  return (
    <div className={'faq-item' + (open ? ' open' : '')}>
      <button className="faq-q" onClick={onToggle} aria-expanded={open}>
        <span>{q}</span>
        <i data-lucide="plus"></i>
      </button>
      <div
        className="faq-a"
        style={{
          maxHeight: open && ref.current ? ref.current.scrollHeight + 'px' : 0,
        }}
      >
        <div className="faq-a-inner" ref={ref}>
          {a}
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const [openIdx, setOpenIdx] = React.useState(0);
  const items = [
    {
      q: 'Which games and universes does Station support?',
      a: 'Station is built for org and guild management in any persistent-universe or team-based game. Fleets, mining, and contracts map naturally onto space-sim orgs, while inventory, HR, and accounting work for any community running a real organization.',
    },
    {
      q: 'How does the Discord integration work?',
      a: 'Station connects to your server through the Station Bot. Ranks, roles, and certifications stay synced in real time, members authenticate with Discord, and notifications post to the channels you choose — no separate logins to manage.',
    },
    {
      q: "Is our org's data secure?",
      a: "Yes. Station is built on Presstronic's secure full-stack foundation with encrypted storage, scoped permissions, and a complete audit log on every treasury and inventory action. You stay in control of who can see and do what.",
    },
    {
      q: 'Can we manage multiple divisions and budgets?',
      a: 'On the Org and Fleet plans you get a general fund plus separate accounts for each division or department, with independent ledgers, payouts, and balances — so your mining wing and your logistics arm keep their own books.',
    },
    {
      q: 'What happens when we outgrow a plan?',
      a: 'Upgrades are instant and prorated. Your data, fleets, and history carry over untouched — you simply unlock more seats and capabilities as your org grows.',
    },
    {
      q: 'Do you offer a free option?',
      a: 'Squads of up to 25 members run on Station free, forever, with fleet and inventory tracking plus Discord sync. No credit card required to get started.',
    },
  ];
  return (
    <section className="section" id="faq">
      <div className="wrap-narrow">
        <div className="section-head center">
          <span className="eyebrow center">Questions</span>
          <h2 className="section-title">Frequently asked.</h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <FAQItem
              key={i}
              q={it.q}
              a={it.a}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

window.FAQ = FAQ;
window.FAQItem = FAQItem;
