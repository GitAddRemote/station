// ============================================================
// Station — Members / HR page
// Roster + member profile with view→edit (rank, division, status,
// certifications, HR notes). Leadership & HR can update records.
// Keyboard-first: roving roster, Enter opens, native selects in edit.
// ============================================================

const MI = window.StationIcon;

const RANKS = ['Recruit', 'Member', 'Senior', 'Officer', 'Leadership'];
const rankCls = (r) =>
  ({
    Recruit: 'recruit',
    Member: 'member',
    Senior: 'senior',
    Officer: 'officer',
    Leadership: 'leadership',
  })[r] || 'member';

const DIVISIONS = {
  Mining: { icon: 'gem', tint: 'role-mining' },
  Salvage: { icon: 'recycle', tint: 'role-salvage' },
  Security: { icon: 'crosshair', tint: 'role-combat' },
  Logistics: { icon: 'container', tint: 'role-hauling' },
  Medical: { icon: 'cross', tint: 'role-medical' },
  Industry: { icon: 'factory', tint: 'role-explore' },
};
const STATUS = {
  Active: { tone: 'success', icon: 'circle-check' },
  Recruit: { tone: 'info', icon: 'user-plus' },
  'On leave': { tone: 'warn', icon: 'pause' },
  Inactive: { tone: 'neutral', icon: 'moon' },
};
const ALL_CERTS = [
  'Pilot',
  'Gunner',
  'Mining Op',
  'Salvage Op',
  'Medic',
  'Multicrew',
  'Quartermaster',
  'Engineer',
  'Scout',
  'FPS',
];

