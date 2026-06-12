function PriceCard({ tier, price, per, note, cta, featured, badge, features }) {
  return (
    <div className={'pcard' + (featured ? ' featured' : '')}>
      {badge && <span className="badge-pop">{badge}</span>}
      <span className="tier">{tier}</span>
      <div className="price">
        <span className="amt">{price}</span>
        {per && <span className="per">{per}</span>}
      </div>
      <p className="price-note">{note}</p>
      <a className={'btn ' + (featured ? 'btn-primary' : 'btn-ghost')} href="#">
        {cta}
      </a>
      <ul>
        {features.map((f) => (
          <li className={f.muted ? 'muted' : ''} key={f.label}>
            <i data-lucide={f.muted ? 'minus' : 'check'}></i> {f.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pricing() {
  return (
    <section
      className="section"
      id="pricing"
      style={{ background: 'var(--surface-sunken)' }}
    >
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow center">Pricing</span>
          <h2 className="section-title">Scale from a squad to an armada.</h2>
          <p className="section-sub">
            Start free, upgrade when your org grows. Every plan includes Discord
            sync and the Station Bot — no add-ons, no surprises.
          </p>
        </div>

        <div className="price-grid">
          <PriceCard
            tier="Squad"
            price="$0"
            per="/ forever"
            note="For small crews finding their feet."
            cta="Start free"
            features={[
              { label: 'Up to 25 members' },
              { label: 'Fleet & inventory tracking' },
              { label: 'Discord role sync' },
              { label: 'Basic Station Bot' },
              { label: 'Org accounting', muted: true },
              { label: 'Contracts & trade board', muted: true },
            ]}
          />
          <PriceCard
            tier="Org"
            price="$19"
            per="/ month"
            note="For active orgs running real operations."
            cta="Launch Station"
            featured
            badge="Most popular"
            features={[
              { label: 'Up to 300 members' },
              { label: 'Everything in Squad, plus:' },
              { label: 'Org & division accounting' },
              { label: 'Contracts & mining tools' },
              { label: 'Internal trade board' },
              { label: 'Certifications & HR tools' },
              { label: 'Rewards & commendations' },
            ]}
          />
          <PriceCard
            tier="Fleet"
            price="$49"
            per="/ month"
            note="For large orgs and multi-division empires."
            cta="Talk to us"
            features={[
              { label: 'Unlimited members' },
              { label: 'Everything in Org, plus:' },
              { label: 'Unlimited divisions' },
              { label: 'Advanced audit & exports' },
              { label: 'SSO & priority support' },
              { label: 'Custom bot automations' },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

window.Pricing = Pricing;
window.PriceCard = PriceCard;
