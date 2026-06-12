// ============================================================
// Station — Treasury page
// Multiple accounts (main org, division, funds), each with its own
// ledger and currency (aUEC or merits). Add accounts & transactions.
// Keyboard-first on the shared app shell.
// ============================================================

const TI = window.StationIcon;

// ---- currency ----
const CURRENCY = {
  aUEC: {
    label: 'aUEC',
    icon: 'coins',
    cls: 'auec',
    sub: 'Alpha United Earth Credits',
  },
  merits: {
    label: 'merits',
    icon: 'gavel',
    cls: 'merits',
    sub: 'Prison currency (Klescher)',
  },
};
const money = (n) => Math.round(Math.abs(n)).toLocaleString('en-US');
const moneySigned = (n) => (n >= 0 ? '+' : '−') + money(n);
const abbr = (n) => {
  const a = Math.abs(n);
  return a >= 1e6
    ? (a / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
    : a >= 1e3
      ? (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
      : String(Math.round(a));
};

// ---- categories ----
const CAT = {
  mining: { label: 'Mining payout', color: 'var(--aqua-400)', dir: 'in' },
  contract: {
    label: 'Contract reward',
    color: 'var(--warning-500)',
    dir: 'in',
  },
  salvage: { label: 'Salvage sale', color: '#C879D8', dir: 'in' },
  trade: { label: 'Trade profit', color: 'var(--success-500)', dir: 'in' },
  dues: { label: 'Member dues', color: 'var(--teal-400)', dir: 'in' },
  donation: { label: 'Donation', color: 'var(--success-500)', dir: 'in' },
  ship: { label: 'Ship purchase', color: 'var(--coral-400)', dir: 'out' },
  fees: { label: 'Refinery fees', color: 'var(--coral-400)', dir: 'out' },
  payout: { label: 'Member payout', color: 'var(--coral-400)', dir: 'out' },
  repair: { label: 'Repairs', color: 'var(--coral-400)', dir: 'out' },
  bail: { label: 'Bail posted', color: '#D9A6E6', dir: 'out' },
  fine: { label: 'Fine / penalty', color: 'var(--coral-400)', dir: 'out' },
  bounty: { label: 'Bounty earned', color: 'var(--success-500)', dir: 'in' },
  transfer: { label: 'Transfer', color: 'var(--teal-300)', dir: 'xfer' },
};

// ---- accounts ----
const ACCOUNTS = [
  {
    id: 'main',
    name: 'Main Treasury',
    type: 'main',
    typeLabel: 'Primary org account',
    currency: 'aUEC',
    icon: 'landmark',
    tint: 'acct-main',
    lead: 'hezeqiah',
    desc: "The org's primary operating account. All division accounts roll up here.",
  },
  {
    id: 'mining',
    name: 'Mining Division',
    type: 'division',
    typeLabel: 'Division account',
    currency: 'aUEC',
    icon: 'gem',
    tint: 'acct-division',
    lead: 'Vesper Calderon',
    desc: 'Funds mining ops, refinery fees, and crew payouts for the mining division.',
  },
  {
    id: 'security',
    name: 'Security Division',
    type: 'division',
    typeLabel: 'Division account',
    currency: 'aUEC',
    icon: 'crosshair',
    tint: 'acct-division',
    lead: 'Dax Moreno',
    desc: 'Combat ops budget — escorts, bounties, and gear for the security wing.',
  },
  {
    id: 'bail',
    name: 'Bail & Legal Fund',
    type: 'fund',
    typeLabel: 'Merits fund',
    currency: 'merits',
    icon: 'scale',
    tint: 'acct-merits',
    lead: 'Sable Quinn',
    desc: 'Klescher prison merits pooled to bail out members and pay fines.',
  },
  {
    id: 'events',
    name: 'Events & Recruitment',
    type: 'fund',
    typeLabel: 'Reserve fund',
    currency: 'aUEC',
    icon: 'party-popper',
    tint: 'acct-fund',
    lead: 'Iris Tanaka',
    desc: 'Prize pools, giveaways, and recruitment drives.',
  },
];

// ---- ledgers (newest first); running balance computed from current balance) ----
const LEDGERS = {
  main: [
    {
      id: 1,
      date: '2954-01-12',
      t: '14:20',
      desc: 'Quantanium contract settled',
      cat: 'contract',
      member: 'Iris Tanaka',
      amount: 285000,
    },
    {
      id: 2,
      date: '2954-01-12',
      t: '09:05',
      desc: 'Mining division rollup',
      cat: 'transfer',
      member: 'Vesper Calderon',
      amount: 420000,
    },
    {
      id: 3,
      date: '2954-01-11',
      t: '22:48',
      desc: 'Hammerhead ammunition restock',
      cat: 'repair',
      member: 'Dax Moreno',
      amount: -64000,
    },
    {
      id: 4,
      date: '2954-01-11',
      t: '18:30',
      desc: 'Salvage haul — Yela wrecks',
      cat: 'salvage',
      member: 'Kova Rhys',
      amount: 240000,
    },
    {
      id: 5,
      date: '2954-01-10',
      t: '15:12',
      desc: 'Polaris hull repair',
      cat: 'repair',
      member: 'hezeqiah',
      amount: -88000,
    },
    {
      id: 6,
      date: '2954-01-10',
      t: '11:00',
      desc: 'Member dues — Jan cycle',
      cat: 'dues',
      member: '34 members',
      amount: 170000,
    },
    {
      id: 7,
      date: '2954-01-09',
      t: '20:15',
      desc: 'A2 Hercules acquisition',
      cat: 'ship',
      member: 'hezeqiah',
      amount: -2100000,
    },
    {
      id: 8,
      date: '2954-01-09',
      t: '08:40',
      desc: 'Trade run — medical supplies',
      cat: 'trade',
      member: 'Iris Tanaka',
      amount: 96000,
    },
  ],
  mining: [
    {
      id: 1,
      date: '2954-01-12',
      t: '13:00',
      desc: 'Aaron Halo session payout',
      cat: 'mining',
      member: 'hezeqiah',
      amount: 312000,
    },
    {
      id: 2,
      date: '2954-01-12',
      t: '09:05',
      desc: 'Rollup to Main Treasury',
      cat: 'transfer',
      member: 'Vesper Calderon',
      amount: -420000,
    },
    {
      id: 3,
      date: '2954-01-11',
      t: '16:22',
      desc: 'ARC-L1 refinery fees',
      cat: 'fees',
      member: 'Vesper Calderon',
      amount: -24600,
    },
    {
      id: 4,
      date: '2954-01-11',
      t: '10:10',
      desc: 'Lyria Laranite sale',
      cat: 'mining',
      member: 'Bram Holloway',
      amount: 134000,
    },
    {
      id: 5,
      date: '2954-01-10',
      t: '14:45',
      desc: 'Crew payout — Day 2',
      cat: 'payout',
      member: '5 crew',
      amount: -180000,
    },
  ],
  security: [
    {
      id: 1,
      date: '2954-01-12',
      t: '19:30',
      desc: 'Nine Tails bounty cleared',
      cat: 'bounty',
      member: 'Talia Vance',
      amount: 145000,
    },
    {
      id: 2,
      date: '2954-01-11',
      t: '21:00',
      desc: 'Escort contract — mining op',
      cat: 'contract',
      member: 'Dax Moreno',
      amount: 180000,
    },
    {
      id: 3,
      date: '2954-01-11',
      t: '12:15',
      desc: 'Ballistic ammo + medpens',
      cat: 'repair',
      member: 'Dax Moreno',
      amount: -38000,
    },
    {
      id: 4,
      date: '2954-01-10',
      t: '17:40',
      desc: 'Gladius component upgrade',
      cat: 'ship',
      member: 'Talia Vance',
      amount: -72000,
    },
  ],
  bail: [
    {
      id: 1,
      date: '2954-01-12',
      t: '02:10',
      desc: 'Bailed out — Orin (Klescher)',
      cat: 'bail',
      member: 'Orin Pell',
      amount: -25000,
    },
    {
      id: 2,
      date: '2954-01-11',
      t: '23:55',
      desc: 'Merits pooled from members',
      cat: 'donation',
      member: '7 members',
      amount: 42000,
    },
    {
      id: 3,
      date: '2954-01-10',
      t: '08:00',
      desc: 'Fine settled — contraband',
      cat: 'fine',
      member: 'Kova Rhys',
      amount: -8000,
    },
    {
      id: 4,
      date: '2954-01-09',
      t: '14:30',
      desc: 'Merits earned — prison labor',
      cat: 'donation',
      member: 'Bram Holloway',
      amount: 16500,
    },
  ],
  events: [
    {
      id: 1,
      date: '2954-01-12',
      t: '12:00',
      desc: 'Recruitment drive prize pool',
      cat: 'payout',
      member: 'Iris Tanaka',
      amount: -150000,
    },
    {
      id: 2,
      date: '2954-01-10',
      t: '19:00',
      desc: 'Org donation drive',
      cat: 'donation',
      member: '12 members',
      amount: 280000,
    },
    {
      id: 3,
      date: '2954-01-08',
      t: '16:20',
      desc: 'Racing event entry fees',
      cat: 'dues',
      member: '8 members',
      amount: 64000,
    },
  ],
};

// derive current balance from ledger sum + a base, so running balances are consistent
const balanceOf = (id) =>
  (LEDGERS[id] || []).reduce((s, x) => s + x.amount, 0) +
  ({
    main: 4200000,
    mining: 540000,
    security: 410000,
    bail: 31500,
    events: 194000,
  }[id] || 0);

function CurBadge({ currency }) {
  const c = CURRENCY[currency];
  return (
    <span className={'cur-badge ' + c.cls}>
      <TI n={c.icon} />
      {c.label}
    </span>
  );
}

// ---- account card ----
function AcctCard({ a, balance, active, onSelect }) {
  const spark = [40, 55, 48, 70, 62, 85, 78, 96];
  return (
    <button
      className={'acct-card' + (active ? ' active' : '')}
      onClick={onSelect}
      aria-pressed={active}
    >
      <div className="top">
        <span className={'ic ' + a.tint}>
          <TI n={a.icon} />
        </span>
        <div>
          <div className="nm">{a.name}</div>
          <div className="ty">{a.typeLabel}</div>
        </div>
      </div>
      <div className="bal">
        {abbr(balance)}
        <span className="cur">{CURRENCY[a.currency].label}</span>
      </div>
      <div className="spark">
        {spark.map((h, i) => (
          <i
            key={i}
            style={{
              height: h + '%',
              background: active ? 'var(--brand)' : undefined,
            }}
          ></i>
        ))}
      </div>
    </button>
  );
}

// ---- ledger row ----
function LedgerRow({
  tx,
  currency,
  running,
  tabIndex,
  regRef,
  onFocus,
  selected,
}) {
  const cat = CAT[tx.cat];
  const dir = cat.dir;
  const icCls = dir === 'in' ? 'in' : dir === 'out' ? 'out' : 'xfer';
  const icName =
    dir === 'in'
      ? 'arrow-down-left'
      : dir === 'out'
        ? 'arrow-up-right'
        : 'arrow-left-right';
  return (
    <tr
      ref={regRef}
      tabIndex={tabIndex}
      aria-selected={selected}
      onFocus={onFocus}
    >
      <td>
        <div className="t-ent">
          <span className={'led-ic ' + icCls}>
            <TI n={icName} />
          </span>
          <div className="led-desc">
            <div className="d">{tx.desc}</div>
            <div className="m">{tx.member}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="led-cat">
          <span className="cdot" style={{ background: cat.color }}></span>
          {cat.label}
        </span>
      </td>
      <td className="t-muted t-mono" style={{ fontSize: 'var(--text-xs)' }}>
        {tx.date.slice(5)} · {tx.t}
      </td>
      <td className={'amt ' + (tx.amount >= 0 ? 'pos' : 'neg')}>
        {moneySigned(tx.amount)}
      </td>
      <td className="run">{money(running)}</td>
    </tr>
  );
}

function TreasuryPage() {
  const toast = window.__toast || (() => {});
  const [accounts, setAccounts] = React.useState(ACCOUNTS);
  const [ledgers, setLedgers] = React.useState(LEDGERS);
  const [balances, setBalances] = React.useState(() =>
    Object.fromEntries(ACCOUNTS.map((a) => [a.id, balanceOf(a.id)])),
  );
  const [selId, setSelId] = React.useState('main');
  const [search, setSearch] = React.useState('');
  const [dialog, setDialog] = React.useState(null); // 'tx' | 'account'
  const sel = accounts.find((a) => a.id === selId);
  const ledger = ledgers[selId] || [];

  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  // running balances: start at current balance, walk down (newest first)
  const rows = React.useMemo(() => {
    const filtered = ledger.filter(
      (tx) =>
        !search ||
        tx.desc.toLowerCase().includes(search.toLowerCase()) ||
        tx.member.toLowerCase().includes(search.toLowerCase()) ||
        CAT[tx.cat].label.toLowerCase().includes(search.toLowerCase()),
    );
    let run = balances[selId];
    // compute running for the full ledger first
    const fullRun = {};
    let r = balances[selId];
    for (const tx of ledger) {
      fullRun[tx.id] = r;
      r -= tx.amount;
    }
    return filtered.map((tx) => ({ tx, running: fullRun[tx.id] }));
  }, [ledger, search, balances, selId]);

  const roving = window.useRoving(rows.length, {});
  React.useEffect(() => {
    roving.setIdx(0);
  }, [selId]);

  // cycle stats
  const income = ledger
    .filter((t) => t.amount > 0 && CAT[t.cat].dir !== 'xfer')
    .reduce((s, t) => s + t.amount, 0);
  const expense = ledger
    .filter((t) => t.amount < 0 && CAT[t.cat].dir !== 'xfer')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const curLabel = CURRENCY[sel.currency].label;

  const addTx = (tx) => {
    const id = Math.max(0, ...ledger.map((x) => x.id)) + 1;
    const signed =
      tx.dir === 'out' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
    setLedgers((L) => ({
      ...L,
      [selId]: [
        {
          id,
          date: '2954-01-12',
          t: 'now',
          desc: tx.desc,
          cat: tx.cat,
          member: tx.member || sel.lead,
          amount: signed,
        },
        ...(L[selId] || []),
      ],
    }));
    setBalances((b) => ({ ...b, [selId]: b[selId] + signed }));
    toast('Transaction recorded', 'check');
    setDialog(null);
  };
  const addAccount = (acc) => {
    const id = 'acct-' + Date.now();
    const tintByType = {
      division: 'acct-division',
      fund: acc.currency === 'merits' ? 'acct-merits' : 'acct-fund',
      main: 'acct-main',
    };
    const a = {
      id,
      name: acc.name,
      type: acc.type,
      typeLabel:
        acc.type === 'division'
          ? 'Division account'
          : acc.currency === 'merits'
            ? 'Merits fund'
            : 'Reserve fund',
      currency: acc.currency,
      icon:
        acc.type === 'division'
          ? 'git-branch'
          : acc.currency === 'merits'
            ? 'scale'
            : 'piggy-bank',
      tint: tintByType[acc.type],
      lead: 'hezeqiah',
      desc: acc.desc || 'New account.',
    };
    setAccounts((arr) => [...arr, a]);
    setLedgers((L) => ({ ...L, [id]: [] }));
    setBalances((b) => ({ ...b, [id]: Number(acc.starting) || 0 }));
    setSelId(id);
    toast('Account created: ' + acc.name, 'check');
    setDialog(null);
  };

  const totalAUEC = accounts
    .filter((a) => a.currency === 'aUEC')
    .reduce((s, a) => s + balances[a.id], 0);
  const totalMerits = accounts
    .filter((a) => a.currency === 'merits')
    .reduce((s, a) => s + balances[a.id], 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <TI n="landmark" /> Assets <TI n="chevron-right" /> Treasury
          </div>
          <h1 className="page-title">Treasury</h1>
          <p className="page-sub">
            Track the org's accounts and ledgers — a main treasury plus division
            accounts and funds, each in its own currency. Record income,
            expenses, and transfers.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setDialog('account')}
          >
            <TI n="plus" /> New account
          </button>
          <button
            className="btn btn-primary btn-sm"
            id="trez-new"
            onClick={() => setDialog('tx')}
          >
            <TI n="arrow-left-right" /> New transaction{' '}
            <span className="kbd" style={{ marginLeft: 6 }}>
              <kbd>n</kbd>
            </span>
          </button>
        </div>
      </div>

      <StatStrip
        items={[
          {
            k: 'Total holdings',
            icon: 'wallet',
            v: abbr(totalAUEC),
            unit: 'aUEC',
            d:
              accounts.filter((a) => a.currency === 'aUEC').length +
              ' aUEC accounts',
          },
          {
            k: 'Merits pool',
            icon: 'gavel',
            v: abbr(totalMerits),
            unit: 'merits',
            d: 'bail & legal fund',
          },
          {
            k: 'Accounts',
            icon: 'layers',
            v: accounts.length,
            d: 'across the org',
          },
          {
            k: 'Selected balance',
            icon: sel.icon,
            v: abbr(balances[selId]),
            unit: curLabel,
            d: sel.name,
          },
        ]}
      />

      <div className="acct-strip">
        {accounts.map((a) => (
          <AcctCard
            key={a.id}
            a={a}
            balance={balances[a.id]}
            active={a.id === selId}
            onSelect={() => setSelId(a.id)}
          />
        ))}
        <button className="acct-add" onClick={() => setDialog('account')}>
          <span className="pl">
            <TI n="plus" />
          </span>
          <span className="lbl">Add account</span>
        </button>
      </div>

      {/* selected account */}
      <div className="acct-head">
        <span className={'big-ic ' + sel.tint}>
          <TI n={sel.icon} />
        </span>
        <div className="h">
          <div className="t">
            {sel.name} <CurBadge currency={sel.currency} />
          </div>
          <div className="s">
            {sel.desc} · Managed by {sel.lead}
          </div>
        </div>
        <div className="bal-big">
          <div className="k">Current balance</div>
          <div className="v">
            {money(balances[selId])}
            <span className="cur">{curLabel}</span>
          </div>
        </div>
      </div>

      <StatStrip
        items={[
          {
            k: 'Income (cycle)',
            icon: 'trending-up',
            v: abbr(income),
            unit: curLabel,
            d: 'deposits this cycle',
            tone: 'up',
          },
          {
            k: 'Expenses (cycle)',
            icon: 'trending-down',
            v: abbr(expense),
            unit: curLabel,
            d: 'withdrawals this cycle',
            tone: 'warn',
          },
          {
            k: 'Net flow',
            icon: 'activity',
            v: (income - expense >= 0 ? '+' : '−') + abbr(income - expense),
            unit: curLabel,
            d: 'cycle net',
            tone: income - expense >= 0 ? 'up' : 'warn',
          },
          {
            k: 'Entries',
            icon: 'receipt',
            v: ledger.length,
            d: 'ledger transactions',
          },
        ]}
      />

      <div className="ledger-toolbar">
        <label className="inv-search">
          <TI n="search" />
          <input
            value={search}
            placeholder="Search ledger…"
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search ledger"
          />
        </label>
        <span className="grow"></span>
        <div className="chips">
          <button className="fchip">
            <TI n="filter" /> All categories
          </button>
          <button className="fchip">
            <TI n="download" /> Export CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="dtable-wrap" style={{ marginTop: 'var(--space-5)' }}>
          <div className="ledger-empty">
            <div className="e-ic">
              <TI n="receipt" />
            </div>
            <h3>
              {search ? 'No entries match your search' : 'No transactions yet'}
            </h3>
            <p>
              {search
                ? 'Try a different term.'
                : 'Record income, an expense, or a transfer to start this ledger.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="dtable-wrap" style={{ marginTop: 'var(--space-5)' }}>
          <table
            className="dtable led-table"
            role="grid"
            aria-label={sel.name + ' ledger'}
            onKeyDown={roving.onKeyDown}
          >
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Category</th>
                <th>Date</th>
                <th className="num">Amount</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tx, running }, i) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  currency={sel.currency}
                  running={running}
                  tabIndex={roving.getTab(i)}
                  regRef={roving.register(i)}
                  onFocus={() => roving.setIdx(i)}
                  selected={roving.idx === i}
                />
              ))}
            </tbody>
          </table>
          <div className="list-hint">
            <span className="kbd">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
            </span>{' '}
            move
            <span className="kbd">
              <kbd>n</kbd>
            </span>{' '}
            new transaction
            <span style={{ marginLeft: 'auto' }}>
              {rows.length} of {ledger.length} entries · all amounts in{' '}
              {curLabel}
            </span>
          </div>
        </div>
      )}

      {dialog === 'tx' && (
        <TxDialog
          account={sel}
          onClose={() => setDialog(null)}
          onSave={addTx}
        />
      )}
      {dialog === 'account' && (
        <AccountDialog onClose={() => setDialog(null)} onSave={addAccount} />
      )}
    </>
  );
}