const MEMBERS = [
  {
    id: 'M-001',
    name: 'hezeqiah',
    handle: '@hez',
    rank: 'Leadership',
    division: 'Mining',
    status: 'Active',
    presence: 'online',
    joined: '2952-03-14',
    lastSeen: 'Now',
    ops: 142,
    trust: 'trusted',
    ship: 'RSI Polaris',
    region: 'US-East',
    certs: ['Pilot', 'Mining Op', 'Multicrew', 'Quartermaster'],
    discord: 'hezeqiah#0001',
    note: 'Org founder & quartermaster. Final say on fleet allocations.',
  },
  {
    id: 'M-002',
    name: 'Vesper Calderon',
    handle: '@nyx',
    rank: 'Officer',
    division: 'Mining',
    status: 'Active',
    presence: 'online',
    joined: '2952-06-02',
    lastSeen: '4m ago',
    ops: 98,
    trust: 'trusted',
    ship: 'Argo MOLE',
    region: 'EU-West',
    certs: ['Pilot', 'Mining Op', 'Gunner'],
    discord: 'vesper#2231',
    note: 'Leads weekly mining ops. Reliable turret crew lead.',
  },
  {
    id: 'M-003',
    name: 'Dax Moreno',
    handle: '@dax',
    rank: 'Senior',
    division: 'Security',
    status: 'Active',
    presence: 'away',
    joined: '2953-01-19',
    lastSeen: '1h ago',
    ops: 76,
    trust: 'verified',
    ship: 'Aegis Hammerhead',
    region: 'US-West',
    certs: ['Pilot', 'Gunner', 'FPS', 'Multicrew'],
    discord: 'dax#5510',
    note: 'Combat division. Good under pressure, mentor for new gunners.',
  },
  {
    id: 'M-004',
    name: 'Iris Tanaka',
    handle: '@iris',
    rank: 'Senior',
    division: 'Logistics',
    status: 'Active',
    presence: 'offline',
    joined: '2953-02-08',
    lastSeen: '6h ago',
    ops: 64,
    trust: 'verified',
    ship: 'MISC Hull C',
    region: 'APAC',
    certs: ['Pilot', 'Multicrew'],
    discord: 'iris#7782',
    note: 'Runs the long-haul cargo routes. Detail-oriented logistician.',
  },
  {
    id: 'M-005',
    name: 'Kova Rhys',
    handle: '@kova',
    rank: 'Member',
    division: 'Salvage',
    status: 'Active',
    presence: 'away',
    joined: '2953-04-22',
    lastSeen: '22m ago',
    ops: 41,
    trust: 'verified',
    ship: 'Drake Vulture',
    region: 'EU-Central',
    certs: ['Pilot', 'Salvage Op'],
    discord: 'kova#3140',
    note: 'Salvage specialist. Wants to cross-train on the Reclaimer.',
  },
  {
    id: 'M-006',
    name: 'Sable Quinn',
    handle: '@sable',
    rank: 'Member',
    division: 'Medical',
    status: 'On leave',
    presence: 'offline',
    joined: '2953-05-30',
    lastSeen: '8d ago',
    ops: 33,
    trust: 'verified',
    ship: 'Cutlass Red',
    region: 'US-East',
    certs: ['Pilot', 'Medic'],
    discord: 'sable#9920',
    note: 'On leave until next patch. Primary field medic for combat ops.',
  },
  {
    id: 'M-007',
    name: 'Bram Holloway',
    handle: '@bram',
    rank: 'Recruit',
    division: 'Industry',
    status: 'Recruit',
    presence: 'online',
    joined: '2954-01-04',
    lastSeen: '12m ago',
    ops: 6,
    trust: 'new',
    ship: 'MISC Prospector',
    region: 'EU-West',
    certs: ['Pilot'],
    discord: 'bram#1188',
    note: 'Trial period — 2 ops attended this week. Eager, needs mining cert.',
  },
  {
    id: 'M-008',
    name: 'Talia Vance',
    handle: '@tal',
    rank: 'Member',
    division: 'Security',
    status: 'Active',
    presence: 'online',
    joined: '2953-09-12',
    lastSeen: '2m ago',
    ops: 52,
    trust: 'verified',
    ship: 'Anvil F8C',
    region: 'US-Central',
    certs: ['Pilot', 'Gunner', 'FPS'],
    discord: 'talia#4407',
    note: 'Escort wing. Requested officer review next cycle.',
  },
  {
    id: 'M-009',
    name: 'Orin Pell',
    handle: '@orin',
    rank: 'Recruit',
    division: 'Logistics',
    status: 'Inactive',
    presence: 'offline',
    joined: '2953-11-28',
    lastSeen: '31d ago',
    ops: 9,
    trust: 'new',
    ship: 'Freelancer MAX',
    region: 'APAC',
    certs: ['Pilot'],
    discord: 'orin#6635',
    note: 'Inactive 30+ days — flag for roster review / outreach.',
  },
];

const initials = (s) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ---- roster row ----
function MemberRow({ m, selected, tabIndex, regRef, onSelect }) {
  const div = DIVISIONS[m.division],
    st = STATUS[m.status];
  return (
    <tr
      ref={regRef}
      tabIndex={tabIndex}
      aria-selected={selected}
      onClick={onSelect}
      onFocus={onSelect}
    >
      <td>
        <div className="t-ent">
          <span className="av-wrap">
            <span
              className="r-av"
              style={{ background: window.avColor(m.name) }}
            >
              {initials(m.name)}
              <span className={'pres ' + m.presence}></span>
            </span>
          </span>
          <div>
            <div className="nm">{m.name}</div>
            <div className="sub">
              {m.handle} · {m.id}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className={'rank ' + rankCls(m.rank)}>{m.rank}</span>
      </td>
      <td>
        <span className="divc">
          <span className={'di ' + div.tint}>
            <MI n={div.icon} />
          </span>
          {m.division}
        </span>
      </td>
      <td>
        <StatusPill tone={st.tone} icon={st.icon}>
          {m.status}
        </StatusPill>
      </td>
      <td className="t-muted t-mono" style={{ fontSize: 'var(--text-xs)' }}>
        {m.lastSeen}
      </td>
    </tr>
  );
}

