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
          <h2 className="section-title">
            Everything your org needs, in one hangar.
          </h2>
          <p className="section-sub">
            Station replaces a dozen bots, spreadsheets, and side channels with
            a single cohesive platform — purpose-built for the way orgs actually
            operate.
          </p>
        </div>

        <div className="bento">
          <FeatureCard
            icon="rocket"
            title="Fleet management &amp; sharing"
            span={3}
            chips={[
              'Shared loadouts',
              'Crew assignments',
              'Showcase pages',
              'Readiness status',
            ]}
          >
            Catalog every hull in the org, assign crews, and track readiness at
            a glance. Members share fleets, publish showcase pages, and rally
            the right ships for any operation.
          </FeatureCard>

          <FeatureCard
            icon="landmark"
            title="Org &amp; division accounting"
            span={3}
            warm
            chips={[
              'General fund',
              'Division ledgers',
              'Payouts',
              'Full audit log',
            ]}
          >
            A real treasury for your org — a general fund plus separate accounts
            for every division and department, with payouts, balances, and an
            immutable audit trail.
          </FeatureCard>

          <FeatureCard icon="bot" title="Station Bot">
            Manage the Station Discord bot from a dashboard — commands,
            permissions, and automations without touching a config file.
          </FeatureCard>
          <FeatureCard icon="message-square-share" title="Discord integration">
            Roles, ranks, and notifications stay in lockstep with Discord in
            real time. Members never leave the server they already live in.
          </FeatureCard>
          <FeatureCard icon="package" title="Inventory management">
            Track stock across hangars and personal holds, set thresholds, and
            know exactly what the org owns and where it sits.
          </FeatureCard>
          <FeatureCard icon="pickaxe" title="Mining operations">
            Plan extraction runs, log yields, and split refined returns across
            the crew with transparent, rules-based distribution.
          </FeatureCard>
          <FeatureCard icon="scroll-text" title="Contract system">
            Post, claim, and settle contracts for items and services — with
            escrow-style payouts and a record of who delivered what.
          </FeatureCard>
          <FeatureCard icon="users" title="Members &amp; HR">
            Onboarding, ranks, applications, and reviews. Manage your roster
            with proper HR tooling instead of pinned messages.
          </FeatureCard>
          <FeatureCard icon="arrow-left-right" title="Internal trade board">
            A members-only marketplace to buy, sell, and barter inside the org
            at fair internal rates — no scams, no spam.
          </FeatureCard>
          <FeatureCard icon="badge-check" title="Certification management">
            Define skill certifications, run sign-offs, and gate operations to
            qualified members so the right people fly the right roles.
          </FeatureCard>
          <FeatureCard icon="medal" title="Rewards &amp; commendations">
            Recognize contribution with commendations, medals, and reward
            payouts that keep your best members engaged and visible.
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

window.Features = Features;
window.FeatureCard = FeatureCard;