// ---- new transaction dialog ----
function TxDialog({ account, onClose, onSave }) {
  const [dir, setDir] = React.useState('in');
  const [amount, setAmount] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('contract');
  const [member, setMember] = React.useState('');
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [dir]);
  const cats = Object.entries(CAT).filter(([, c]) =>
    dir === 'xfer'
      ? c.dir === 'xfer'
      : c.dir === dir ||
        (dir === 'in' && c.dir === 'in') ||
        (dir === 'out' && c.dir === 'out'),
  );
  const ready = Number(amount) > 0 && desc.trim();
  const cur = CURRENCY[account.currency].label;
  return (
    <div
      className="scrim"
      onMouseDown={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="act-pop"
        style={{ marginTop: '11vh', width: 'min(440px, 94vw)' }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="New transaction"
      >
        <div className="act-pop-head">
          <span className="ic">
            <TI n="arrow-left-right" />
          </span>
          <span className="t">New transaction · {account.name}</span>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <TI n="x" />
          </button>
        </div>
        <div className="act-pop-body">
          <div className="seg-pills" role="group" aria-label="Direction">
            <button
              className="seg-pill"
              aria-pressed={dir === 'in'}
              onClick={() => {
                setDir('in');
                setCat('contract');
              }}
            >
              <TI n="arrow-down-left" /> Income
            </button>
            <button
              className="seg-pill"
              aria-pressed={dir === 'out'}
              onClick={() => {
                setDir('out');
                setCat('payout');
              }}
            >
              <TI n="arrow-up-right" /> Expense
            </button>
            <button
              className="seg-pill"
              aria-pressed={dir === 'xfer'}
              onClick={() => {
                setDir('xfer');
                setCat('transfer');
              }}
            >
              <TI n="arrow-left-right" /> Transfer
            </button>
          </div>
          <div>
            <label className="field-lbl">Amount ({cur})</label>
            <input
              className="field-in mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </div>
          <div>
            <label className="field-lbl">Description</label>
            <input
              className="field-in"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What was this for?"
            />
          </div>
          <div>
            <label className="field-lbl">Category</label>
            <span className="inv-select" style={{ width: '100%', height: 40 }}>
              <TI n="tag" className="lead" />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                style={{ flex: 1 }}
              >
                {cats.map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </select>
              <TI n="chevron-down" className="chev" />
            </span>
          </div>
          <div>
            <label className="field-lbl">Member / counterparty</label>
            <input
              className="field-in"
              value={member}
              onChange={(e) => setMember(e.target.value)}
              placeholder={account.lead}
            />
          </div>
        </div>
        <div className="act-pop-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!ready}
            onClick={() =>
              onSave({ dir, amount: Number(amount), desc, cat, member })
            }
          >
            <TI n="check" /> Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- new account dialog ----
function AccountDialog({ onClose, onSave }) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('division');
  const [currency, setCurrency] = React.useState('aUEC');
  const [starting, setStarting] = React.useState('0');
  const [desc, setDesc] = React.useState('');
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [type, currency]);
  const ready = name.trim();
  return (
    <div
      className="scrim"
      onMouseDown={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="act-pop"
        style={{ marginTop: '9vh', width: 'min(460px, 94vw)' }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="New account"
      >
        <div className="act-pop-head">
          <span className="ic">
            <TI n="landmark" />
          </span>
          <span className="t">New account</span>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <TI n="x" />
          </button>
        </div>
        <div className="act-pop-body">
          <div>
            <label className="field-lbl">Account name</label>
            <input
              className="field-in"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Salvage Division"
              autoFocus
            />
          </div>
          <div>
            <label className="field-lbl">Account type</label>
            <div className="type-grid" role="group" aria-label="Account type">
              <button
                className="type-opt"
                aria-pressed={type === 'division'}
                onClick={() => setType('division')}
              >
                <TI n="git-branch" />
                <span className="l">Division</span>
              </button>
              <button
                className="type-opt"
                aria-pressed={type === 'fund'}
                onClick={() => setType('fund')}
              >
                <TI n="piggy-bank" />
                <span className="l">Fund</span>
              </button>
              <button
                className="type-opt"
                aria-pressed={type === 'main'}
                onClick={() => setType('main')}
              >
                <TI n="landmark" />
                <span className="l">Operating</span>
              </button>
            </div>
          </div>
          <div>
            <label className="field-lbl">Currency</label>
            <div className="cur-choice" role="group" aria-label="Currency">
              <button
                className="cur-opt"
                aria-pressed={currency === 'aUEC'}
                onClick={() => setCurrency('aUEC')}
              >
                <span className="ci acct-main">
                  <TI n="coins" />
                </span>
                <div>
                  <div className="nm">aUEC</div>
                  <div className="sub">Standard credits</div>
                </div>
              </button>
              <button
                className="cur-opt"
                aria-pressed={currency === 'merits'}
                onClick={() => setCurrency('merits')}
              >
                <span className="ci acct-merits">
                  <TI n="gavel" />
                </span>
                <div>
                  <div className="nm">merits</div>
                  <div className="sub">Prison currency</div>
                </div>
              </button>
            </div>
          </div>
          <div>
            <label className="field-lbl">
              Starting balance ({CURRENCY[currency].label})
            </label>
            <input
              className="field-in mono"
              value={starting}
              onChange={(e) => setStarting(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="field-lbl">Description (optional)</label>
            <input
              className="field-in"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this account for?"
            />
          </div>
        </div>
        <div className="act-pop-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!ready}
            onClick={() => onSave({ name, type, currency, starting, desc })}
          >
            <TI n="check" /> Create account
          </button>
        </div>
      </div>
    </div>
  );
}

function TreasuryApp() {
  const commands = [
    {
      id: 'trez-tx',
      group: 'Treasury',
      icon: 'arrow-left-right',
      label: 'New transaction',
      hint: 'n',
      run: () => {
        const b = document.getElementById('trez-new');
        if (b) b.click();
      },
    },
    {
      id: 'trez-acct',
      group: 'Treasury',
      icon: 'plus',
      label: 'New account',
      run: () => window.__toast && window.__toast('New account'),
    },
    {
      id: 'trez-export',
      group: 'Treasury',
      icon: 'download',
      label: 'Export ledger (CSV)',
      run: () =>
        window.__toast && window.__toast('Ledger exported', 'download'),
    },
  ];
  const helpExtra = [
    ['New transaction', ['n']],
    ['Move ledger', ['↑', '↓']],
    ['Toggle theme', ['t']],
    ['Command palette', ['⌘', 'K']],
  ];
  return (
    <AppShell
      active="treasury"
      commands={commands}
      helpExtra={helpExtra}
      onNew={() => {
        const b = document.getElementById('trez-new');
        if (b) b.click();
      }}
      searchPlaceholder="Search accounts, ledger…"
    >
      <TreasuryPage />
    </AppShell>
  );
}

window.TreasuryApp = TreasuryApp;