// ---- member detail (view + edit) ----
function MemberDetail({ m, onSave }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(m);
  React.useEffect(() => {
    setDraft(m);
    setEditing(false);
  }, [m.id]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const toast = window.__toast || (() => {});

  const cur = editing ? draft : m;
  const div = DIVISIONS[cur.division],
    st = STATUS[cur.status];
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const save = () => {
    onSave(draft);
    setEditing(false);
    toast(draft.name + ' record updated', 'check');
  };
  const cancel = () => {
    setDraft(m);
    setEditing(false);
  };
  const addCert = (c) => {
    if (c && !draft.certs.includes(c)) set('certs', [...draft.certs, c]);
  };
  const rmCert = (c) =>
    set(
      'certs',
      draft.certs.filter((x) => x !== c),
    );

  const trustIcon = {
    trusted: 'shield-check',
    verified: 'badge-check',
    new: 'user',
  }[cur.trust];
  const trustLabel = { trusted: 'Trusted', verified: 'Verified', new: 'New' }[
    cur.trust
  ];

  return (
    <div className="panel detail">
      {editing && (
        <div className="hr-bar">
          <MI n="pencil" /> Editing as <strong>&nbsp;HR / Leadership</strong>
          <span className="grow"></span>changes are logged
        </div>
      )}
      <div className="panel-body">
        <div className="mem-hero">
          <span className="av" style={{ background: window.avColor(cur.name) }}>
            {initials(cur.name)}
            <span className={'pres ' + cur.presence}></span>
          </span>
          <div className="h">
            <div className="nm">{cur.name}</div>
            <div className="hd">
              {cur.handle} · {cur.discord}
            </div>
          </div>
          <span className={'rank ' + rankCls(cur.rank)}>{cur.rank}</span>
        </div>
        <div className="mstats">
          <div className="mstat">
            <div className="v">{cur.ops}</div>
            <div className="k">Ops attended</div>
          </div>
          <div className="mstat">
            <div className="v" style={{ textTransform: 'capitalize' }}>
              {trustLabel}
            </div>
            <div className="k">Trust</div>
          </div>
          <div className="mstat">
            <div className="v">{cur.joined.slice(0, 4)}</div>
            <div className="k">Member since</div>
          </div>
        </div>
      </div>

      {/* role / division / status */}
      <div className="detail-section">
        <div className="ds-cap">
          <span>Role &amp; assignment</span>
        </div>
        {editing ? (
          <>
            <div className="fgrid">
              <div className="fctl">
                <div className="fl">
                  <MI n="shield" /> Rank
                </div>
                <select
                  value={draft.rank}
                  onChange={(e) => set('rank', e.target.value)}
                >
                  {RANKS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="fctl">
                <div className="fl">
                  <MI n="git-branch" /> Division
                </div>
                <select
                  value={draft.division}
                  onChange={(e) => set('division', e.target.value)}
                >
                  {Object.keys(DIVISIONS).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="fgrid">
              <div className="fctl">
                <div className="fl">
                  <MI n="activity" /> Status
                </div>
                <select
                  value={draft.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {Object.keys(STATUS).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="fctl">
                <div className="fl">
                  <MI n="rocket" /> Primary ship
                </div>
                <input
                  value={draft.ship}
                  onChange={(e) => set('ship', e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="kv">
              <span className="k">
                <MI n="git-branch" /> Division
              </span>
              <span className="v">
                <span className="divc">
                  <span className={'di ' + div.tint}>
                    <MI n={div.icon} />
                  </span>
                  {cur.division}
                </span>
              </span>
            </div>
            <div className="kv">
              <span className="k">
                <MI n="activity" /> Status
              </span>
              <span className="v">
                <StatusPill tone={st.tone} icon={st.icon}>
                  {cur.status}
                </StatusPill>
              </span>
            </div>
            <div className="kv">
              <span className="k">
                <MI n="rocket" /> Primary ship
              </span>
              <span className="v">{cur.ship}</span>
            </div>
            <div className="kv">
              <span className="k">
                <MI n="globe" /> Region
              </span>
              <span className="v">{cur.region}</span>
            </div>
            <div className="kv">
              <span className="k">
                <MI n={trustIcon} /> Trust
              </span>
              <span className="v">
                <span className={'trust ' + cur.trust}>
                  <MI n={trustIcon} />
                  {trustLabel}
                </span>
              </span>
            </div>
            <div className="kv">
              <span className="k">
                <MI n="clock" /> Last seen
              </span>
              <span
                className="v t-mono"
                style={{ fontWeight: 400, color: 'var(--text-muted)' }}
              >
                {cur.lastSeen}
              </span>
            </div>
          </>
        )}
      </div>

      {/* certifications */}
      <div className="detail-section">
        <div className="ds-cap">
          <span>Certifications · {cur.certs.length}</span>
        </div>
        <div className="cert-wrap">
          {cur.certs.map((c) => (
            <span className="cert" key={c}>
              <MI n="award" />
              {c}
              {editing && (
                <button
                  className="rm"
                  aria-label={'Remove ' + c}
                  onClick={() => rmCert(c)}
                >
                  <MI n="x" />
                </button>
              )}
            </span>
          ))}
          {editing &&
            ALL_CERTS.filter((c) => !draft.certs.includes(c))
              .slice(0, 3)
              .map((c) => (
                <button className="cert-add" key={c} onClick={() => addCert(c)}>
                  <MI n="plus" />
                  {c}
                </button>
              ))}
        </div>
      </div>

      {/* HR notes */}
      <div className="detail-section">
        <div className="ds-cap">
          <span>HR notes</span>
          <span className="kbd" style={{ color: 'var(--warning-500)' }}>
            <kbd>HR only</kbd>
          </span>
        </div>
        {editing ? (
          <div className="fctl">
            <textarea
              value={draft.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Private note visible to HR & leadership…"
            ></textarea>
          </div>
        ) : (
          <div className="hr-note">
            <div className="lock">
              <MI n="lock" /> Visible to HR &amp; leadership
            </div>
            {cur.note}
          </div>
        )}
      </div>

      {/* actions */}
      <div
        className="panel-body"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 'var(--space-3)',
        }}
      >
        {editing ? (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={cancel}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              style={{ flex: 1 }}
            >
              <MI n="check" /> Save record
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setEditing(true)}
              style={{ flex: 1 }}
            >
              <MI n="pencil" /> Edit record
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
              <MI n="message-circle" /> Message
            </button>
            <button className="btn btn-ghost btn-sm" aria-label="More">
              <MI n="more-horizontal" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- page ----
function MembersPage() {
  const [members, setMembers] = React.useState(MEMBERS);
  const [div, setDiv] = React.useState('all');
  const visible = React.useMemo(
    () => (div === 'all' ? members : members.filter((m) => m.division === div)),
    [members, div],
  );
  const [selId, setSelId] = React.useState(MEMBERS[0].id);
  const sel = members.find((m) => m.id === selId);
  const roving = window.useRoving(visible.length, {
    onActivate: (i) => {
      if (visible[i]) setSelId(visible[i].id);
    },
  });
  React.useEffect(() => {
    if (visible.length && !visible.find((m) => m.id === selId)) {
      setSelId(visible[0].id);
      roving.setIdx(0);
    }
  }, [div]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const onSave = (updated) =>
    setMembers((arr) => arr.map((m) => (m.id === updated.id ? updated : m)));

  const active = members.filter((m) => m.status === 'Active').length;
  const recruits = members.filter((m) => m.status === 'Recruit').length;
  const leave = members.filter((m) => m.status === 'On leave').length;
  const flagged = members.filter((m) => m.status === 'Inactive').length;

  const filters = [
    { value: 'all', label: 'All', count: members.length },
    ...Object.keys(DIVISIONS).map((d) => ({
      value: d,
      label: d,
      icon: DIVISIONS[d].icon,
    })),
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <MI n="users" /> Operations <MI n="chevron-right" /> Members
          </div>
          <h1 className="page-title">Members</h1>
          <p className="page-sub">
            The org roster — ranks, divisions, certifications, and HR records.
            Leadership and HR can view and update any member.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm">
            <MI n="download" /> Export roster
          </button>
          <button className="btn btn-primary btn-sm" id="mem-new">
            <MI n="user-plus" /> Invite member{' '}
            <span className="kbd" style={{ marginLeft: 6 }}>
              <kbd>n</kbd>
            </span>
          </button>
        </div>
      </div>

      <StatStrip
        items={[
          {
            k: 'Total members',
            icon: 'users',
            v: members.length,
            d: Object.keys(DIVISIONS).length + ' divisions',
          },
          {
            k: 'Active',
            icon: 'circle-check',
            v: active,
            d: 'currently serving',
            tone: 'up',
          },
          {
            k: 'Recruits',
            icon: 'user-plus',
            v: recruits,
            d: 'in trial period',
          },
          {
            k: 'On leave',
            icon: 'pause',
            v: leave,
            d: 'temporarily away',
            tone: 'warn',
          },
          {
            k: 'Roster review',
            icon: 'flag',
            v: flagged,
            d: 'inactive 30d+',
            tone: flagged ? 'warn' : '',
          },
        ]}
      />

      <div className="roster-bar">
        <Segmented
          options={filters}
          value={div}
          onChange={setDiv}
          ariaLabel="Filter members by division"
        />
        <span className="grow"></span>
        <div className="chips">
          <button className="fchip">
            <MI n="arrow-down-up" /> Sort: Rank
          </button>
          <button className="fchip">
            <MI n="filter" /> Status
          </button>
        </div>
      </div>

      <div className="split">
        <div className="dtable-wrap">
          <table
            className="dtable"
            role="grid"
            aria-label="Member roster"
            onKeyDown={roving.onKeyDown}
          >
            <thead>
              <tr>
                <th>Member</th>
                <th>Rank</th>
                <th>Division</th>
                <th>Status</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m, i) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  selected={m.id === selId}
                  tabIndex={roving.getTab(i)}
                  regRef={roving.register(i)}
                  onSelect={() => {
                    setSelId(m.id);
                    roving.setIdx(i);
                  }}
                />
              ))}
            </tbody>
          </table>
          <div className="list-hint">
            <span className="kbd">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
            </span>{' '}
            move{' '}
            <span className="kbd">
              <kbd>↵</kbd>
            </span>{' '}
            open{' '}
            <span style={{ marginLeft: 'auto' }}>
              {visible.length} of {members.length} members
            </span>
          </div>
        </div>
        {sel && <MemberDetail m={sel} onSave={onSave} />}
      </div>
    </>
  );
}

function MembersApp() {
  const commands = [
    {
      id: 'mem-invite',
      group: 'Members',
      icon: 'user-plus',
      label: 'Invite a member',
      hint: 'n',
      run: () => window.__toast && window.__toast('Invite sent', 'user-plus'),
    },
    {
      id: 'mem-export',
      group: 'Members',
      icon: 'download',
      label: 'Export roster (CSV)',
      run: () =>
        window.__toast && window.__toast('Roster exported', 'download'),
    },
    {
      id: 'mem-review',
      group: 'Members',
      icon: 'flag',
      label: 'Roster review — inactive members',
      run: () =>
        window.__toast && window.__toast('Showing inactive members', 'flag'),
    },
  ];
  const helpExtra = [
    ['Invite member', ['n']],
    ['Filter division', ['←', '→']],
    ['Open record', ['↵']],
    ['Toggle theme', ['t']],
  ];
  return (
    <AppShell
      active="members"
      commands={commands}
      helpExtra={helpExtra}
      onNew={() =>
        window.__toast && window.__toast('Invite a new member', 'user-plus')
      }
      searchPlaceholder="Search members, handles, certs…"
    >
      <MembersPage />
    </AppShell>
  );
}

window.MembersApp = MembersApp;
