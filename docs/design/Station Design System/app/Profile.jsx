// ============================================================
// Station — My Profile page
// The logged-in member's own profile. View ↔ Edit (like Members).
// In-game name DEFAULTS to the Station login username. Includes bio,
// identity, contact, social connections, organizations, and security.
// Keyboard-first on the shared app shell.
// ============================================================

const PI = window.StationIcon;

// the account the user is logged into Station with
const LOGIN_USERNAME = 'hezeqiah';

const initials = (s) =>
  (s || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const rankCls = (r) => (r || '').toLowerCase();

// social network definitions (order = display order)
const SOCIALS = [
  {
    key: 'discord',
    net: 'Discord',
    icon: 'message-circle',
    cls: 'soc-discord',
    prefix: '',
    placeholder: 'username#0000',
  },
  {
    key: 'rsi',
    net: 'RSI / Spectrum',
    icon: 'rocket',
    cls: 'soc-rsi',
    prefix: 'robertsspaceindustries.com/citizens/',
    placeholder: 'Citizen handle',
  },
  {
    key: 'twitch',
    net: 'Twitch',
    icon: 'twitch',
    cls: 'soc-twitch',
    prefix: 'twitch.tv/',
    placeholder: 'channel',
  },
  {
    key: 'youtube',
    net: 'YouTube',
    icon: 'youtube',
    cls: 'soc-youtube',
    prefix: 'youtube.com/@',
    placeholder: 'handle',
  },
  {
    key: 'twitter',
    net: 'X / Twitter',
    icon: 'at-sign',
    cls: 'soc-twitter',
    prefix: 'x.com/',
    placeholder: 'handle',
  },
];

// the profile record (would come from the API; seeded from the logged-in user)
const INITIAL = {
  username: LOGIN_USERNAME, // Station login — locked
  email: 'hez@atlasvanguard.org', // locked
  ign: LOGIN_USERNAME, // in-game name — defaults to username
  firstName: 'Hez',
  lastName: 'Okonkwo',
  pronouns: 'he/him',
  rank: 'Leadership',
  primaryOrg: 'atlas',
  region: 'US-East · UTC−5',
  language: 'English, Igbo',
  phone: '+1 555 0142',
  presence: 'online',
  joined: '2952-03-14',
  ops: 142,
  hoursLogged: '1,284',
  bio: "Quartermaster for Atlas Vanguard. Eight years flying the 'verse — started solo mining quant in a Prospector, now I run multi-ship dragline ops in the Halo and keep the org's books straight.\n\nIf you fly with me: comms discipline, share your scans, and we all eat well. Always happy to train new miners.",
  socials: {
    discord: 'hezeqiah',
    rsi: 'hezeqiah',
    twitch: 'hez_mines',
    youtube: '',
    twitter: 'hez_sc',
  },
  socialVerified: { discord: true, rsi: true },
};

// orgs the member belongs to
const MY_ORGS = [
  {
    id: 'atlas',
    sid: 'ATLAS',
    name: 'Atlas Vanguard',
    role: 'Quartermaster · Leadership',
    members: 312,
    since: '2952',
    grad: 'linear-gradient(140deg, var(--aqua-400), var(--aqua-600))',
  },
  {
    id: 'crimson',
    sid: 'CRIM',
    name: 'Crimson Fleet',
    role: 'Member',
    members: 88,
    since: '2953',
    grad: 'linear-gradient(140deg, var(--coral-300), var(--coral-500))',
  },
  {
    id: 'halo',
    sid: 'HALO',
    name: 'Halo Miners Union',
    role: 'Affiliate',
    members: 540,
    since: '2953',
    grad: 'linear-gradient(140deg, var(--teal-300), var(--teal-500))',
  },
];

function ProfilePage() {
  const toast = window.__toast || (() => {});
  const [cur, setCur] = React.useState(INITIAL);
  const [draft, setDraft] = React.useState(INITIAL);
  const [editing, setEditing] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);

  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setSoc = (k, v) =>
    setDraft((d) => ({ ...d, socials: { ...d.socials, [k]: v } }));
  const startEdit = () => {
    setDraft(cur);
    setEditing(true);
  };
  const cancel = () => {
    setDraft(cur);
    setEditing(false);
  };
  const save = () => {
    // in-game name falls back to the login username if cleared
    const fixed = { ...draft, ign: (draft.ign || '').trim() || cur.username };
    setCur(fixed);
    setDraft(fixed);
    setEditing(false);
    toast('Profile saved', 'check');
  };

  // keyboard: e to edit, Esc to cancel
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Escape' && editing) {
          e.target.blur();
        }
        return;
      }
      if (e.key === 'e' && !editing && !pwOpen) {
        e.preventDefault();
        startEdit();
      }
      if (e.key === 'Escape' && editing && !pwOpen) {
        cancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, pwOpen, cur]);

  const primaryOrg =
    MY_ORGS.find(
      (o) => o.id === (editing ? draft.primaryOrg : cur.primaryOrg),
    ) || MY_ORGS[0];
  const fullName = [cur.firstName, cur.lastName].filter(Boolean).join(' ');

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <PI n="user-round" /> Account <PI n="chevron-right" /> My Profile
          </div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">
            Your identity across Station — in-game name, bio, social
            connections, and the organizations you belong to. This is how the
            rest of the org sees you.
          </p>
        </div>
        <div className="page-actions">
          {editing ? (
            <div className="pf-savebar">
              <span className="hint">
                <PI n="circle-dot" /> Unsaved changes
              </span>
              <button className="btn btn-ghost btn-sm" onClick={cancel}>
                Cancel{' '}
                <span className="kbd" style={{ marginLeft: 4 }}>
                  <kbd>Esc</kbd>
                </span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={save}>
                <PI n="check" /> Save changes
              </button>
            </div>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm">
                <PI n="share-2" /> Share profile
              </button>
              <button
                className="btn btn-primary btn-sm"
                id="pf-edit"
                onClick={startEdit}
              >
                <PI n="pencil" /> Edit profile{' '}
                <span className="kbd" style={{ marginLeft: 6 }}>
                  <kbd>e</kbd>
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* hero */}
      <div className="pf-hero">
        <div className="pf-cover"></div>
        <div className="pf-body">
          <div
            className="pf-av"
            style={{ background: window.avColor(cur.username) }}
          >
            {initials(cur.ign)}
            <span className={'pres ' + cur.presence}></span>
          </div>
          <div className="pf-id">
            <div className="pf-name">
              {cur.ign}{' '}
              <span className={'rank ' + rankCls(cur.rank)}>{cur.rank}</span>
            </div>
            <div className="pf-handle">
              <span>@{cur.username}</span>
              {cur.pronouns && (
                <>
                  <span className="dot">·</span>
                  <span className="muted">{cur.pronouns}</span>
                </>
              )}
              {fullName && (
                <>
                  <span className="dot">·</span>
                  <span className="muted">{fullName}</span>
                </>
              )}
            </div>
            <div className="pf-meta">
              <span className="mi">
                <PI n="shield" />
                {primaryOrg.name}
              </span>
              <span className="mi">
                <PI n="map-pin" />
                {cur.region}
              </span>
              <span className="mi">
                <PI n="languages" />
                {cur.language}
              </span>
              <span className="mi">
                <PI n="calendar" />
                Joined {cur.joined.slice(0, 4)}
              </span>
            </div>
          </div>
        </div>
        <div className="pf-stats">
          <div className="pf-stat">
            <div className="v">{cur.ops}</div>
            <div className="k">Ops attended</div>
          </div>
          <div className="pf-stat">
            <div className="v">{cur.hoursLogged}</div>
            <div className="k">Hours logged</div>
          </div>
          <div className="pf-stat">
            <div className="v">{MY_ORGS.length}</div>
            <div className="k">Organizations</div>
          </div>
          <div className="pf-stat">
            <div className="v">
              {new Date().getFullYear() + 930 - Number(cur.joined.slice(0, 4))}y
            </div>
            <div className="k">Years in service</div>
          </div>
        </div>
      </div>

      {/* two columns */}
      <div className="pf-grid">
        {/* LEFT */}
        <div>
          {/* about / bio */}
          <div className="panel">
            <div className="panel-head">
              <span className="ic">
                <PI n="file-text" />
              </span>
              <span className="panel-title">About</span>
            </div>
            <div className="panel-body">
              {editing ? (
                <div className="fctl">
                  <div className="fl">
                    <PI n="file-text" /> Bio
                  </div>
                  <textarea
                    value={draft.bio}
                    maxLength={600}
                    onChange={(e) => set('bio', e.target.value)}
                    style={{ minHeight: 150 }}
                    placeholder="Tell the org about yourself, your playstyle, and what you fly…"
                  ></textarea>
                  <div className="charcount">{draft.bio.length}/600</div>
                </div>
              ) : (
                <div className={'pf-bio' + (cur.bio ? '' : ' empty')}>
                  {cur.bio || 'No bio yet. Click Edit profile to add one.'}
                </div>
              )}
            </div>
          </div>

          {/* identity & contact */}
          <div className="panel" style={{ marginTop: 'var(--space-5)' }}>
            <div className="panel-head">
              <span className="ic">
                <PI n="id-card" />
              </span>
              <span className="panel-title">Identity &amp; contact</span>
            </div>
            <div className="panel-body">
              {editing ? (
                <>
                  <div className="fctl">
                    <div className="fl">
                      <PI n="gamepad-2" /> In-game name (IGN)
                    </div>
                    <input
                      value={draft.ign}
                      onChange={(e) => set('ign', e.target.value)}
                      placeholder={cur.username}
                    />
                    <div
                      className="charcount"
                      style={{
                        textAlign: 'left',
                        marginTop: 5,
                        fontStyle: 'italic',
                      }}
                    >
                      Defaults to your Station username “{cur.username}” if left
                      blank.
                    </div>
                  </div>
                  <div className="fgrid">
                    <div className="fctl">
                      <div className="fl">
                        <PI n="user" /> First name
                      </div>
                      <input
                        value={draft.firstName}
                        onChange={(e) => set('firstName', e.target.value)}
                      />
                    </div>
                    <div className="fctl">
                      <div className="fl">
                        <PI n="user" /> Last name
                      </div>
                      <input
                        value={draft.lastName}
                        onChange={(e) => set('lastName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="fgrid">
                    <div className="fctl">
                      <div className="fl">
                        <PI n="venetian-mask" /> Pronouns
                      </div>
                      <input
                        value={draft.pronouns}
                        onChange={(e) => set('pronouns', e.target.value)}
                        placeholder="he/him"
                      />
                    </div>
                    <div className="fctl">
                      <div className="fl">
                        <PI n="phone" /> Phone
                      </div>
                      <input
                        value={draft.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        placeholder="+1 555 0000"
                      />
                    </div>
                  </div>
                  <div className="fgrid">
                    <div className="fctl">
                      <div className="fl">
                        <PI n="map-pin" /> Region / timezone
                      </div>
                      <input
                        value={draft.region}
                        onChange={(e) => set('region', e.target.value)}
                      />
                    </div>
                    <div className="fctl">
                      <div className="fl">
                        <PI n="languages" /> Languages
                      </div>
                      <input
                        value={draft.language}
                        onChange={(e) => set('language', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="kv">
                    <span className="k">
                      <PI n="gamepad-2" /> In-game name
                    </span>
                    <span className="v">{cur.ign}</span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      <PI n="user" /> Real name
                    </span>
                    <span className="v">{fullName || '—'}</span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      <PI n="venetian-mask" /> Pronouns
                    </span>
                    <span className="v">{cur.pronouns || '—'}</span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      <PI n="map-pin" /> Region
                    </span>
                    <span className="v">{cur.region}</span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      <PI n="languages" /> Languages
                    </span>
                    <span className="v">{cur.language}</span>
                  </div>
                  <div className="kv">
                    <span className="k">
                      <PI n="phone" /> Phone
                    </span>
                    <span
                      className="v t-mono"
                      style={{ fontWeight: 400, color: 'var(--text-muted)' }}
                    >
                      {cur.phone}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* social connections */}
          <div className="panel" style={{ marginTop: 'var(--space-5)' }}>
            <div className="panel-head">
              <span className="ic">
                <PI n="link" />
              </span>
              <span className="panel-title">Social connections</span>
            </div>
            <div className="panel-body">
              {editing ? (
                SOCIALS.map((s) => (
                  <div className="soc-edit" key={s.key}>
                    <span className={'soc-ic ' + s.cls}>
                      <PI n={s.icon} />
                    </span>
                    <input
                      value={draft.socials[s.key] || ''}
                      onChange={(e) => setSoc(s.key, e.target.value)}
                      placeholder={s.net + ' — ' + s.placeholder}
                      aria-label={s.net}
                    />
                  </div>
                ))
              ) : (
                <div className="soc-list">
                  {SOCIALS.map((s) => {
                    const val = cur.socials[s.key];
                    const verified =
                      cur.socialVerified && cur.socialVerified[s.key];
                    return (
                      <div className="soc-row" key={s.key}>
                        <span className={'soc-ic ' + s.cls}>
                          <PI n={s.icon} />
                        </span>
                        <div className="soc-info">
                          <div className="soc-net">
                            {s.net}{' '}
                            {verified && (
                              <span className="soc-verified">
                                <PI n="badge-check" /> verified
                              </span>
                            )}
                          </div>
                          <div className={'soc-val' + (val ? '' : ' empty')}>
                            {val
                              ? s.prefix
                                ? s.prefix + val
                                : val
                              : 'Not connected'}
                          </div>
                        </div>
                        {val && (
                          <button
                            className="soc-go"
                            aria-label={'Open ' + s.net}
                          >
                            <PI n="external-link" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* organizations */}
          <div className="panel">
            <div className="panel-head">
              <span className="ic">
                <PI n="users" />
              </span>
              <span className="panel-title">Organizations</span>
              <span
                className="t-mono t-muted"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                {MY_ORGS.length}
              </span>
            </div>
            <div className="panel-body">
              {MY_ORGS.map((o) => {
                const isPrimary =
                  o.id === (editing ? draft.primaryOrg : cur.primaryOrg);
                return (
                  <div
                    className={'org-card' + (isPrimary ? ' primary' : '')}
                    key={o.id}
                  >
                    <span className="org-logo" style={{ background: o.grad }}>
                      {o.sid.slice(0, 2)}
                    </span>
                    <div className="org-info">
                      <div className="org-nm">
                        {o.name}{' '}
                        {isPrimary && (
                          <span className="org-primary-badge">Primary</span>
                        )}
                      </div>
                      <div className="org-meta">
                        <span>{o.role}</span>
                        <span className="sep">·</span>
                        <span>{o.members} members</span>
                        <span className="sep">·</span>
                        <span>since {o.since}</span>
                      </div>
                    </div>
                    {editing && !isPrimary && (
                      <button
                        className="org-leave"
                        title="Set as primary"
                        aria-label={'Set ' + o.name + ' as primary'}
                        onClick={() => set('primaryOrg', o.id)}
                      >
                        <PI n="star" />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', marginTop: 'var(--space-3)' }}
              >
                <PI n="plus" /> Find organizations
              </button>
            </div>
          </div>

          {/* account & security */}
          <div className="panel" style={{ marginTop: 'var(--space-5)' }}>
            <div className="panel-head">
              <span className="ic">
                <PI n="shield-check" />
              </span>
              <span className="panel-title">Account &amp; security</span>
            </div>
            <div className="panel-body">
              <div className="fctl">
                <div className="fl">
                  <PI n="at-sign" /> Station username
                </div>
                <div className="locked-field">
                  <span className="lv">{cur.username}</span>
                  <span className="lock">
                    <PI n="lock" /> Permanent
                  </span>
                </div>
              </div>
              <div className="fctl">
                <div className="fl">
                  <PI n="mail" /> Email
                </div>
                <div className="locked-field">
                  <span className="lv">{cur.email}</span>
                  <span className="lock">
                    <PI n="lock" /> Verified
                  </span>
                </div>
              </div>
              {!pwOpen ? (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => setPwOpen(true)}
                >
                  <PI n="key-round" /> Change password
                </button>
              ) : (
                <PasswordForm
                  onClose={() => setPwOpen(false)}
                  onSave={() => {
                    setPwOpen(false);
                    toast('Password changed', 'shield-check');
                  }}
                />
              )}
              <div className="sec-note">
                <PI n="info" /> Your username and email are tied to your Station
                account and can't be changed here. Contact an org admin for
                account recovery.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- inline change-password ----
function PasswordForm({ onClose, onSave }) {
  const [cu, setCu] = React.useState('');
  const [nu, setNu] = React.useState('');
  const [cf, setCf] = React.useState('');
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const tooShort = nu && nu.length < 6;
  const mismatch = cf && nu !== cf;
  const ready = cu && nu.length >= 6 && nu === cf;
  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        background: 'var(--surface-sunken)',
      }}
    >
      <div className="fctl">
        <div className="fl">
          <PI n="lock" /> Current password
        </div>
        <input
          type="password"
          value={cu}
          onChange={(e) => setCu(e.target.value)}
          autoFocus
        />
      </div>
      <div className="fctl">
        <div className="fl">
          <PI n="key-round" /> New password
        </div>
        <input
          type="password"
          value={nu}
          onChange={(e) => setNu(e.target.value)}
        />
        {tooShort && (
          <div
            className="charcount"
            style={{ textAlign: 'left', color: 'var(--coral-400)' }}
          >
            At least 6 characters
          </div>
        )}
      </div>
      <div className="fctl">
        <div className="fl">
          <PI n="key-round" /> Confirm new password
        </div>
        <input
          type="password"
          value={cf}
          onChange={(e) => setCf(e.target.value)}
        />
        {mismatch && (
          <div
            className="charcount"
            style={{ textAlign: 'left', color: 'var(--coral-400)' }}
          >
            Passwords don't match
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1 }}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          disabled={!ready}
          onClick={onSave}
        >
          <PI n="check" /> Update password
        </button>
      </div>
    </div>
  );
}

function ProfileApp() {
  const commands = [
    {
      id: 'pf-edit',
      group: 'Profile',
      icon: 'pencil',
      label: 'Edit profile',
      hint: 'e',
      run: () => {
        const b = document.getElementById('pf-edit');
        if (b) b.click();
      },
    },
    {
      id: 'pf-pw',
      group: 'Profile',
      icon: 'key-round',
      label: 'Change password',
      run: () =>
        window.__toast &&
        window.__toast(
          'Open Account & security to change password',
          'key-round',
        ),
    },
    {
      id: 'pf-share',
      group: 'Profile',
      icon: 'share-2',
      label: 'Share profile link',
      run: () =>
        window.__toast && window.__toast('Profile link copied', 'link'),
    },
  ];
  const helpExtra = [
    ['Edit profile', ['e']],
    ['Cancel edit', ['Esc']],
    ['Command palette', ['⌘', 'K']],
    ['Toggle theme', ['t']],
  ];
  return (
    <AppShell
      active="profile"
      commands={commands}
      helpExtra={helpExtra}
      onNew={() => {
        const b = document.getElementById('pf-edit');
        if (b) b.click();
      }}
      searchPlaceholder="Search Station…"
    >
      <ProfilePage />
    </AppShell>
  );
}

window.ProfileApp = ProfileApp;
