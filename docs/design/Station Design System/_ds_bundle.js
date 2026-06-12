/* @ds-bundle: {"format":3,"namespace":"PresstronicDesignSystem_3f9626","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"}],"sourceHashes":{"app/Contracts.jsx":"bc24663f237f","app/Fleet.jsx":"0ed133c61505","app/Inventory.jsx":"b20fe1387538","app/Members.jsx":"daf666b4ec8c","app/Profile.jsx":"f735a1854dd2","app/Treasury.jsx":"7eb901b5d5df","app/WorkOrders.jsx":"8b5dc2c831ea","app/app-shell.jsx":"338b41267a51","app/inventory-data.jsx":"5d0632104ee7","app/inventory-rows.jsx":"28d6fd25fda8","components/core/Badge.jsx":"124145452c28","components/core/Button.jsx":"826a3bbfc99d","dashboard/DashboardApp.jsx":"ca089cacba29","dashboard/DashboardGrid.jsx":"1efe3e9e153e","dashboard/portlets.jsx":"6f4c114e579a","dashboard/tweaks-panel.jsx":"6591467622ed","landing/LandingApp.jsx":"1f026ec68d0b","landing/tweaks-panel.jsx":"6591467622ed","ui_kits/station/CTA.jsx":"5195d96fbd35","ui_kits/station/FAQ.jsx":"f428f56a7f18","ui_kits/station/Features.jsx":"c22be823d213","ui_kits/station/Hero.jsx":"1dfbd339d8f1","ui_kits/station/Nav.jsx":"e155ceb6dd83","ui_kits/station/Pricing.jsx":"255d9d9fa209","ui_kits/station/StationApp.jsx":"c526f294b5a9","ui_kits/station/tweaks-panel.jsx":"6591467622ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {
  const __ds_ns = (window.PresstronicDesignSystem_3f9626 =
    window.PresstronicDesignSystem_3f9626 || {});

  const __ds_scope = {};

  __ds_ns.__errors = __ds_ns.__errors || [];

  // app/Contracts.jsx
  try {
    (() => {
      // ============================================================
      // Station — Contracts page
      // Service contracts: hauling/transport, security, mining, salvage.
      // Board list + type-specific detail (route, quota, milestones,
      // reward, assigned crew). Keyboard-first: roving list, Enter opens.
      // ============================================================

      const CI = window.StationIcon;
      const CTYPE = {
        hauling: {
          icon: 'container',
          label: 'Hauling / Transport',
          cls: 'ct-hauling',
        },
        security: {
          icon: 'crosshair',
          label: 'Security',
          cls: 'ct-security',
        },
        mining: {
          icon: 'gem',
          label: 'Mining',
          cls: 'ct-mining',
        },
        salvage: {
          icon: 'recycle',
          label: 'Salvage',
          cls: 'ct-salvage',
        },
      };
      const CSTATUS = {
        open: {
          tone: 'brand',
          icon: 'circle-dot',
          label: 'Open',
        },
        claimed: {
          tone: 'info',
          icon: 'user-check',
          label: 'Claimed',
        },
        active: {
          tone: 'warn',
          icon: 'loader',
          label: 'In progress',
        },
        completed: {
          tone: 'success',
          icon: 'badge-check',
          label: 'Completed',
        },
        disputed: {
          tone: 'danger',
          icon: 'triangle-alert',
          label: 'Disputed',
        },
      };
      const RISK = {
        low: 'Low',
        med: 'Medium',
        high: 'High',
      };
      const riskIcon = {
        low: 'shield-check',
        med: 'shield-alert',
        high: 'shield-x',
      };
      const CONTRACTS = [
        {
          id: 'CT-512',
          type: 'hauling',
          title: 'Titanium haul — Hurston to ArcCorp',
          client: 'Hurston Dynamics',
          clientType: 'NPC contract',
          reward: 285000,
          status: 'active',
          risk: 'med',
          deadline: '6h',
          assigned: ['Iris Tanaka'],
          commodity: 'Titanium',
          scu: 768,
          origin: 'HDMS-Edmond',
          originSub: 'Hurston',
          dest: 'Area18',
          destSub: 'ArcCorp',
          desc: 'Bulk Titanium delivery on the Hurston→ArcCorp lane. Watch the Stanton pirate corridor near the jump.',
          miles: [
            ['Cargo loaded at HDMS-Edmond', 'done'],
            ['In transit — Stanton lane', 'active'],
            ['Delivery to Area18 TDD', ''],
          ],
        },
        {
          id: 'CT-509',
          type: 'security',
          title: 'Escort mining op — Aaron Halo',
          client: 'Atlas Vanguard',
          clientType: 'Internal op',
          reward: 180000,
          status: 'active',
          risk: 'high',
          deadline: '2h',
          assigned: ['Dax Moreno', 'Talia Vance'],
          objective: 'Escort & Defend',
          threat: 'Pirate interdiction',
          location: 'Aaron Halo · Cluster 7',
          duration: '4h window',
          desc: 'Provide armed escort for the Day-3 mining session. Two fighters on overwatch, intercept hostiles before they reach the Mole.',
          miles: [
            ['Wing assembled at ARC-L1', 'done'],
            ['Overwatch established', 'active'],
            ['Session complete — RTB', ''],
          ],
        },
        {
          id: 'CT-507',
          type: 'mining',
          title: 'Quantanium quota — refinery contract',
          client: 'Refinery Consortium',
          clientType: 'Org contract',
          reward: 520000,
          status: 'open',
          risk: 'med',
          deadline: '3d',
          assigned: [],
          commodity: 'Quantanium',
          quota: 150,
          location: 'Aaron Halo',
          refinery: 'ARC-L1',
          desc: 'Deliver 150 SCU of refined Quantanium. Volatile cargo — refine promptly and mind the inertia on the haul back.',
          miles: [
            ['Accept contract', ''],
            ['Mine & refine 150 SCU', ''],
            ['Deliver to consortium', ''],
          ],
        },
        {
          id: 'CT-503',
          type: 'salvage',
          title: 'Wreck reclamation — Yela Belt',
          client: 'Drake Interplanetary',
          clientType: 'NPC contract',
          reward: 240000,
          status: 'claimed',
          risk: 'low',
          deadline: '2d',
          assigned: ['Kova Rhys'],
          site: 'Yela Belt · Wreck Field 22',
          target: 'RMC + CMAT',
          targetScu: 180,
          location: 'Crusader · Yela',
          desc: 'Strip and reclaim the marked hulls. RMC to CRU-L1, construction materials retained for the org.',
          miles: [
            ['Claim contract', 'done'],
            ['Reclaim 180 SCU', 'active'],
            ['Sell RMC at CRU-L1', ''],
          ],
        },
        {
          id: 'CT-498',
          type: 'hauling',
          title: 'Medical supply run — microTech',
          client: 'microTech',
          clientType: 'NPC contract',
          reward: 96000,
          status: 'open',
          risk: 'low',
          deadline: '1d',
          assigned: [],
          commodity: 'Medical Supplies',
          scu: 120,
          origin: 'New Babbage',
          originSub: 'microTech',
          dest: 'Port Tressler',
          destSub: 'microTech orbit',
          desc: 'Quick low-risk medical resupply to Port Tressler. Good first contract for a recruit pilot.',
          miles: [
            ['Load at New Babbage', ''],
            ['Deliver to Port Tressler', ''],
          ],
        },
        {
          id: 'CT-495',
          type: 'security',
          title: 'Bounty — Nine Tails cell',
          client: 'Crusader Security',
          clientType: 'NPC contract',
          reward: 145000,
          status: 'open',
          risk: 'high',
          deadline: '5d',
          assigned: [],
          objective: 'Bounty hunt',
          threat: 'Armed hostiles',
          location: 'Crusader · Cellin',
          duration: 'Until cleared',
          desc: 'Eliminate the flagged Nine Tails cell operating near Cellin. Multicrew gunship recommended.',
          miles: [
            ['Accept bounty', ''],
            ['Locate & engage', ''],
            ['Confirm kills', ''],
          ],
        },
        {
          id: 'CT-489',
          type: 'mining',
          title: 'Laranite delivery — completed',
          client: 'ArcCorp Mining',
          clientType: 'NPC contract',
          reward: 134000,
          status: 'completed',
          risk: 'low',
          deadline: '—',
          assigned: ['Vesper Calderon'],
          commodity: 'Laranite',
          quota: 60,
          location: 'Lyria',
          refinery: 'ARC-L1',
          desc: 'Closed out last cycle. Paid in full and settled to the crew.',
          miles: [
            ['Accepted', 'done'],
            ['Refined 60 SCU', 'done'],
            ['Delivered & paid', 'done'],
          ],
        },
        {
          id: 'CT-486',
          type: 'hauling',
          title: 'Agricium freight — disputed',
          client: 'Shubin Interstellar',
          clientType: 'NPC contract',
          reward: 210000,
          status: 'disputed',
          risk: 'med',
          deadline: '—',
          assigned: ['Orin Pell'],
          commodity: 'Agricium',
          scu: 320,
          origin: 'ArcCorp',
          originSub: 'Stanton',
          dest: 'Lorville',
          destSub: 'Hurston',
          desc: 'Delivery shortfall reported — 40 SCU unaccounted after a soft-death event. Under review with the client.',
          miles: [
            ['Loaded', 'done'],
            ['Transit interrupted', 'done'],
            ['Delivery disputed', 'active'],
          ],
        },
      ];
      const fmt = (n) => Math.round(n).toLocaleString('en-US');
      const abbr = (n) =>
        n >= 1e6
          ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
          : n >= 1e3
            ? Math.round(n / 1e3) + 'K'
            : String(n);
      const initials = (s) =>
        s
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

      // ---- list row ----
      function ContractRow({ c, selected, tabIndex, regRef, onSelect }) {
        const ty = CTYPE[c.type],
          st = CSTATUS[c.status];
        const urgent =
          (c.deadline === '2h' || c.deadline === '6h') && c.status === 'active';
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': selected,
            onClick: onSelect,
            onFocus: onSelect,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic ' + ty.cls,
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: ty.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  c.title,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sub',
                  },
                  c.id,
                  ' \xB7 ',
                  ty.label,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'client',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ci',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n:
                    c.clientType.includes('Internal') ||
                    c.clientType.includes('Org')
                      ? 'shield'
                      : 'building-2',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                null,
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'cn',
                  },
                  c.client,
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'ct',
                  },
                  c.clientType,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'deadline' + (urgent ? ' urgent' : ''),
              },
              c.deadline !== '—' &&
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'clock',
                }),
              c.deadline === '—' ? '—' : c.deadline,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              StatusPill,
              {
                tone: st.tone,
                icon: st.icon,
              },
              st.label,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'num',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'reward',
              },
              abbr(c.reward),
              ' ',
              /*#__PURE__*/ React.createElement('small', null, 'aUEC'),
            ),
          ),
        );
      }

      // ---- type-specific spec ----
      function ContractSpec({ c }) {
        if (c.type === 'hauling') {
          return /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'route',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'node',
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'dot',
              }),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'lb',
                },
                c.origin,
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'sub',
                },
                c.originSub,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'line',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'cargo',
                },
                c.scu,
                ' SCU \xB7 ',
                c.commodity,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'node end',
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'dot',
              }),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'lb',
                },
                c.dest,
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'sub',
                },
                c.destSub,
              ),
            ),
          );
        }
        if (c.type === 'security') {
          return /*#__PURE__*/ React.createElement(
            React.Fragment,
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'target',
                }),
                ' Objective',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.objective,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'swords',
                }),
                ' Threat',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.threat,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'map-pin',
                }),
                ' Location',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.location,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'timer',
                }),
                ' Duration',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.duration,
              ),
            ),
          );
        }
        if (c.type === 'mining') {
          return /*#__PURE__*/ React.createElement(
            React.Fragment,
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'gem',
                }),
                ' Commodity',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                c.commodity,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'scale',
                }),
                ' Quota',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v mono',
                },
                c.quota,
                ' SCU',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'map-pin',
                }),
                ' Field',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.location,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'factory',
                }),
                ' Refinery',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.refinery,
              ),
            ),
          );
        }
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'kv',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'k',
              },
              /*#__PURE__*/ React.createElement(CI, {
                n: 'ship',
              }),
              ' Site',
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'v',
              },
              c.site,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'kv',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'k',
              },
              /*#__PURE__*/ React.createElement(CI, {
                n: 'recycle',
              }),
              ' Target',
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'v',
              },
              c.target,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'kv',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'k',
              },
              /*#__PURE__*/ React.createElement(CI, {
                n: 'scale',
              }),
              ' Volume',
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'v mono',
              },
              c.targetScu,
              ' SCU',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'kv',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'k',
              },
              /*#__PURE__*/ React.createElement(CI, {
                n: 'map-pin',
              }),
              ' Location',
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'v',
              },
              c.location,
            ),
          ),
        );
      }

      // ---- detail ----
      function ContractDetail({ c }) {
        const ty = CTYPE[c.type],
          st = CSTATUS[c.status];
        const tint = {
          hauling: 'var(--warning-500)',
          security: 'var(--coral-300)',
          mining: 'var(--aqua-300)',
          salvage: '#D9A6E6',
        }[c.type];
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'panel detail',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'con-hero',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'big-ic ' + ty.cls,
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: ty.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'h',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 't',
                  },
                  c.title,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 's',
                  },
                  /*#__PURE__*/ React.createElement('span', null, c.id),
                  /*#__PURE__*/ React.createElement('span', null, '\xB7'),
                  /*#__PURE__*/ React.createElement('span', null, ty.label),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                StatusPill,
                {
                  tone: st.tone,
                  icon: st.icon,
                },
                st.label,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'reward-hero',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'rk',
                  },
                  'Contract reward',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'rv',
                  },
                  fmt(c.reward),
                  /*#__PURE__*/ React.createElement('small', null, 'aUEC'),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'risk',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'rk',
                  },
                  'Risk',
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'risk-badge ' + c.risk,
                  },
                  /*#__PURE__*/ React.createElement(CI, {
                    n: riskIcon[c.risk],
                  }),
                  RISK[c.risk],
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                null,
                c.type === 'hauling' ? 'Route' : 'Brief',
              ),
            ),
            /*#__PURE__*/ React.createElement(ContractSpec, {
              c: c,
            }),
            /*#__PURE__*/ React.createElement(
              'p',
              {
                className: 't-muted',
                style: {
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--leading-relaxed)',
                  marginTop: 'var(--space-3)',
                  marginBottom: 0,
                },
              },
              c.desc,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement('span', null, 'Client & terms'),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'building-2',
                }),
                ' Client',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.client,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'file-text',
                }),
                ' Type',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.clientType,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'clock',
                }),
                ' Deadline',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.deadline === '—' ? 'Closed' : 'in ' + c.deadline,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'users',
                }),
                ' Assigned',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                c.assigned.length
                  ? /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'assigned',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'stack',
                        },
                        c.assigned.map((a) =>
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'av',
                              key: a,
                              style: {
                                background: window.avColor(a),
                              },
                              title: a,
                            },
                            initials(a),
                          ),
                        ),
                      ),
                    )
                  : /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 't-faint',
                        style: {
                          color: 'var(--text-faint)',
                          fontWeight: 400,
                        },
                      },
                      'Unassigned',
                    ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement('span', null, 'Progress'),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'miles',
              },
              c.miles.map(([label, state], i) =>
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'mile ' + state,
                    key: i,
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'mk',
                    },
                    /*#__PURE__*/ React.createElement(CI, {
                      n:
                        state === 'done'
                          ? 'check'
                          : state === 'active'
                            ? 'loader'
                            : 'circle',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ml',
                    },
                    label,
                  ),
                  state === 'active' &&
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'mt',
                      },
                      'now',
                    ),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
              style: {
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 'var(--space-3)',
              },
            },
            c.status === 'open' &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  style: {
                    flex: 1,
                  },
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'hand',
                }),
                ' Claim contract',
              ),
            c.status === 'open' &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  style: {
                    flex: 1,
                  },
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'user-plus',
                }),
                ' Assign crew',
              ),
            c.status === 'claimed' &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  style: {
                    flex: 1,
                  },
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'play',
                }),
                ' Start contract',
              ),
            c.status === 'active' &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  style: {
                    flex: 1,
                  },
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'check-check',
                }),
                ' Mark complete',
              ),
            c.status === 'completed' &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  style: {
                    flex: 1,
                  },
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'copy',
                }),
                ' Repost contract',
              ),
            c.status === 'disputed' &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  style: {
                    flex: 1,
                  },
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'gavel',
                }),
                ' Resolve dispute',
              ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-ghost btn-sm',
                'aria-label': 'Contract settings',
              },
              /*#__PURE__*/ React.createElement(CI, {
                n: 'more-horizontal',
              }),
            ),
          ),
        );
      }

      // ---- page ----
      function ContractsPage() {
        const [type, setType] = React.useState('all');
        const visible = React.useMemo(
          () =>
            type === 'all'
              ? CONTRACTS
              : CONTRACTS.filter((c) => c.type === type),
          [type],
        );
        const [selId, setSelId] = React.useState(CONTRACTS[0].id);
        const sel = CONTRACTS.find((c) => c.id === selId) || visible[0];
        const roving = window.useRoving(visible.length, {
          onActivate: (i) => {
            if (visible[i]) setSelId(visible[i].id);
          },
        });
        React.useEffect(() => {
          if (visible.length && !visible.find((c) => c.id === selId)) {
            setSelId(visible[0].id);
            roving.setIdx(0);
          }
        }, [type]);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const open = CONTRACTS.filter((c) => c.status === 'open').length;
        const active = CONTRACTS.filter(
          (c) => c.status === 'active' || c.status === 'claimed',
        ).length;
        const pool = CONTRACTS.filter(
          (c) =>
            c.status === 'open' ||
            c.status === 'active' ||
            c.status === 'claimed',
        ).reduce((s, c) => s + c.reward, 0);
        const done = CONTRACTS.filter((c) => c.status === 'completed').length;
        const filters = [
          {
            value: 'all',
            label: 'All',
            count: CONTRACTS.length,
          },
          {
            value: 'hauling',
            label: 'Hauling',
            icon: 'container',
          },
          {
            value: 'security',
            label: 'Security',
            icon: 'crosshair',
          },
          {
            value: 'mining',
            label: 'Mining',
            icon: 'gem',
          },
          {
            value: 'salvage',
            label: 'Salvage',
            icon: 'recycle',
          },
        ];
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'scroll-text',
                }),
                ' Operations ',
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'chevron-right',
                }),
                ' Contracts',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'Contracts',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                'Service contracts across every discipline \u2014 hauling, security, mining, and salvage. Post, claim, crew up, and settle the reward.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'layout-grid',
                }),
                ' Board view',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  id: 'con-new',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'plus',
                }),
                ' New contract ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                    style: {
                      marginLeft: 6,
                    },
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
              {
                k: 'Open contracts',
                icon: 'circle-dot',
                v: open,
                d: 'available to claim',
              },
              {
                k: 'In progress',
                icon: 'loader',
                v: active,
                d: 'claimed or active',
                tone: 'warn',
              },
              {
                k: 'Reward pool',
                icon: 'coins',
                v: abbr(pool),
                unit: 'aUEC',
                d: 'active contract value',
                tone: 'up',
              },
              {
                k: 'Completed',
                icon: 'badge-check',
                v: done,
                d: 'this cycle',
              },
            ],
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'con-toolbar',
            },
            /*#__PURE__*/ React.createElement(Segmented, {
              options: filters,
              value: type,
              onChange: setType,
              ariaLabel: 'Filter contracts by type',
            }),
            /*#__PURE__*/ React.createElement('span', {
              className: 'grow',
            }),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'chips',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'circle-dot',
                }),
                ' Status: All',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(CI, {
                  n: 'arrow-down-up',
                }),
                ' Sort: Reward',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'split',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'dtable-wrap',
              },
              /*#__PURE__*/ React.createElement(
                'table',
                {
                  className: 'dtable',
                  role: 'grid',
                  'aria-label': 'Contracts',
                  onKeyDown: roving.onKeyDown,
                },
                /*#__PURE__*/ React.createElement(
                  'thead',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'tr',
                    null,
                    /*#__PURE__*/ React.createElement('th', null, 'Contract'),
                    /*#__PURE__*/ React.createElement('th', null, 'Client'),
                    /*#__PURE__*/ React.createElement('th', null, 'Deadline'),
                    /*#__PURE__*/ React.createElement('th', null, 'Status'),
                    /*#__PURE__*/ React.createElement(
                      'th',
                      {
                        className: 'num',
                      },
                      'Reward',
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'tbody',
                  null,
                  visible.map((c, i) =>
                    /*#__PURE__*/ React.createElement(ContractRow, {
                      key: c.id,
                      c: c,
                      selected: c.id === selId,
                      tabIndex: roving.getTab(i),
                      regRef: roving.register(i),
                      onSelect: () => {
                        setSelId(c.id);
                        roving.setIdx(i);
                      },
                    }),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'list-hint',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
                ),
                ' move ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
                ),
                ' open ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                ),
                ' new ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    style: {
                      marginLeft: 'auto',
                    },
                  },
                  visible.length,
                  ' of ',
                  CONTRACTS.length,
                  ' contracts',
                ),
              ),
            ),
            sel &&
              /*#__PURE__*/ React.createElement(ContractDetail, {
                c: sel,
              }),
          ),
        );
      }
      function ContractsApp() {
        const commands = [
          {
            id: 'con-new',
            group: 'Contracts',
            icon: 'plus',
            label: 'New contract',
            hint: 'n',
            run: () =>
              window.__toast && window.__toast('New contract drafted', 'plus'),
          },
          {
            id: 'con-haul',
            group: 'Contracts',
            icon: 'container',
            label: 'New hauling contract',
            run: () =>
              window.__toast && window.__toast('Hauling contract', 'container'),
          },
          {
            id: 'con-sec',
            group: 'Contracts',
            icon: 'crosshair',
            label: 'New security contract',
            run: () =>
              window.__toast &&
              window.__toast('Security contract', 'crosshair'),
          },
          {
            id: 'con-open',
            group: 'Contracts',
            icon: 'circle-dot',
            label: 'Show open contracts',
            run: () =>
              window.__toast &&
              window.__toast('Showing open contracts', 'circle-dot'),
          },
        ];
        const helpExtra = [
          ['New contract', ['n']],
          ['Filter type', ['←', '→']],
          ['Open contract', ['↵']],
          ['Toggle theme', ['t']],
        ];
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'contracts',
            commands: commands,
            helpExtra: helpExtra,
            onNew: () =>
              window.__toast && window.__toast('Draft a new contract', 'plus'),
            searchPlaceholder: 'Search contracts, clients, commodities\u2026',
          },
          /*#__PURE__*/ React.createElement(ContractsPage, null),
        );
      }
      window.ContractsApp = ContractsApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/Contracts.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/Fleet.jsx
  try {
    (() => {
      // ============================================================
      // Station — Fleet management page
      // Three views: Org Fleet (leadership manages owned ships),
      // My Ships (members manage personal ships + offer them to the org),
      // and Member-Offered (org-rentable capacity it doesn't own).
      // Keyboard-first: roving tables, Enter opens, tabs via ← →.
      // ============================================================

      const FI = window.StationIcon;
      const ROLE = {
        combat: {
          icon: 'crosshair',
          label: 'Combat',
          cls: 'role-combat',
        },
        mining: {
          icon: 'gem',
          label: 'Mining',
          cls: 'role-mining',
        },
        salvage: {
          icon: 'recycle',
          label: 'Salvage',
          cls: 'role-salvage',
        },
        hauling: {
          icon: 'container',
          label: 'Hauling',
          cls: 'role-hauling',
        },
        explore: {
          icon: 'compass',
          label: 'Exploration',
          cls: 'role-explore',
        },
        transport: {
          icon: 'users',
          label: 'Transport',
          cls: 'role-transport',
        },
        medical: {
          icon: 'cross',
          label: 'Medical',
          cls: 'role-medical',
        },
        support: {
          icon: 'wrench',
          label: 'Support',
          cls: 'role-support',
        },
      };
      const SHIP_STATUS = {
        ready: {
          tone: 'success',
          icon: 'circle-check',
          label: 'Ready',
        },
        deployed: {
          tone: 'info',
          icon: 'navigation',
          label: 'Deployed',
        },
        repair: {
          tone: 'warn',
          icon: 'wrench',
          label: 'In repair',
        },
        stored: {
          tone: 'neutral',
          icon: 'warehouse',
          label: 'Stored',
        },
      };

      // ---- org-owned fleet ----
      const ORG_FLEET = [
        {
          id: 'AV-01',
          ship: 'Polaris',
          mfr: 'RSI',
          role: 'combat',
          status: 'deployed',
          captain: 'hezeqiah',
          crew: 14,
          cargo: 576,
          loc: 'Aaron Halo · Patrol',
          flag: true,
          note: 'Org flagship — corvette',
        },
        {
          id: 'AV-02',
          ship: 'Hammerhead',
          mfr: 'Aegis',
          role: 'combat',
          status: 'ready',
          captain: 'Dax Moreno',
          crew: 9,
          cargo: 40,
          loc: 'Everus Harbor · Hangar 2',
        },
        {
          id: 'AV-03',
          ship: 'Reclaimer',
          mfr: 'Aegis',
          role: 'salvage',
          status: 'repair',
          captain: 'Kova Rhys',
          crew: 5,
          cargo: 420,
          loc: 'CRU-L1 · Repair bay',
          note: 'Hull integrity 62% — in repair',
        },
        {
          id: 'AV-04',
          ship: 'Hull C',
          mfr: 'MISC',
          role: 'hauling',
          status: 'deployed',
          captain: 'Iris Tanaka',
          crew: 4,
          cargo: 4608,
          loc: 'ARC → Hurston run',
        },
        {
          id: 'AV-05',
          ship: 'Carrack',
          mfr: 'Anvil',
          role: 'explore',
          status: 'stored',
          captain: '—',
          crew: 6,
          cargo: 456,
          loc: 'New Babbage · Storage',
        },
        {
          id: 'AV-06',
          ship: 'Argo MOLE',
          mfr: 'Argo',
          role: 'mining',
          status: 'ready',
          captain: 'Vesper Calderon',
          crew: 3,
          cargo: 96,
          loc: 'Lyria · Outpost',
        },
        {
          id: 'AV-07',
          ship: 'Valkyrie',
          mfr: 'Anvil',
          role: 'transport',
          status: 'ready',
          captain: '—',
          crew: 5,
          cargo: 30,
          loc: 'Everus Harbor · Hangar 5',
        },
        {
          id: 'AV-08',
          ship: 'A2 Hercules',
          mfr: 'Crusader',
          role: 'combat',
          status: 'stored',
          captain: '—',
          crew: 4,
          cargo: 216,
          loc: 'Area18 · Storage',
        },
      ];

      // ---- current member's personal ships (hezeqiah) ----
      const MY_SHIPS = [
        {
          id: 'MY-1',
          ship: 'F8C Lightning',
          mfr: 'Anvil',
          role: 'combat',
          crew: 1,
          cargo: 0,
          offered: true,
          rate: 0,
          who: 'Leadership',
        },
        {
          id: 'MY-2',
          ship: 'Vulture',
          mfr: 'Drake',
          role: 'salvage',
          crew: 1,
          cargo: 12,
          offered: true,
          rate: 25000,
          who: 'Any member',
        },
        {
          id: 'MY-3',
          ship: 'Prospector',
          mfr: 'MISC',
          role: 'mining',
          crew: 1,
          cargo: 32,
          offered: false,
          rate: 0,
          who: 'Leadership',
        },
        {
          id: 'MY-4',
          ship: 'Cutlass Black',
          mfr: 'Drake',
          role: 'transport',
          crew: 3,
          cargo: 46,
          offered: false,
          rate: 18000,
          who: 'Leadership',
        },
        {
          id: 'MY-5',
          ship: 'Constellation Andromeda',
          mfr: 'RSI',
          role: 'combat',
          crew: 4,
          cargo: 96,
          offered: false,
          rate: 0,
          who: 'Leadership',
        },
      ];

      // ---- ships members have offered to the org (org doesn't own) ----
      const OFFERED = [
        {
          id: 'OF-1',
          ship: 'Constellation Phoenix',
          mfr: 'RSI',
          role: 'transport',
          owner: 'Vesper Calderon',
          crew: 4,
          cargo: 96,
          rate: 45000,
          status: 'available',
          who: 'Leadership',
        },
        {
          id: 'OF-2',
          ship: 'Redeemer',
          mfr: 'Aegis',
          role: 'combat',
          owner: 'Dax Moreno',
          crew: 5,
          cargo: 6,
          rate: 60000,
          status: 'available',
          who: 'Leadership',
        },
        {
          id: 'OF-3',
          ship: 'Caterpillar',
          mfr: 'Drake',
          role: 'hauling',
          owner: 'Kova Rhys',
          crew: 4,
          cargo: 576,
          rate: 30000,
          status: 'onloan',
          who: 'Any member',
          borrowedBy: 'Org haul · Op Ironwake',
        },
        {
          id: 'OF-4',
          ship: 'Carrack',
          mfr: 'Anvil',
          role: 'explore',
          owner: 'Iris Tanaka',
          crew: 6,
          cargo: 456,
          rate: 0,
          status: 'available',
          who: 'Leadership',
        },
        {
          id: 'OF-5',
          ship: 'Vulture',
          mfr: 'Drake',
          role: 'salvage',
          owner: 'hezeqiah',
          crew: 1,
          cargo: 12,
          rate: 25000,
          status: 'available',
          who: 'Any member',
        },
      ];
      const fmt = (n) => Math.round(n).toLocaleString('en-US');
      const initials = (s) =>
        s
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

      // ============== ORG FLEET VIEW ==============
      function OrgFleetRow({ s, selected, tabIndex, regRef, onSelect }) {
        const r = ROLE[s.role],
          st = SHIP_STATUS[s.status];
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': selected,
            onClick: onSelect,
            onFocus: onSelect,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic ' + r.cls,
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: r.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  s.mfr,
                  ' ',
                  s.ship,
                  ' ',
                  s.flag &&
                    /*#__PURE__*/ React.createElement(FI, {
                      n: 'star',
                      style: {
                        width: 13,
                        height: 13,
                        color: 'var(--brand)',
                        verticalAlign: 'middle',
                      },
                    }),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sub',
                  },
                  s.id,
                  ' \xB7 ',
                  r.label,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            s.captain === '—'
              ? /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 't-muted',
                  },
                  'Unassigned',
                )
              : /*#__PURE__*/ React.createElement(window.AvatarChip, {
                  name: s.captain,
                }),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'fleet-meta',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                null,
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'users',
                }),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 't-mono',
                  },
                  s.crew,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                null,
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'container',
                }),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 't-mono',
                  },
                  fmt(s.cargo),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              StatusPill,
              {
                tone: st.tone,
                icon: st.icon,
              },
              st.label,
            ),
          ),
        );
      }
      function OrgFleetDetail({ s }) {
        const r = ROLE[s.role],
          st = SHIP_STATUS[s.status];
        const tint = {
          combat: 'var(--coral-300)',
          mining: 'var(--aqua-300)',
          salvage: '#D9A6E6',
          hauling: 'var(--warning-500)',
          explore: 'var(--teal-300)',
          transport: '#9AA6F5',
          medical: 'var(--success-500)',
          support: 'var(--text-muted)',
        }[s.role];
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'panel detail',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ship-hero',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic ' + r.cls,
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: r.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'h',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 't',
                  },
                  s.mfr,
                  ' ',
                  s.ship,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'mfr',
                  },
                  s.id,
                  ' \xB7 ',
                  r.label,
                  ' ',
                  s.flag && '· Flagship',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                StatusPill,
                {
                  tone: st.tone,
                  icon: st.icon,
                },
                st.label,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'spec-grid',
                style: {
                  marginTop: 'var(--space-4)',
                },
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'spec',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sk',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'users',
                  }),
                  ' Crew',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sv',
                  },
                  s.crew,
                  /*#__PURE__*/ React.createElement('small', null, 'seats'),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'spec',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sk',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'container',
                  }),
                  ' Cargo',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sv',
                  },
                  fmt(s.cargo),
                  /*#__PURE__*/ React.createElement('small', null, 'SCU'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement('span', null, 'Assignment'),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'user-round',
                }),
                ' Captain',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                s.captain,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'map-pin',
                }),
                ' Location',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                s.loc,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'shield',
                }),
                ' Role',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                r.label,
              ),
            ),
            s.note &&
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'kv',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'k',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'info',
                  }),
                  ' Note',
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'v',
                    style: {
                      fontWeight: 400,
                      color: 'var(--text-muted)',
                    },
                  },
                  s.note,
                ),
              ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
              style: {
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 'var(--space-3)',
              },
            },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-primary btn-sm',
                style: {
                  flex: 1,
                },
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: 'user-plus',
              }),
              ' Assign crew',
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-ghost btn-sm',
                style: {
                  flex: 1,
                },
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: 'navigation',
              }),
              ' Set status',
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-ghost btn-sm',
                'aria-label': 'Ship settings',
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: 'settings-2',
              }),
            ),
          ),
        );
      }
      function OrgFleetView() {
        const [selId, setSelId] = React.useState(ORG_FLEET[0].id);
        const sel = ORG_FLEET.find((s) => s.id === selId);
        const roving = window.useRoving(ORG_FLEET.length, {
          onActivate: (i) => setSelId(ORG_FLEET[i].id),
        });
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'split',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'dtable-wrap',
            },
            /*#__PURE__*/ React.createElement(
              'table',
              {
                className: 'dtable',
                role: 'grid',
                'aria-label': 'Org fleet',
                onKeyDown: roving.onKeyDown,
              },
              /*#__PURE__*/ React.createElement(
                'thead',
                null,
                /*#__PURE__*/ React.createElement(
                  'tr',
                  null,
                  /*#__PURE__*/ React.createElement('th', null, 'Ship'),
                  /*#__PURE__*/ React.createElement('th', null, 'Captain'),
                  /*#__PURE__*/ React.createElement('th', null, 'Capacity'),
                  /*#__PURE__*/ React.createElement('th', null, 'Status'),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'tbody',
                null,
                ORG_FLEET.map((s, i) =>
                  /*#__PURE__*/ React.createElement(OrgFleetRow, {
                    key: s.id,
                    s: s,
                    selected: s.id === selId,
                    tabIndex: roving.getTab(i),
                    regRef: roving.register(i),
                    onSelect: () => {
                      setSelId(s.id);
                      roving.setIdx(i);
                    },
                  }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'list-hint',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
              ),
              ' move ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
              ),
              ' open ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  style: {
                    marginLeft: 'auto',
                  },
                },
                ORG_FLEET.length,
                ' org ships',
              ),
            ),
          ),
          sel &&
            /*#__PURE__*/ React.createElement(OrgFleetDetail, {
              s: sel,
            }),
        );
      }

      // ============== MY SHIPS VIEW ==============
      function MyShipOffer({ s, onToggle, onToast }) {
        const r = ROLE[s.role];
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'offer' + (s.offered ? ' on' : ''),
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'offer-head',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'ic ' + r.cls,
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: r.icon,
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'h',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 't',
                },
                s.mfr,
                ' ',
                s.ship,
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 's',
                },
                /*#__PURE__*/ React.createElement('span', null, r.label),
                /*#__PURE__*/ React.createElement('span', null, '\xB7'),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    },
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'users',
                    style: {
                      width: 13,
                      height: 13,
                    },
                  }),
                  s.crew,
                  ' crew',
                ),
                /*#__PURE__*/ React.createElement('span', null, '\xB7'),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    },
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'container',
                    style: {
                      width: 13,
                      height: 13,
                    },
                  }),
                  fmt(s.cargo),
                  ' SCU',
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'offer-toggle',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'lbl',
                },
                /*#__PURE__*/ React.createElement(
                  'strong',
                  null,
                  s.offered ? 'Offered to org' : 'Private',
                ),
                s.offered
                  ? s.rate
                    ? fmt(s.rate) + ' aUEC/day'
                    : 'Free for org'
                  : 'Not shared',
              ),
              /*#__PURE__*/ React.createElement('button', {
                className: 'swtch',
                role: 'switch',
                'aria-checked': s.offered,
                'aria-label': 'Offer ' + s.ship + ' to org',
                onClick: () => {
                  onToggle(s.id);
                  onToast(
                    s.offered
                      ? s.ship + ' withdrawn from org'
                      : s.ship + ' offered to org',
                    s.offered ? 'lock' : 'check',
                  );
                },
              }),
            ),
          ),
          s.offered &&
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'terms',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'field',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'fl',
                  },
                  'Rate',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'control',
                    tabIndex: '0',
                    role: 'button',
                  },
                  s.rate
                    ? /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'mono',
                        },
                        fmt(s.rate),
                      )
                    : /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'rate-free',
                        },
                        'Free',
                      ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 't-muted',
                      style: {
                        fontSize: 'var(--text-xs)',
                      },
                    },
                    s.rate ? 'aUEC/day' : '',
                  ),
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'pencil',
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'field',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'fl',
                  },
                  'Who can request',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'control',
                    tabIndex: '0',
                    role: 'button',
                  },
                  s.who,
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'chevron-down',
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'field',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'fl',
                  },
                  'Status',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'control',
                    tabIndex: '0',
                    role: 'button',
                    style: {
                      cursor: 'default',
                    },
                  },
                  /*#__PURE__*/ React.createElement(
                    StatusPill,
                    {
                      tone: 'success',
                      icon: 'circle-check',
                    },
                    'Available',
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'terms-note',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'shield-check',
                }),
                ' Leadership can see this ship as rentable capacity. You stay the owner and can withdraw it anytime.',
              ),
            ),
        );
      }
      function MyShipsView({ ships, setShips }) {
        const toast = window.__toast || (() => {});
        const onToggle = (id) =>
          setShips((arr) =>
            arr.map((s) =>
              s.id === id
                ? {
                    ...s,
                    offered: !s.offered,
                  }
                : s,
            ),
          );
        const offeredCount = ships.filter((s) => s.offered).length;
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        return /*#__PURE__*/ React.createElement(
          'div',
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'offer-summary',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'ic',
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: 'hand-helping',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'txt',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'tt',
                },
                offeredCount,
                ' of ',
                ships.length,
                ' ships offered to Atlas Vanguard',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'ss',
                },
                'Toggle a ship to make it available for org operations. You keep ownership and set the terms.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-ghost btn-sm',
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: 'plus',
              }),
              ' Add ship',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'offer-list',
            },
            ships.map((s) =>
              /*#__PURE__*/ React.createElement(MyShipOffer, {
                key: s.id,
                s: s,
                onToggle: onToggle,
                onToast: toast,
              }),
            ),
          ),
        );
      }

      // ============== MEMBER-OFFERED VIEW ==============
      function OfferedRow({ s, selected, tabIndex, regRef, onSelect }) {
        const r = ROLE[s.role];
        const onloan = s.status === 'onloan';
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': selected,
            onClick: onSelect,
            onFocus: onSelect,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic ' + r.cls,
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: r.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  s.mfr,
                  ' ',
                  s.ship,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sub',
                  },
                  r.label,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(window.AvatarChip, {
              name: s.owner,
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'num',
            },
            s.rate
              ? /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'rate-pill',
                  },
                  fmt(s.rate),
                  ' ',
                  /*#__PURE__*/ React.createElement('small', null, '/day'),
                )
              : /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'rate-free',
                  },
                  'Free',
                ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            onloan
              ? /*#__PURE__*/ React.createElement(
                  StatusPill,
                  {
                    tone: 'info',
                    icon: 'navigation',
                  },
                  'On loan',
                )
              : /*#__PURE__*/ React.createElement(
                  StatusPill,
                  {
                    tone: 'brand',
                    icon: 'circle-check',
                  },
                  'Available',
                ),
          ),
        );
      }
      function OfferedDetail({ s }) {
        const r = ROLE[s.role];
        const onloan = s.status === 'onloan';
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'panel detail',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ship-hero',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic ' + r.cls,
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: r.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'h',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 't',
                  },
                  s.mfr,
                  ' ',
                  s.ship,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'mfr',
                  },
                  r.label,
                  ' \xB7 owned by ',
                  s.owner,
                ),
              ),
              onloan
                ? /*#__PURE__*/ React.createElement(
                    StatusPill,
                    {
                      tone: 'info',
                      icon: 'navigation',
                    },
                    'On loan',
                  )
                : /*#__PURE__*/ React.createElement(
                    StatusPill,
                    {
                      tone: 'brand',
                      icon: 'circle-check',
                    },
                    'Available',
                  ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'spec-grid',
                style: {
                  marginTop: 'var(--space-4)',
                },
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'spec',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sk',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'users',
                  }),
                  ' Crew',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sv',
                  },
                  s.crew,
                  /*#__PURE__*/ React.createElement('small', null, 'seats'),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'spec',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sk',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'container',
                  }),
                  ' Cargo',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sv',
                  },
                  fmt(s.cargo),
                  /*#__PURE__*/ React.createElement('small', null, 'SCU'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement('span', null, 'Rental terms'),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'coins',
                }),
                ' Rate',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                s.rate ? fmt(s.rate) + ' aUEC / day' : 'Free for org ops',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'key-round',
                }),
                ' Who can request',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                s.who,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'kv',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'user-round',
                }),
                ' Owner',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                s.owner,
              ),
            ),
            onloan &&
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'kv',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'k',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'navigation',
                  }),
                  ' Current use',
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'v',
                    style: {
                      fontWeight: 400,
                      color: 'var(--text-muted)',
                    },
                  },
                  s.borrowedBy,
                ),
              ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement('span', null, 'Request to use'),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'req-box',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic role-explore',
                  style: {
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    placeItems: 'center',
                  },
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'calendar-clock',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'who',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  onloan
                    ? 'Currently on loan to the org'
                    : 'Reserve for an operation',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'rt',
                  },
                  onloan
                    ? 'Returns after Op Ironwake'
                    : s.rate
                      ? fmt(s.rate) + ' aUEC/day · ' + s.owner + ' approves'
                      : 'Free · ' + s.owner + ' approves',
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
              style: {
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 'var(--space-3)',
              },
            },
            onloan
              ? /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-ghost btn-sm',
                    style: {
                      flex: 1,
                    },
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'rotate-ccw',
                  }),
                  ' Request return',
                )
              : /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                    style: {
                      flex: 1,
                    },
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'send',
                  }),
                  ' Request ship',
                ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-ghost btn-sm',
                'aria-label': 'Message owner',
              },
              /*#__PURE__*/ React.createElement(FI, {
                n: 'message-circle',
              }),
            ),
          ),
        );
      }
      function OfferedView() {
        const [selId, setSelId] = React.useState(OFFERED[0].id);
        const sel = OFFERED.find((s) => s.id === selId);
        const roving = window.useRoving(OFFERED.length, {
          onActivate: (i) => setSelId(OFFERED[i].id),
        });
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'split',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'dtable-wrap',
            },
            /*#__PURE__*/ React.createElement(
              'table',
              {
                className: 'dtable',
                role: 'grid',
                'aria-label': 'Member-offered ships',
                onKeyDown: roving.onKeyDown,
              },
              /*#__PURE__*/ React.createElement(
                'thead',
                null,
                /*#__PURE__*/ React.createElement(
                  'tr',
                  null,
                  /*#__PURE__*/ React.createElement('th', null, 'Ship'),
                  /*#__PURE__*/ React.createElement('th', null, 'Offered by'),
                  /*#__PURE__*/ React.createElement(
                    'th',
                    {
                      className: 'num',
                    },
                    'Rate',
                  ),
                  /*#__PURE__*/ React.createElement('th', null, 'Status'),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'tbody',
                null,
                OFFERED.map((s, i) =>
                  /*#__PURE__*/ React.createElement(OfferedRow, {
                    key: s.id,
                    s: s,
                    selected: s.id === selId,
                    tabIndex: roving.getTab(i),
                    regRef: roving.register(i),
                    onSelect: () => {
                      setSelId(s.id);
                      roving.setIdx(i);
                    },
                  }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'list-hint',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
              ),
              ' move ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
              ),
              ' open ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  style: {
                    marginLeft: 'auto',
                  },
                },
                OFFERED.length,
                ' member ships available',
              ),
            ),
          ),
          sel &&
            /*#__PURE__*/ React.createElement(OfferedDetail, {
              s: sel,
            }),
        );
      }

      // ============== PAGE ==============
      function FleetPage() {
        const [tab, setTab] = React.useState('org');
        const [myShips, setMyShips] = React.useState(MY_SHIPS);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const myOffered = myShips.filter((s) => s.offered).length;
        const ready = ORG_FLEET.filter((s) => s.status === 'ready').length;
        const deployed = ORG_FLEET.filter(
          (s) => s.status === 'deployed',
        ).length;
        const totalCargo = ORG_FLEET.reduce((s, x) => s + x.cargo, 0);
        const availOffered = OFFERED.filter(
          (s) => s.status === 'available',
        ).length;
        const tabs = [
          {
            value: 'org',
            label: 'Org Fleet',
            icon: 'building-2',
            count: ORG_FLEET.length,
          },
          {
            value: 'mine',
            label: 'My Ships',
            icon: 'user-round',
            count: myShips.length,
          },
          {
            value: 'offered',
            label: 'Member-Offered',
            icon: 'hand-helping',
            count: OFFERED.length,
          },
        ];
        const stats =
          tab === 'mine'
            ? [
                {
                  k: 'My ships',
                  icon: 'rocket',
                  v: myShips.length,
                  d: 'in personal hangar',
                },
                {
                  k: 'Offered to org',
                  icon: 'hand-helping',
                  v: myOffered,
                  d: 'available for ops',
                  tone: 'up',
                },
                {
                  k: 'Earning potential',
                  icon: 'coins',
                  v: fmt(
                    myShips
                      .filter((s) => s.offered)
                      .reduce((a, s) => a + s.rate, 0),
                  ),
                  unit: 'aUEC/day',
                  d: 'from rentals',
                },
                {
                  k: 'Total cargo',
                  icon: 'container',
                  v: fmt(myShips.reduce((a, s) => a + s.cargo, 0)),
                  unit: 'SCU',
                  d: 'across your ships',
                },
              ]
            : tab === 'offered'
              ? [
                  {
                    k: 'Member ships',
                    icon: 'hand-helping',
                    v: OFFERED.length,
                    d: 'offered to the org',
                  },
                  {
                    k: 'Available now',
                    icon: 'circle-check',
                    v: availOffered,
                    d: 'ready to request',
                    tone: 'up',
                  },
                  {
                    k: 'On loan',
                    icon: 'navigation',
                    v: OFFERED.length - availOffered,
                    d: 'currently in use',
                  },
                  {
                    k: 'Rentable cargo',
                    icon: 'container',
                    v: fmt(OFFERED.reduce((a, s) => a + s.cargo, 0)),
                    unit: 'SCU',
                    d: 'extra capacity',
                  },
                ]
              : [
                  {
                    k: 'Org ships',
                    icon: 'rocket',
                    v: ORG_FLEET.length,
                    d: 'owned by Atlas Vanguard',
                  },
                  {
                    k: 'Ready',
                    icon: 'circle-check',
                    v: ready,
                    d: 'crewed & flightworthy',
                    tone: 'up',
                  },
                  {
                    k: 'Deployed',
                    icon: 'navigation',
                    v: deployed,
                    d: 'on active ops',
                  },
                  {
                    k: 'Fleet cargo',
                    icon: 'container',
                    v: fmt(totalCargo),
                    unit: 'SCU',
                    d: 'total capacity',
                  },
                ];
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'rocket',
                }),
                ' Operations ',
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'chevron-right',
                }),
                ' Fleet',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'Fleet',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                'Manage the org armada, your personal hangar, and the ships members lend to the cause \u2014 all in one command view.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              tab === 'org' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-ghost btn-sm',
                  },
                  /*#__PURE__*/ React.createElement(FI, {
                    n: 'download',
                  }),
                  ' Export',
                ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  id: 'fleet-new',
                },
                /*#__PURE__*/ React.createElement(FI, {
                  n: 'plus',
                }),
                ' ',
                tab === 'mine' ? 'Add ship' : 'Register ship',
                ' ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                    style: {
                      marginLeft: 6,
                    },
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              style: {
                marginTop: 'var(--space-6)',
              },
            },
            /*#__PURE__*/ React.createElement(Segmented, {
              options: tabs,
              value: tab,
              onChange: setTab,
              ariaLabel: 'Fleet view',
            }),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: stats,
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              style: {
                marginTop: 'var(--space-2)',
              },
            },
            tab === 'org' &&
              /*#__PURE__*/ React.createElement(OrgFleetView, null),
            tab === 'mine' &&
              /*#__PURE__*/ React.createElement(MyShipsView, {
                ships: myShips,
                setShips: setMyShips,
              }),
            tab === 'offered' &&
              /*#__PURE__*/ React.createElement(OfferedView, null),
          ),
        );
      }
      function FleetApp() {
        const commands = [
          {
            id: 'fleet-org',
            group: 'Fleet',
            icon: 'building-2',
            label: 'View org fleet',
            run: () => window.__toast && window.__toast('Org fleet'),
          },
          {
            id: 'fleet-mine',
            group: 'Fleet',
            icon: 'user-round',
            label: 'My ships & offers',
            run: () => window.__toast && window.__toast('My ships'),
          },
          {
            id: 'fleet-offered',
            group: 'Fleet',
            icon: 'hand-helping',
            label: 'Member-offered ships',
            run: () => window.__toast && window.__toast('Member-offered'),
          },
          {
            id: 'fleet-register',
            group: 'Fleet',
            icon: 'plus',
            label: 'Register a ship',
            run: () =>
              window.__toast && window.__toast('Register ship', 'plus'),
          },
        ];
        const helpExtra = [
          ['Register ship', ['n']],
          ['Switch view', ['←', '→']],
          ['Open ship', ['↵']],
          ['Toggle theme', ['t']],
        ];
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'fleet',
            commands: commands,
            helpExtra: helpExtra,
            onNew: () =>
              window.__toast && window.__toast('Register a new ship', 'plus'),
            searchPlaceholder: 'Search ships, captains, owners\u2026',
          },
          /*#__PURE__*/ React.createElement(FleetPage, null),
        );
      }
      window.FleetApp = FleetApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/Fleet.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/Inventory.jsx
  try {
    (() => {
      // ============================================================
      // Station — Inventory page (main)
      // ============================================================

      const II = window.StationIcon;
      const SInv = window.StationInv;
      function InventoryPage() {
        const toast = window.__toast || (() => {});
        const { qfmt, abbr } = window._invHelpers;
        const [view, setView] = React.useState('personal'); // personal | org
        const [orgId, setOrgId] = React.useState(1);
        const orgMode = view === 'org';
        const org = SInv.INV_ORGS.find((o) => o.id === orgId);
        const canManage = orgMode
          ? org && (org.perms.includes('edit') || org.perms.includes('admin'))
          : true;
        const [personal, setPersonal] = React.useState(SInv.PERSONAL_ITEMS);
        const [orgItems, setOrgItems] = React.useState(SInv.ORG_ITEMS);
        const source = orgMode ? orgItems : personal;
        const setSource = orgMode ? setOrgItems : setPersonal;

        // filters / sort / group / density
        const [search, setSearch] = React.useState('');
        const [catId, setCatId] = React.useState('');
        const [sharedOnly, setSharedOnly] = React.useState(false);
        const [sortBy, setSortBy] = React.useState('date');
        const [sortDir, setSortDir] = React.useState('desc');
        const [groupBy, setGroupBy] = React.useState('none');
        const [density, setDensity] = React.useState('standard'); // standard | compact(editor)
        const editing = density === 'compact' && canManage;
        const [page, setPage] = React.useState(0);
        const [rpp, setRpp] = React.useState(25);

        // inline edit state
        const [drafts, setDrafts] = React.useState({});
        const [qtyState, setQtyState] = React.useState({}); // id -> saving|saved
        const [qtyErr, setQtyErr] = React.useState({});
        const [activeId, setActiveId] = React.useState(null);

        // action popover + catalog
        const [action, setAction] = React.useState(null); // {mode, item, anchorRect}
        const [catalogOpen, setCatalogOpen] = React.useState(false);
        React.useEffect(() => {
          setPage(0);
        }, [search, catId, sharedOnly, view, orgId]);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });

        // filtered + sorted
        const filtered = React.useMemo(() => {
          let r = source.filter((it) => {
            if (
              search &&
              !it.itemName.toLowerCase().includes(search.toLowerCase()) &&
              !(it.notes || '').toLowerCase().includes(search.toLowerCase())
            )
              return false;
            if (catId && it.categoryName !== SInv.catById(catId).name)
              return false;
            if (!orgMode && sharedOnly && !it.sharedOrgId) return false;
            return true;
          });
          const dir = sortDir === 'asc' ? 1 : -1;
          r = [...r].sort((a, b) => {
            if (sortBy === 'name')
              return a.itemName.localeCompare(b.itemName) * dir;
            if (sortBy === 'quantity') return (a.quantity - b.quantity) * dir;
            return (a.id - b.id) * dir; // date proxy
          });
          return r;
        }, [source, search, catId, sharedOnly, orgMode, sortBy, sortDir]);

        // group
        const groups = React.useMemo(() => {
          if (groupBy === 'none') return [['All items', filtered]];
          const m = new Map();
          filtered.forEach((it) => {
            const key =
              groupBy === 'category'
                ? it.categoryName
                : it.sharedOrgId
                  ? 'Shared'
                  : 'Private';
            if (!m.has(key)) m.set(key, []);
            m.get(key).push(it);
          });
          return [...m.entries()];
        }, [filtered, groupBy]);

        // pagination applies only when ungrouped
        const paged =
          groupBy === 'none'
            ? filtered.slice(page * rpp, page * rpp + rpp)
            : filtered;
        const pageGroups = groupBy === 'none' ? [['All items', paged]] : groups;
        const totalPages = Math.max(1, Math.ceil(filtered.length / rpp));

        // stats
        const totalQty = source.reduce((s, x) => s + Number(x.quantity), 0);
        const sharedCount = source.filter((x) => x.sharedOrgId).length;
        const catCount = new Set(source.map((x) => x.categoryName)).size;

        // ---- inline qty ----
        const onQtyChange = (it, v) => {
          setDrafts((d) => ({
            ...d,
            [it.id]: v,
          }));
          setQtyErr((e) => ({
            ...e,
            [it.id]: null,
          }));
        };
        const onQtyCommit = (it, advance) => {
          const raw = drafts[it.id];
          if (raw == null) return;
          const n = Number(raw);
          if (!Number.isFinite(n) || n <= 0) {
            setQtyErr((e) => ({
              ...e,
              [it.id]: 'Must be greater than 0',
            }));
            return;
          }
          if (n === Number(it.quantity)) {
            setDrafts((d) => {
              const c = {
                ...d,
              };
              delete c[it.id];
              return c;
            });
            return;
          }
          setQtyState((s) => ({
            ...s,
            [it.id]: 'saving',
          }));
          setTimeout(() => {
            setSource((arr) =>
              arr.map((x) =>
                x.id === it.id
                  ? {
                      ...x,
                      quantity: n,
                      modified: 'just now',
                    }
                  : x,
              ),
            );
            setQtyState((s) => ({
              ...s,
              [it.id]: 'saved',
            }));
            setDrafts((d) => {
              const c = {
                ...d,
              };
              delete c[it.id];
              return c;
            });
            setTimeout(
              () =>
                setQtyState((s) => {
                  const c = {
                    ...s,
                  };
                  delete c[it.id];
                  return c;
                }),
              1200,
            );
          }, 420);
        };

        // ---- add from catalog / new row ----
        const addItem = (catItem, quantity, notes) => {
          const cat = SInv.INV_CATEGORIES.find(
            (c) => c.id === catItem.categoryId,
          );
          const existing = source.find((x) => x.uexItemId === catItem.uexId);
          if (existing) {
            setSource((arr) =>
              arr.map((x) =>
                x.id === existing.id
                  ? {
                      ...x,
                      quantity: Number(x.quantity) + Number(quantity),
                      modified: 'just now',
                    }
                  : x,
              ),
            );
            toast('Merged into ' + catItem.name, 'git-merge');
          } else {
            const nid = Math.max(0, ...source.map((x) => x.id)) + 1;
            setSource((arr) => [
              {
                id: nid,
                uexItemId: catItem.uexId,
                itemName: catItem.name,
                categoryName: cat.name,
                quantity: Number(quantity),
                notes: notes || '',
                sharedOrgId: null,
                location: orgMode ? 'Org vault' : 'Personal hangar',
                modified: 'just now',
              },
              ...arr,
            ]);
            toast('Added ' + catItem.name, 'check');
          }
        };

        // ---- row actions ----
        const openAction = (anchor, item) => {
          const r = anchor.getBoundingClientRect();
          setAction({
            mode: 'menu',
            item,
            rect: r,
          });
        };
        const doEdit = (item, quantity, notes) => {
          setSource((arr) =>
            arr.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    quantity: Number(quantity),
                    notes,
                    modified: 'just now',
                  }
                : x,
            ),
          );
          toast('Updated ' + item.itemName, 'check');
          setAction(null);
        };
        const doSplit = (item, amount) => {
          const a = Number(amount);
          if (a <= 0 || a >= Number(item.quantity)) {
            toast('Split must be less than current qty', 'triangle-alert');
            return;
          }
          const nid = Math.max(0, ...source.map((x) => x.id)) + 1;
          setSource((arr) =>
            arr.flatMap((x) =>
              x.id === item.id
                ? [
                    {
                      ...x,
                      quantity: Number(x.quantity) - a,
                      modified: 'just now',
                    },
                    {
                      ...x,
                      id: nid,
                      quantity: a,
                      sharedOrgId: null,
                      notes: '',
                      modified: 'just now',
                    },
                  ]
                : [x],
            ),
          );
          toast('Split ' + qfmt(a) + ' off ' + item.itemName, 'split');
          setAction(null);
        };
        const doShare = (item, shareOrgId) => {
          setSource((arr) =>
            arr.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    sharedOrgId: Number(shareOrgId),
                    modified: 'just now',
                  }
                : x,
            ),
          );
          toast('Shared ' + item.itemName, 'share-2');
          setAction(null);
        };
        const doUnshare = (item) => {
          setSource((arr) =>
            arr.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    sharedOrgId: null,
                    modified: 'just now',
                  }
                : x,
            ),
          );
          toast('Unshared ' + item.itemName, 'lock');
          setAction(null);
        };
        const doDelete = (item) => {
          setSource((arr) => arr.filter((x) => x.id !== item.id));
          toast('Deleted ' + item.itemName, 'trash-2');
          setAction(null);
        };
        const InvRow = window.InvRow,
          NewRow = window.NewRow;
        const cycleSort = (key) => {
          if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
          else {
            setSortBy(key);
            setSortDir('desc');
          }
        };
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(II, {
                  n: 'archive',
                }),
                ' Assets ',
                /*#__PURE__*/ React.createElement(II, {
                  n: 'chevron-right',
                }),
                ' Inventory',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'Inventory',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                'Track everything you own and what your org holds \u2014 refined ore, components, weapons, and trade goods. Edit quantities inline, split stacks, and share with your org.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              /*#__PURE__*/ React.createElement(Segmented, {
                options: [
                  {
                    value: 'personal',
                    label: 'Personal',
                    icon: 'user-round',
                  },
                  {
                    value: 'org',
                    label: 'Organization',
                    icon: 'building-2',
                  },
                ],
                value: view,
                onChange: setView,
                ariaLabel: 'Inventory view',
              }),
              orgMode &&
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'inv-orgsel',
                    role: 'button',
                    tabIndex: '0',
                    onClick: () => setOrgId((id) => (id === 1 ? 2 : 1)),
                    'aria-label': 'Switch organization',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'badge',
                    },
                    org.badge,
                  ),
                  org.name,
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'chevrons-up-down',
                  }),
                ),
              (!orgMode || canManage) &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                    id: 'inv-new',
                    onClick: () => setCatalogOpen(true),
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'plus',
                  }),
                  ' ',
                  orgMode ? 'Add org item' : 'Add item',
                  ' ',
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'kbd',
                      style: {
                        marginLeft: 6,
                      },
                    },
                    /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                  ),
                ),
            ),
          ),
          orgMode &&
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'perm-bar ' + (canManage ? 'manage' : 'view'),
              },
              /*#__PURE__*/ React.createElement(II, {
                n: canManage ? 'shield-check' : 'eye',
              }),
              canManage
                ? /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    'You have ',
                    /*#__PURE__*/ React.createElement('strong', null, 'manage'),
                    ' access to ',
                    org.name,
                    ' inventory \u2014 add, edit, split, and delete org stock.',
                  )
                : /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    'You have ',
                    /*#__PURE__*/ React.createElement(
                      'strong',
                      null,
                      'view-only',
                    ),
                    ' access to ',
                    org.name,
                    ' inventory. Ask an admin for edit rights to make changes.',
                  ),
              /*#__PURE__*/ React.createElement('span', {
                className: 'grow',
              }),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't-mono',
                  style: {
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--text-faint)',
                  },
                },
                org.perms.join(' · ').toUpperCase(),
              ),
            ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
              {
                k: orgMode ? 'Org records' : 'My records',
                icon: 'package',
                v: source.length,
                d: catCount + ' categories',
              },
              {
                k: 'Total quantity',
                icon: 'layers',
                v: abbr(totalQty),
                d: 'units on hand',
              },
              {
                k: orgMode ? 'Org stock' : 'Shared items',
                icon: orgMode ? 'building-2' : 'share-2',
                v: orgMode ? source.length : sharedCount,
                d: orgMode ? 'visible to members' : 'shared to orgs',
                tone: 'up',
              },
              {
                k: 'Categories',
                icon: 'tag',
                v: catCount,
                d: 'item families',
              },
            ],
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'inv-toolbar',
            },
            /*#__PURE__*/ React.createElement(
              'label',
              {
                className: 'inv-search',
              },
              /*#__PURE__*/ React.createElement(II, {
                n: 'search',
              }),
              /*#__PURE__*/ React.createElement('input', {
                value: search,
                placeholder: 'Search items, notes\u2026',
                onChange: (e) => setSearch(e.target.value),
                'aria-label': 'Search inventory',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'inv-select',
              },
              /*#__PURE__*/ React.createElement(II, {
                n: 'tag',
                className: 'lead',
              }),
              /*#__PURE__*/ React.createElement(
                'select',
                {
                  value: catId,
                  onChange: (e) =>
                    setCatId(e.target.value ? Number(e.target.value) : ''),
                  'aria-label': 'Category filter',
                },
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: '',
                  },
                  'All categories',
                ),
                SInv.INV_CATEGORIES.map((c) =>
                  /*#__PURE__*/ React.createElement(
                    'option',
                    {
                      key: c.id,
                      value: c.id,
                    },
                    c.name,
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(II, {
                n: 'chevron-down',
                className: 'chev',
              }),
            ),
            !orgMode &&
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                  'aria-pressed': sharedOnly,
                  onClick: () => setSharedOnly((v) => !v),
                },
                /*#__PURE__*/ React.createElement(II, {
                  n: 'share-2',
                }),
                ' Shared only',
              ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'inv-select',
              },
              /*#__PURE__*/ React.createElement(II, {
                n: 'arrow-down-up',
                className: 'lead',
              }),
              /*#__PURE__*/ React.createElement(
                'select',
                {
                  value: sortBy + ':' + sortDir,
                  onChange: (e) => {
                    const [k, d] = e.target.value.split(':');
                    setSortBy(k);
                    setSortDir(d);
                  },
                  'aria-label': 'Sort',
                },
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'date:desc',
                  },
                  'Newest first',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'date:asc',
                  },
                  'Oldest first',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'name:asc',
                  },
                  'Name A\u2013Z',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'name:desc',
                  },
                  'Name Z\u2013A',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'quantity:desc',
                  },
                  'Quantity high\u2013low',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'quantity:asc',
                  },
                  'Quantity low\u2013high',
                ),
              ),
              /*#__PURE__*/ React.createElement(II, {
                n: 'chevron-down',
                className: 'chev',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'inv-select',
              },
              /*#__PURE__*/ React.createElement(II, {
                n: 'group',
                className: 'lead',
              }),
              /*#__PURE__*/ React.createElement(
                'select',
                {
                  value: groupBy,
                  onChange: (e) => setGroupBy(e.target.value),
                  'aria-label': 'Group by',
                },
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'none',
                  },
                  'No grouping',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'category',
                  },
                  'Group by category',
                ),
                /*#__PURE__*/ React.createElement(
                  'option',
                  {
                    value: 'share',
                  },
                  'Group by share status',
                ),
              ),
              /*#__PURE__*/ React.createElement(II, {
                n: 'chevron-down',
                className: 'chev',
              }),
            ),
            /*#__PURE__*/ React.createElement('span', {
              className: 'inv-spacer',
            }),
            canManage &&
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'density-toggle',
                  role: 'group',
                  'aria-label': 'Density',
                },
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    'aria-pressed': density === 'standard',
                    onClick: () => setDensity('standard'),
                    title: 'Standard view',
                    'aria-label': 'Standard view',
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'rows-3',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    'aria-pressed': density === 'compact',
                    onClick: () => setDensity('compact'),
                    title: 'Editor mode \u2014 inline editing',
                    'aria-label': 'Editor mode',
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'pencil-ruler',
                  }),
                ),
              ),
          ),
          filtered.length === 0
            ? /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'dtable-wrap',
                  style: {
                    marginTop: 'var(--space-6)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'inv-empty',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'e-ic',
                    },
                    /*#__PURE__*/ React.createElement(II, {
                      n: 'package-open',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'h3',
                    null,
                    'No inventory matches your filters',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'p',
                    null,
                    'Adjust filters or ',
                    canManage ? 'add a new item' : 'sync new items',
                    ' to get started.',
                  ),
                ),
              )
            : /*#__PURE__*/ React.createElement(
                'div',
                {
                  style: {
                    marginTop: 'var(--space-6)',
                  },
                  className: editing ? 'editor' : '',
                },
                pageGroups.map(([gname, gitems], gi) =>
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className:
                        'grp-section' + (groupBy === 'none' ? ' single' : ''),
                      key: gname,
                    },
                    groupBy !== 'none' &&
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'grp-header',
                        },
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'gchip',
                          },
                          gname,
                        ),
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'gcount',
                          },
                          gitems.length,
                          ' item',
                          gitems.length === 1 ? '' : 's',
                        ),
                      ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'dtable-wrap',
                      },
                      /*#__PURE__*/ React.createElement(
                        'table',
                        {
                          className: 'dtable inv-table',
                          'aria-label': 'Inventory — ' + gname,
                        },
                        /*#__PURE__*/ React.createElement(
                          'thead',
                          null,
                          /*#__PURE__*/ React.createElement(
                            'tr',
                            null,
                            /*#__PURE__*/ React.createElement(
                              'th',
                              null,
                              'Item',
                            ),
                            /*#__PURE__*/ React.createElement(
                              'th',
                              null,
                              'Category',
                            ),
                            /*#__PURE__*/ React.createElement(
                              'th',
                              {
                                className: 'num',
                              },
                              'Quantity',
                            ),
                            /*#__PURE__*/ React.createElement(
                              'th',
                              null,
                              'Status',
                            ),
                            /*#__PURE__*/ React.createElement(
                              'th',
                              null,
                              'Updated',
                            ),
                            /*#__PURE__*/ React.createElement('th', null),
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'tbody',
                          null,
                          editing &&
                            gi === 0 &&
                            groupBy === 'none' &&
                            /*#__PURE__*/ React.createElement(NewRow, {
                              orgMode: orgMode,
                              onAdd: addItem,
                            }),
                          gitems.map((it) =>
                            /*#__PURE__*/ React.createElement(InvRow, {
                              key: it.id,
                              it: it,
                              editing: editing,
                              orgMode: orgMode,
                              draft: drafts[it.id],
                              qtyState: qtyState[it.id],
                              qtyErr: qtyErr[it.id],
                              isActive: activeId === it.id,
                              onSelect: () => setActiveId(it.id),
                              onQtyFocus: () => setActiveId(it.id),
                              onQtyChange: (v) => onQtyChange(it, v),
                              onQtyCommit: (adv) => onQtyCommit(it, adv),
                              onAction: openAction,
                            }),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                groupBy === 'none' &&
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'inv-pager',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'rpp',
                      },
                      'Rows per page',
                      /*#__PURE__*/ React.createElement(
                        'select',
                        {
                          value: rpp,
                          onChange: (e) => {
                            setRpp(Number(e.target.value));
                            setPage(0);
                          },
                          'aria-label': 'Rows per page',
                        },
                        [10, 25, 50, 100, 250].map((n) =>
                          /*#__PURE__*/ React.createElement(
                            'option',
                            {
                              key: n,
                              value: n,
                            },
                            n,
                          ),
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      null,
                      filtered.length === 0 ? 0 : page * rpp + 1,
                      '\u2013',
                      Math.min(filtered.length, (page + 1) * rpp),
                      ' of ',
                      filtered.length,
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'pager',
                      },
                      /*#__PURE__*/ React.createElement(
                        'button',
                        {
                          disabled: page === 0,
                          onClick: () => setPage((p) => Math.max(0, p - 1)),
                          'aria-label': 'Previous page',
                        },
                        /*#__PURE__*/ React.createElement(II, {
                          n: 'chevron-left',
                        }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'button',
                        {
                          disabled: page >= totalPages - 1,
                          onClick: () =>
                            setPage((p) => Math.min(totalPages - 1, p + 1)),
                          'aria-label': 'Next page',
                        },
                        /*#__PURE__*/ React.createElement(II, {
                          n: 'chevron-right',
                        }),
                      ),
                    ),
                  ),
              ),
          action &&
            action.mode === 'menu' &&
            /*#__PURE__*/ React.createElement(ActionMenu, {
              action: action,
              orgMode: orgMode,
              onClose: () => setAction(null),
              onPick: (mode) =>
                setAction({
                  ...action,
                  mode,
                }),
              onUnshare: () => doUnshare(action.item),
            }),
          action &&
            action.mode &&
            action.mode !== 'menu' &&
            /*#__PURE__*/ React.createElement(ActionDialog, {
              action: action,
              orgs: SInv.INV_ORGS,
              onClose: () => setAction(null),
              onEdit: doEdit,
              onSplit: doSplit,
              onShare: doShare,
              onDelete: doDelete,
            }),
          catalogOpen &&
            /*#__PURE__*/ React.createElement(CatalogDialog, {
              orgMode: orgMode,
              orgName: org && org.name,
              onClose: () => setCatalogOpen(false),
              onAdd: addItem,
            }),
        );
      }

      // ---- row action menu (popover) ----
      function ActionMenu({ action, orgMode, onClose, onPick, onUnshare }) {
        const { item, rect } = action;
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const style = {
          position: 'fixed',
          top: Math.min(rect.bottom + 6, window.innerHeight - 230),
          left: Math.max(12, rect.right - 200),
          width: 196,
          zIndex: 160,
        };
        const items = [
          {
            mode: 'edit',
            icon: 'pencil',
            label: 'Edit',
          },
          {
            mode: 'split',
            icon: 'split',
            label: 'Split',
          },
          ...(!orgMode
            ? [
                {
                  mode: 'share',
                  icon: 'share-2',
                  label: 'Share',
                },
              ]
            : []),
          ...(!orgMode && item.sharedOrgId
            ? [
                {
                  unshare: true,
                  icon: 'lock',
                  label: 'Unshare',
                },
              ]
            : []),
          {
            mode: 'delete',
            icon: 'trash-2',
            label: 'Delete',
            danger: true,
          },
        ];
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            style: {
              background: 'transparent',
              backdropFilter: 'none',
            },
            onMouseDown: onClose,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'act-pop',
              style: style,
              onMouseDown: (e) => e.stopPropagation(),
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                style: {
                  padding: 6,
                },
              },
              items.map((m, i) =>
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    key: i,
                    className: 'cmdk-item',
                    style: {
                      width: '100%',
                      color: m.danger ? 'var(--coral-400)' : undefined,
                    },
                    onClick: () => {
                      if (m.unshare) onUnshare();
                      else onPick(m.mode);
                    },
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                      style: m.danger
                        ? {
                            background:
                              'color-mix(in srgb, var(--coral-500) 16%, transparent)',
                            color: 'var(--coral-400)',
                          }
                        : undefined,
                    },
                    /*#__PURE__*/ React.createElement(II, {
                      n: m.icon,
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'lbl',
                    },
                    m.label,
                  ),
                ),
              ),
            ),
          ),
        );
      }

      // ---- action dialogs (edit/split/share/delete) ----
      function ActionDialog({
        action,
        orgs,
        onClose,
        onEdit,
        onSplit,
        onShare,
        onDelete,
      }) {
        const { mode, item } = action;
        const [qty, setQty] = React.useState(String(item.quantity));
        const [notes, setNotes] = React.useState(item.notes || '');
        const [splitAmt, setSplitAmt] = React.useState('');
        const [shareOrg, setShareOrg] = React.useState('');
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        }, [mode]);
        const titles = {
          edit: 'Edit item',
          split: 'Split stack',
          share: 'Share with org',
          delete: 'Delete item',
        };
        const icons = {
          edit: 'pencil',
          split: 'split',
          share: 'share-2',
          delete: 'trash-2',
        };
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            onMouseDown: onClose,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'act-pop',
              onMouseDown: (e) => e.stopPropagation(),
              style: {
                marginTop: '14vh',
              },
              role: 'dialog',
              'aria-label': titles[mode],
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-head',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic' + (mode === 'delete' ? ' danger' : ''),
                },
                /*#__PURE__*/ React.createElement(II, {
                  n: icons[mode],
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't',
                },
                titles[mode],
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'ibtn',
                  onClick: onClose,
                  'aria-label': 'Close',
                },
                /*#__PURE__*/ React.createElement(II, {
                  n: 'x',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-body',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  style: {
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-strong)',
                    fontWeight: 'var(--weight-medium)',
                  },
                },
                item.itemName,
              ),
              mode === 'edit' &&
                /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'div',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'label',
                      {
                        className: 'field-lbl',
                      },
                      'Quantity',
                    ),
                    /*#__PURE__*/ React.createElement('input', {
                      className: 'field-in mono',
                      value: qty,
                      onChange: (e) => setQty(e.target.value),
                      autoFocus: true,
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'label',
                      {
                        className: 'field-lbl',
                      },
                      'Notes',
                    ),
                    /*#__PURE__*/ React.createElement('textarea', {
                      className: 'field-in',
                      value: notes,
                      onChange: (e) => setNotes(e.target.value),
                      placeholder: 'Optional note\u2026',
                    }),
                  ),
                ),
              mode === 'split' &&
                /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'p',
                    {
                      className: 'act-note',
                    },
                    'Current quantity: ',
                    /*#__PURE__*/ React.createElement(
                      'strong',
                      null,
                      window._invHelpers.qfmt(item.quantity),
                    ),
                    '. The split amount becomes a new stack.',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'label',
                      {
                        className: 'field-lbl',
                      },
                      'Quantity to split off',
                    ),
                    /*#__PURE__*/ React.createElement('input', {
                      className: 'field-in mono',
                      value: splitAmt,
                      onChange: (e) => setSplitAmt(e.target.value),
                      placeholder: '0',
                      autoFocus: true,
                    }),
                  ),
                ),
              mode === 'share' &&
                /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'p',
                    {
                      className: 'act-note',
                    },
                    'Make this item visible to one of your organizations.',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'label',
                      {
                        className: 'field-lbl',
                      },
                      'Organization',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'inv-select',
                        style: {
                          width: '100%',
                          height: 40,
                        },
                      },
                      /*#__PURE__*/ React.createElement(II, {
                        n: 'building-2',
                        className: 'lead',
                      }),
                      /*#__PURE__*/ React.createElement(
                        'select',
                        {
                          value: shareOrg,
                          onChange: (e) => setShareOrg(e.target.value),
                          style: {
                            flex: 1,
                          },
                          autoFocus: true,
                        },
                        /*#__PURE__*/ React.createElement(
                          'option',
                          {
                            value: '',
                          },
                          'Select organization\u2026',
                        ),
                        orgs.map((o) =>
                          /*#__PURE__*/ React.createElement(
                            'option',
                            {
                              key: o.id,
                              value: o.id,
                            },
                            o.name,
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(II, {
                        n: 'chevron-down',
                        className: 'chev',
                      }),
                    ),
                  ),
                ),
              mode === 'delete' &&
                /*#__PURE__*/ React.createElement(
                  'p',
                  {
                    className: 'act-note',
                  },
                  'Remove ',
                  /*#__PURE__*/ React.createElement(
                    'strong',
                    {
                      style: {
                        color: 'var(--text-strong)',
                      },
                    },
                    item.itemName,
                  ),
                  ' from this inventory? You can re-add it later from the catalog.',
                ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-foot',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  onClick: onClose,
                },
                'Cancel',
              ),
              mode === 'edit' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                    onClick: () => onEdit(item, qty, notes),
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'check',
                  }),
                  ' Save',
                ),
              mode === 'split' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                    onClick: () => onSplit(item, splitAmt),
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'split',
                  }),
                  ' Split',
                ),
              mode === 'share' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                    disabled: !shareOrg,
                    onClick: () => shareOrg && onShare(item, shareOrg),
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'share-2',
                  }),
                  ' Share',
                ),
              mode === 'delete' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-sm',
                    style: {
                      background: 'var(--coral-500)',
                      color: '#fff',
                    },
                    onClick: () => onDelete(item),
                  },
                  /*#__PURE__*/ React.createElement(II, {
                    n: 'trash-2',
                  }),
                  ' Delete',
                ),
            ),
          ),
        );
      }

      // ---- catalog add dialog ----
      function CatalogDialog({ orgMode, orgName, onClose, onAdd }) {
        const [q, setQ] = React.useState('');
        const [catId, setCatId] = React.useState('');
        const [sel, setSel] = React.useState(null);
        const [qty, setQty] = React.useState('1');
        const [notes, setNotes] = React.useState('');
        const [hi, setHi] = React.useState(0);
        const searchRef = React.useRef(null);
        React.useEffect(() => {
          setTimeout(() => searchRef.current && searchRef.current.focus(), 20);
        }, []);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const results = React.useMemo(() => {
          let r = window.StationInv.UEX_CATALOG;
          if (catId) r = r.filter((c) => c.categoryId === Number(catId));
          if (q.trim())
            r = r.filter((c) =>
              c.name.toLowerCase().includes(q.trim().toLowerCase()),
            );
          return r;
        }, [q, catId]);
        React.useEffect(() => {
          setSel(results[0] || null);
          setHi(0);
        }, [q, catId]);
        const ready = sel && Number(qty) > 0;
        const submit = (stay) => {
          if (!ready) return;
          onAdd(sel, Number(qty), notes);
          if (stay) {
            setQty('1');
            setNotes('');
            searchRef.current && searchRef.current.focus();
          } else onClose();
        };
        const onListKey = (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const n = Math.min(results.length - 1, hi + 1);
            setHi(n);
            setSel(results[n]);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const n = Math.max(0, hi - 1);
            setHi(n);
            setSel(results[n]);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            submit(false);
          }
        };
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            onMouseDown: onClose,
            onKeyDown: (e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submit(true);
              }
              if (e.key === 'Escape') onClose();
            },
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'catalog',
              onMouseDown: (e) => e.stopPropagation(),
              role: 'dialog',
              'aria-label': 'Add inventory item',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'catalog-head',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't',
                },
                orgMode ? 'Add org item · ' + orgName : 'Add inventory item',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'ibtn',
                  onClick: onClose,
                  'aria-label': 'Close',
                },
                /*#__PURE__*/ React.createElement(II, {
                  n: 'x',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'catalog-grid',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'catalog-left',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'label',
                    {
                      className: 'field-lbl',
                    },
                    'Search catalog',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'label',
                    {
                      className: 'inv-search',
                      style: {
                        maxWidth: 'none',
                        width: '100%',
                      },
                    },
                    /*#__PURE__*/ React.createElement(II, {
                      n: 'search',
                    }),
                    /*#__PURE__*/ React.createElement('input', {
                      ref: searchRef,
                      value: q,
                      placeholder: 'Search UEX items\u2026',
                      onChange: (e) => setQ(e.target.value),
                    }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'label',
                    {
                      className: 'field-lbl',
                    },
                    'Category',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'inv-select',
                      style: {
                        width: '100%',
                        height: 40,
                      },
                    },
                    /*#__PURE__*/ React.createElement(II, {
                      n: 'tag',
                      className: 'lead',
                    }),
                    /*#__PURE__*/ React.createElement(
                      'select',
                      {
                        value: catId,
                        onChange: (e) => setCatId(e.target.value),
                        style: {
                          flex: 1,
                        },
                      },
                      /*#__PURE__*/ React.createElement(
                        'option',
                        {
                          value: '',
                        },
                        'All',
                      ),
                      window.StationInv.INV_CATEGORIES.map((c) =>
                        /*#__PURE__*/ React.createElement(
                          'option',
                          {
                            key: c.id,
                            value: c.id,
                          },
                          c.name,
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(II, {
                      n: 'chevron-down',
                      className: 'chev',
                    }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'label',
                    {
                      className: 'field-lbl',
                    },
                    'Quantity',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'stepper',
                    },
                    /*#__PURE__*/ React.createElement('input', {
                      className: 'field-in mono',
                      value: qty,
                      onChange: (e) => setQty(e.target.value),
                      style: {
                        flex: 1,
                      },
                    }),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        onClick: () =>
                          setQty((v) =>
                            String(Math.max(1, (Number(v) || 0) - 1)),
                          ),
                        'aria-label': 'Decrease',
                      },
                      /*#__PURE__*/ React.createElement(II, {
                        n: 'minus',
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        onClick: () =>
                          setQty((v) => String((Number(v) || 0) + 1)),
                        'aria-label': 'Increase',
                      },
                      /*#__PURE__*/ React.createElement(II, {
                        n: 'plus',
                      }),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'label',
                    {
                      className: 'field-lbl',
                    },
                    'Notes',
                  ),
                  /*#__PURE__*/ React.createElement('input', {
                    className: 'field-in',
                    value: notes,
                    onChange: (e) => setNotes(e.target.value),
                    placeholder: 'Optional\u2026',
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'catalog-right',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'cr-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'lbl',
                    },
                    'Catalog results',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'cnt',
                    },
                    results.length,
                    ' items',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'cat-list',
                    tabIndex: 0,
                    onKeyDown: onListKey,
                    role: 'listbox',
                    'aria-label': 'Catalog items',
                  },
                  results.length === 0
                    ? /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          style: {
                            padding: 'var(--space-8)',
                            textAlign: 'center',
                            color: 'var(--text-faint)',
                            fontSize: 'var(--text-sm)',
                          },
                        },
                        'No catalog items match.',
                      )
                    : results.map((c, i) => {
                        const cat = window.StationInv.INV_CATEGORIES.find(
                          (x) => x.id === c.categoryId,
                        );
                        return /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            key: c.uexId,
                            className:
                              'cat-opt' +
                              (sel && sel.uexId === c.uexId ? ' sel' : ''),
                            tabIndex: -1,
                            role: 'option',
                            'aria-selected': sel && sel.uexId === c.uexId,
                            onClick: () => {
                              setSel(c);
                              setHi(i);
                            },
                          },
                          /*#__PURE__*/ React.createElement('span', {
                            className: 'radio',
                          }),
                          /*#__PURE__*/ React.createElement('span', {
                            className: 'catdot',
                            style: {
                              background: cat.color,
                              alignSelf: 'center',
                            },
                          }),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              style: {
                                flex: 1,
                              },
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'nm',
                              },
                              c.name,
                            ),
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'ct',
                              },
                              cat.name,
                            ),
                          ),
                        );
                      }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'catalog-foot',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'tip',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2318'),
                  /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
                ),
                ' add & keep open \xB7 ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
                ),
                ' browse',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  onClick: onClose,
                },
                'Cancel',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  disabled: !ready,
                  onClick: () => submit(true),
                },
                'Add & stay',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  disabled: !ready,
                  onClick: () => submit(false),
                },
                /*#__PURE__*/ React.createElement(II, {
                  n: 'check',
                }),
                ' Add & close',
              ),
            ),
          ),
        );
      }
      function InventoryApp() {
        const commands = [
          {
            id: 'inv-add',
            group: 'Inventory',
            icon: 'plus',
            label: 'Add inventory item',
            hint: 'n',
            run: () =>
              window.__toast && window.__toast('Opening catalog', 'plus'),
          },
          {
            id: 'inv-personal',
            group: 'Inventory',
            icon: 'user-round',
            label: 'View personal inventory',
            run: () => window.__toast && window.__toast('Personal inventory'),
          },
          {
            id: 'inv-org',
            group: 'Inventory',
            icon: 'building-2',
            label: 'View org inventory',
            run: () => window.__toast && window.__toast('Org inventory'),
          },
          {
            id: 'inv-editor',
            group: 'Inventory',
            icon: 'pencil-ruler',
            label: 'Toggle editor mode',
            run: () => window.__toast && window.__toast('Editor mode'),
          },
        ];
        const helpExtra = [
          ['Add item', ['n']],
          ['Switch view', ['←', '→']],
          ['Inline edit qty', ['↵']],
          ['Add & keep open', ['⌘', '↵']],
        ];
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'inventory',
            commands: commands,
            helpExtra: helpExtra,
            onNew: () => {
              const b = document.getElementById('inv-new');
              if (b) b.click();
            },
            searchPlaceholder: 'Search items, categories\u2026',
          },
          /*#__PURE__*/ React.createElement(InventoryPage, null),
        );
      }
      window.InventoryApp = InventoryApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/Inventory.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/Members.jsx
  try {
    (() => {
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
        Mining: {
          icon: 'gem',
          tint: 'role-mining',
        },
        Salvage: {
          icon: 'recycle',
          tint: 'role-salvage',
        },
        Security: {
          icon: 'crosshair',
          tint: 'role-combat',
        },
        Logistics: {
          icon: 'container',
          tint: 'role-hauling',
        },
        Medical: {
          icon: 'cross',
          tint: 'role-medical',
        },
        Industry: {
          icon: 'factory',
          tint: 'role-explore',
        },
      };
      const STATUS = {
        Active: {
          tone: 'success',
          icon: 'circle-check',
        },
        Recruit: {
          tone: 'info',
          icon: 'user-plus',
        },
        'On leave': {
          tone: 'warn',
          icon: 'pause',
        },
        Inactive: {
          tone: 'neutral',
          icon: 'moon',
        },
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
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': selected,
            onClick: onSelect,
            onFocus: onSelect,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'av-wrap',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'r-av',
                    style: {
                      background: window.avColor(m.name),
                    },
                  },
                  initials(m.name),
                  /*#__PURE__*/ React.createElement('span', {
                    className: 'pres ' + m.presence,
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  m.name,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sub',
                  },
                  m.handle,
                  ' \xB7 ',
                  m.id,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'rank ' + rankCls(m.rank),
              },
              m.rank,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'divc',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'di ' + div.tint,
                },
                /*#__PURE__*/ React.createElement(MI, {
                  n: div.icon,
                }),
              ),
              m.division,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              StatusPill,
              {
                tone: st.tone,
                icon: st.icon,
              },
              m.status,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 't-muted t-mono',
              style: {
                fontSize: 'var(--text-xs)',
              },
            },
            m.lastSeen,
          ),
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
        const set = (k, v) =>
          setDraft((d) => ({
            ...d,
            [k]: v,
          }));
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
        const trustLabel = {
          trusted: 'Trusted',
          verified: 'Verified',
          new: 'New',
        }[cur.trust];
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'panel detail',
          },
          editing &&
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'hr-bar',
              },
              /*#__PURE__*/ React.createElement(MI, {
                n: 'pencil',
              }),
              ' Editing as ',
              /*#__PURE__*/ React.createElement(
                'strong',
                null,
                '\xA0HR / Leadership',
              ),
              /*#__PURE__*/ React.createElement('span', {
                className: 'grow',
              }),
              'changes are logged',
            ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'mem-hero',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'av',
                  style: {
                    background: window.avColor(cur.name),
                  },
                },
                initials(cur.name),
                /*#__PURE__*/ React.createElement('span', {
                  className: 'pres ' + cur.presence,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'h',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  cur.name,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'hd',
                  },
                  cur.handle,
                  ' \xB7 ',
                  cur.discord,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'rank ' + rankCls(cur.rank),
                },
                cur.rank,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'mstats',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'mstat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                  },
                  cur.ops,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Ops attended',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'mstat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                    style: {
                      textTransform: 'capitalize',
                    },
                  },
                  trustLabel,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Trust',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'mstat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                  },
                  cur.joined.slice(0, 4),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Member since',
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                null,
                'Role & assignment',
              ),
            ),
            editing
              ? /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'fgrid',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'fctl',
                      },
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'fl',
                        },
                        /*#__PURE__*/ React.createElement(MI, {
                          n: 'shield',
                        }),
                        ' Rank',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'select',
                        {
                          value: draft.rank,
                          onChange: (e) => set('rank', e.target.value),
                        },
                        RANKS.map((r) =>
                          /*#__PURE__*/ React.createElement(
                            'option',
                            {
                              key: r,
                            },
                            r,
                          ),
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'fctl',
                      },
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'fl',
                        },
                        /*#__PURE__*/ React.createElement(MI, {
                          n: 'git-branch',
                        }),
                        ' Division',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'select',
                        {
                          value: draft.division,
                          onChange: (e) => set('division', e.target.value),
                        },
                        Object.keys(DIVISIONS).map((d) =>
                          /*#__PURE__*/ React.createElement(
                            'option',
                            {
                              key: d,
                            },
                            d,
                          ),
                        ),
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'fgrid',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'fctl',
                      },
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'fl',
                        },
                        /*#__PURE__*/ React.createElement(MI, {
                          n: 'activity',
                        }),
                        ' Status',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'select',
                        {
                          value: draft.status,
                          onChange: (e) => set('status', e.target.value),
                        },
                        Object.keys(STATUS).map((s) =>
                          /*#__PURE__*/ React.createElement(
                            'option',
                            {
                              key: s,
                            },
                            s,
                          ),
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'fctl',
                      },
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'fl',
                        },
                        /*#__PURE__*/ React.createElement(MI, {
                          n: 'rocket',
                        }),
                        ' Primary ship',
                      ),
                      /*#__PURE__*/ React.createElement('input', {
                        value: draft.ship,
                        onChange: (e) => set('ship', e.target.value),
                      }),
                    ),
                  ),
                )
              : /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'kv',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'k',
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'git-branch',
                      }),
                      ' Division',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'v',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'divc',
                        },
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'di ' + div.tint,
                          },
                          /*#__PURE__*/ React.createElement(MI, {
                            n: div.icon,
                          }),
                        ),
                        cur.division,
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'kv',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'k',
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'activity',
                      }),
                      ' Status',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'v',
                      },
                      /*#__PURE__*/ React.createElement(
                        StatusPill,
                        {
                          tone: st.tone,
                          icon: st.icon,
                        },
                        cur.status,
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'kv',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'k',
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'rocket',
                      }),
                      ' Primary ship',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'v',
                      },
                      cur.ship,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'kv',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'k',
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'globe',
                      }),
                      ' Region',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'v',
                      },
                      cur.region,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'kv',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'k',
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: trustIcon,
                      }),
                      ' Trust',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'v',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'trust ' + cur.trust,
                        },
                        /*#__PURE__*/ React.createElement(MI, {
                          n: trustIcon,
                        }),
                        trustLabel,
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'kv',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'k',
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'clock',
                      }),
                      ' Last seen',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'v t-mono',
                        style: {
                          fontWeight: 400,
                          color: 'var(--text-muted)',
                        },
                      },
                      cur.lastSeen,
                    ),
                  ),
                ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                null,
                'Certifications \xB7 ',
                cur.certs.length,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'cert-wrap',
              },
              cur.certs.map((c) =>
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'cert',
                    key: c,
                  },
                  /*#__PURE__*/ React.createElement(MI, {
                    n: 'award',
                  }),
                  c,
                  editing &&
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'rm',
                        'aria-label': 'Remove ' + c,
                        onClick: () => rmCert(c),
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'x',
                      }),
                    ),
                ),
              ),
              editing &&
                ALL_CERTS.filter((c) => !draft.certs.includes(c))
                  .slice(0, 3)
                  .map((c) =>
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'cert-add',
                        key: c,
                        onClick: () => addCert(c),
                      },
                      /*#__PURE__*/ React.createElement(MI, {
                        n: 'plus',
                      }),
                      c,
                    ),
                  ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'detail-section',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ds-cap',
              },
              /*#__PURE__*/ React.createElement('span', null, 'HR notes'),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                  style: {
                    color: 'var(--warning-500)',
                  },
                },
                /*#__PURE__*/ React.createElement('kbd', null, 'HR only'),
              ),
            ),
            editing
              ? /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'fctl',
                  },
                  /*#__PURE__*/ React.createElement('textarea', {
                    value: draft.note,
                    onChange: (e) => set('note', e.target.value),
                    placeholder:
                      'Private note visible to HR & leadership\u2026',
                  }),
                )
              : /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'hr-note',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'lock',
                    },
                    /*#__PURE__*/ React.createElement(MI, {
                      n: 'lock',
                    }),
                    ' Visible to HR & leadership',
                  ),
                  cur.note,
                ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'panel-body',
              style: {
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 'var(--space-3)',
              },
            },
            editing
              ? /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'btn btn-ghost btn-sm',
                      onClick: cancel,
                      style: {
                        flex: 1,
                      },
                    },
                    'Cancel',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'btn btn-primary btn-sm',
                      onClick: save,
                      style: {
                        flex: 1,
                      },
                    },
                    /*#__PURE__*/ React.createElement(MI, {
                      n: 'check',
                    }),
                    ' Save record',
                  ),
                )
              : /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'btn btn-primary btn-sm',
                      onClick: () => setEditing(true),
                      style: {
                        flex: 1,
                      },
                    },
                    /*#__PURE__*/ React.createElement(MI, {
                      n: 'pencil',
                    }),
                    ' Edit record',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'btn btn-ghost btn-sm',
                      style: {
                        flex: 1,
                      },
                    },
                    /*#__PURE__*/ React.createElement(MI, {
                      n: 'message-circle',
                    }),
                    ' Message',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'btn btn-ghost btn-sm',
                      'aria-label': 'More',
                    },
                    /*#__PURE__*/ React.createElement(MI, {
                      n: 'more-horizontal',
                    }),
                  ),
                ),
          ),
        );
      }

      // ---- page ----
      function MembersPage() {
        const [members, setMembers] = React.useState(MEMBERS);
        const [div, setDiv] = React.useState('all');
        const visible = React.useMemo(
          () =>
            div === 'all' ? members : members.filter((m) => m.division === div),
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
          setMembers((arr) =>
            arr.map((m) => (m.id === updated.id ? updated : m)),
          );
        const active = members.filter((m) => m.status === 'Active').length;
        const recruits = members.filter((m) => m.status === 'Recruit').length;
        const leave = members.filter((m) => m.status === 'On leave').length;
        const flagged = members.filter((m) => m.status === 'Inactive').length;
        const filters = [
          {
            value: 'all',
            label: 'All',
            count: members.length,
          },
          ...Object.keys(DIVISIONS).map((d) => ({
            value: d,
            label: d,
            icon: DIVISIONS[d].icon,
          })),
        ];
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(MI, {
                  n: 'users',
                }),
                ' Operations ',
                /*#__PURE__*/ React.createElement(MI, {
                  n: 'chevron-right',
                }),
                ' Members',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'Members',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                'The org roster \u2014 ranks, divisions, certifications, and HR records. Leadership and HR can view and update any member.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                },
                /*#__PURE__*/ React.createElement(MI, {
                  n: 'download',
                }),
                ' Export roster',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  id: 'mem-new',
                },
                /*#__PURE__*/ React.createElement(MI, {
                  n: 'user-plus',
                }),
                ' Invite member ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                    style: {
                      marginLeft: 6,
                    },
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
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
            ],
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'roster-bar',
            },
            /*#__PURE__*/ React.createElement(Segmented, {
              options: filters,
              value: div,
              onChange: setDiv,
              ariaLabel: 'Filter members by division',
            }),
            /*#__PURE__*/ React.createElement('span', {
              className: 'grow',
            }),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'chips',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(MI, {
                  n: 'arrow-down-up',
                }),
                ' Sort: Rank',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(MI, {
                  n: 'filter',
                }),
                ' Status',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'split',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'dtable-wrap',
              },
              /*#__PURE__*/ React.createElement(
                'table',
                {
                  className: 'dtable',
                  role: 'grid',
                  'aria-label': 'Member roster',
                  onKeyDown: roving.onKeyDown,
                },
                /*#__PURE__*/ React.createElement(
                  'thead',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'tr',
                    null,
                    /*#__PURE__*/ React.createElement('th', null, 'Member'),
                    /*#__PURE__*/ React.createElement('th', null, 'Rank'),
                    /*#__PURE__*/ React.createElement('th', null, 'Division'),
                    /*#__PURE__*/ React.createElement('th', null, 'Status'),
                    /*#__PURE__*/ React.createElement('th', null, 'Last seen'),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'tbody',
                  null,
                  visible.map((m, i) =>
                    /*#__PURE__*/ React.createElement(MemberRow, {
                      key: m.id,
                      m: m,
                      selected: m.id === selId,
                      tabIndex: roving.getTab(i),
                      regRef: roving.register(i),
                      onSelect: () => {
                        setSelId(m.id);
                        roving.setIdx(i);
                      },
                    }),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'list-hint',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                  /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
                ),
                ' move ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
                ),
                ' open ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    style: {
                      marginLeft: 'auto',
                    },
                  },
                  visible.length,
                  ' of ',
                  members.length,
                  ' members',
                ),
              ),
            ),
            sel &&
              /*#__PURE__*/ React.createElement(MemberDetail, {
                m: sel,
                onSave: onSave,
              }),
          ),
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
            run: () =>
              window.__toast && window.__toast('Invite sent', 'user-plus'),
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
              window.__toast &&
              window.__toast('Showing inactive members', 'flag'),
          },
        ];
        const helpExtra = [
          ['Invite member', ['n']],
          ['Filter division', ['←', '→']],
          ['Open record', ['↵']],
          ['Toggle theme', ['t']],
        ];
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'members',
            commands: commands,
            helpExtra: helpExtra,
            onNew: () =>
              window.__toast &&
              window.__toast('Invite a new member', 'user-plus'),
            searchPlaceholder: 'Search members, handles, certs\u2026',
          },
          /*#__PURE__*/ React.createElement(MembersPage, null),
        );
      }
      window.MembersApp = MembersApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/Members.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/Profile.jsx
  try {
    (() => {
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
        username: LOGIN_USERNAME,
        // Station login — locked
        email: 'hez@atlasvanguard.org',
        // locked
        ign: LOGIN_USERNAME,
        // in-game name — defaults to username
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
        socialVerified: {
          discord: true,
          rsi: true,
        },
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
        const set = (k, v) =>
          setDraft((d) => ({
            ...d,
            [k]: v,
          }));
        const setSoc = (k, v) =>
          setDraft((d) => ({
            ...d,
            socials: {
              ...d.socials,
              [k]: v,
            },
          }));
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
          const fixed = {
            ...draft,
            ign: (draft.ign || '').trim() || cur.username,
          };
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
        const fullName = [cur.firstName, cur.lastName]
          .filter(Boolean)
          .join(' ');
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(PI, {
                  n: 'user-round',
                }),
                ' Account ',
                /*#__PURE__*/ React.createElement(PI, {
                  n: 'chevron-right',
                }),
                ' My Profile',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'My Profile',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                'Your identity across Station \u2014 in-game name, bio, social connections, and the organizations you belong to. This is how the rest of the org sees you.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              editing
                ? /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'pf-savebar',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'hint',
                      },
                      /*#__PURE__*/ React.createElement(PI, {
                        n: 'circle-dot',
                      }),
                      ' Unsaved changes',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-ghost btn-sm',
                        onClick: cancel,
                      },
                      'Cancel ',
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'kbd',
                          style: {
                            marginLeft: 4,
                          },
                        },
                        /*#__PURE__*/ React.createElement('kbd', null, 'Esc'),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-primary btn-sm',
                        onClick: save,
                      },
                      /*#__PURE__*/ React.createElement(PI, {
                        n: 'check',
                      }),
                      ' Save changes',
                    ),
                  )
                : /*#__PURE__*/ React.createElement(
                    React.Fragment,
                    null,
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-ghost btn-sm',
                      },
                      /*#__PURE__*/ React.createElement(PI, {
                        n: 'share-2',
                      }),
                      ' Share profile',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-primary btn-sm',
                        id: 'pf-edit',
                        onClick: startEdit,
                      },
                      /*#__PURE__*/ React.createElement(PI, {
                        n: 'pencil',
                      }),
                      ' Edit profile ',
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'kbd',
                          style: {
                            marginLeft: 6,
                          },
                        },
                        /*#__PURE__*/ React.createElement('kbd', null, 'e'),
                      ),
                    ),
                  ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pf-hero',
            },
            /*#__PURE__*/ React.createElement('div', {
              className: 'pf-cover',
            }),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'pf-body',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pf-av',
                  style: {
                    background: window.avColor(cur.username),
                  },
                },
                initials(cur.ign),
                /*#__PURE__*/ React.createElement('span', {
                  className: 'pres ' + cur.presence,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pf-id',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'pf-name',
                  },
                  cur.ign,
                  ' ',
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'rank ' + rankCls(cur.rank),
                    },
                    cur.rank,
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'pf-handle',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    '@',
                    cur.username,
                  ),
                  cur.pronouns &&
                    /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'dot',
                        },
                        '\xB7',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'muted',
                        },
                        cur.pronouns,
                      ),
                    ),
                  fullName &&
                    /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'dot',
                        },
                        '\xB7',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'muted',
                        },
                        fullName,
                      ),
                    ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'pf-meta',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'mi',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'shield',
                    }),
                    primaryOrg.name,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'mi',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'map-pin',
                    }),
                    cur.region,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'mi',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'languages',
                    }),
                    cur.language,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'mi',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'calendar',
                    }),
                    'Joined ',
                    cur.joined.slice(0, 4),
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'pf-stats',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pf-stat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                  },
                  cur.ops,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Ops attended',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pf-stat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                  },
                  cur.hoursLogged,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Hours logged',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pf-stat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                  },
                  MY_ORGS.length,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Organizations',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pf-stat',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'v',
                  },
                  new Date().getFullYear() +
                    930 -
                    Number(cur.joined.slice(0, 4)),
                  'y',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'k',
                  },
                  'Years in service',
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pf-grid',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'file-text',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'About',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  editing
                    ? /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'fctl',
                        },
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'fl',
                          },
                          /*#__PURE__*/ React.createElement(PI, {
                            n: 'file-text',
                          }),
                          ' Bio',
                        ),
                        /*#__PURE__*/ React.createElement('textarea', {
                          value: draft.bio,
                          maxLength: 600,
                          onChange: (e) => set('bio', e.target.value),
                          style: {
                            minHeight: 150,
                          },
                          placeholder:
                            'Tell the org about yourself, your playstyle, and what you fly\u2026',
                        }),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'charcount',
                          },
                          draft.bio.length,
                          '/600',
                        ),
                      )
                    : /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'pf-bio' + (cur.bio ? '' : ' empty'),
                        },
                        cur.bio || 'No bio yet. Click Edit profile to add one.',
                      ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                  style: {
                    marginTop: 'var(--space-5)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'id-card',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Identity & contact',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  editing
                    ? /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'fctl',
                          },
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fl',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'gamepad-2',
                            }),
                            ' In-game name (IGN)',
                          ),
                          /*#__PURE__*/ React.createElement('input', {
                            value: draft.ign,
                            onChange: (e) => set('ign', e.target.value),
                            placeholder: cur.username,
                          }),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'charcount',
                              style: {
                                textAlign: 'left',
                                marginTop: 5,
                                fontStyle: 'italic',
                              },
                            },
                            'Defaults to your Station username \u201C',
                            cur.username,
                            '\u201D if left blank.',
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'fgrid',
                          },
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fctl',
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'fl',
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: 'user',
                              }),
                              ' First name',
                            ),
                            /*#__PURE__*/ React.createElement('input', {
                              value: draft.firstName,
                              onChange: (e) => set('firstName', e.target.value),
                            }),
                          ),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fctl',
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'fl',
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: 'user',
                              }),
                              ' Last name',
                            ),
                            /*#__PURE__*/ React.createElement('input', {
                              value: draft.lastName,
                              onChange: (e) => set('lastName', e.target.value),
                            }),
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'fgrid',
                          },
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fctl',
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'fl',
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: 'venetian-mask',
                              }),
                              ' Pronouns',
                            ),
                            /*#__PURE__*/ React.createElement('input', {
                              value: draft.pronouns,
                              onChange: (e) => set('pronouns', e.target.value),
                              placeholder: 'he/him',
                            }),
                          ),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fctl',
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'fl',
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: 'phone',
                              }),
                              ' Phone',
                            ),
                            /*#__PURE__*/ React.createElement('input', {
                              value: draft.phone,
                              onChange: (e) => set('phone', e.target.value),
                              placeholder: '+1 555 0000',
                            }),
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'fgrid',
                          },
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fctl',
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'fl',
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: 'map-pin',
                              }),
                              ' Region / timezone',
                            ),
                            /*#__PURE__*/ React.createElement('input', {
                              value: draft.region,
                              onChange: (e) => set('region', e.target.value),
                            }),
                          ),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'fctl',
                            },
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'fl',
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: 'languages',
                              }),
                              ' Languages',
                            ),
                            /*#__PURE__*/ React.createElement('input', {
                              value: draft.language,
                              onChange: (e) => set('language', e.target.value),
                            }),
                          ),
                        ),
                      )
                    : /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'kv',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'k',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'gamepad-2',
                            }),
                            ' In-game name',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'v',
                            },
                            cur.ign,
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'kv',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'k',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'user',
                            }),
                            ' Real name',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'v',
                            },
                            fullName || '—',
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'kv',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'k',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'venetian-mask',
                            }),
                            ' Pronouns',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'v',
                            },
                            cur.pronouns || '—',
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'kv',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'k',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'map-pin',
                            }),
                            ' Region',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'v',
                            },
                            cur.region,
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'kv',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'k',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'languages',
                            }),
                            ' Languages',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'v',
                            },
                            cur.language,
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'kv',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'k',
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: 'phone',
                            }),
                            ' Phone',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'v t-mono',
                              style: {
                                fontWeight: 400,
                                color: 'var(--text-muted)',
                              },
                            },
                            cur.phone,
                          ),
                        ),
                      ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                  style: {
                    marginTop: 'var(--space-5)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'link',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Social connections',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  editing
                    ? SOCIALS.map((s) =>
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'soc-edit',
                            key: s.key,
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'soc-ic ' + s.cls,
                            },
                            /*#__PURE__*/ React.createElement(PI, {
                              n: s.icon,
                            }),
                          ),
                          /*#__PURE__*/ React.createElement('input', {
                            value: draft.socials[s.key] || '',
                            onChange: (e) => setSoc(s.key, e.target.value),
                            placeholder: s.net + ' — ' + s.placeholder,
                            'aria-label': s.net,
                          }),
                        ),
                      )
                    : /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'soc-list',
                        },
                        SOCIALS.map((s) => {
                          const val = cur.socials[s.key];
                          const verified =
                            cur.socialVerified && cur.socialVerified[s.key];
                          return /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'soc-row',
                              key: s.key,
                            },
                            /*#__PURE__*/ React.createElement(
                              'span',
                              {
                                className: 'soc-ic ' + s.cls,
                              },
                              /*#__PURE__*/ React.createElement(PI, {
                                n: s.icon,
                              }),
                            ),
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'soc-info',
                              },
                              /*#__PURE__*/ React.createElement(
                                'div',
                                {
                                  className: 'soc-net',
                                },
                                s.net,
                                ' ',
                                verified &&
                                  /*#__PURE__*/ React.createElement(
                                    'span',
                                    {
                                      className: 'soc-verified',
                                    },
                                    /*#__PURE__*/ React.createElement(PI, {
                                      n: 'badge-check',
                                    }),
                                    ' verified',
                                  ),
                              ),
                              /*#__PURE__*/ React.createElement(
                                'div',
                                {
                                  className: 'soc-val' + (val ? '' : ' empty'),
                                },
                                val
                                  ? s.prefix
                                    ? s.prefix + val
                                    : val
                                  : 'Not connected',
                              ),
                            ),
                            val &&
                              /*#__PURE__*/ React.createElement(
                                'button',
                                {
                                  className: 'soc-go',
                                  'aria-label': 'Open ' + s.net,
                                },
                                /*#__PURE__*/ React.createElement(PI, {
                                  n: 'external-link',
                                }),
                              ),
                          );
                        }),
                      ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'users',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Organizations',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 't-mono t-muted',
                      style: {
                        fontSize: 'var(--text-xs)',
                      },
                    },
                    MY_ORGS.length,
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  MY_ORGS.map((o) => {
                    const isPrimary =
                      o.id === (editing ? draft.primaryOrg : cur.primaryOrg);
                    return /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'org-card' + (isPrimary ? ' primary' : ''),
                        key: o.id,
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'org-logo',
                          style: {
                            background: o.grad,
                          },
                        },
                        o.sid.slice(0, 2),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'org-info',
                        },
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'org-nm',
                          },
                          o.name,
                          ' ',
                          isPrimary &&
                            /*#__PURE__*/ React.createElement(
                              'span',
                              {
                                className: 'org-primary-badge',
                              },
                              'Primary',
                            ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'org-meta',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            null,
                            o.role,
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'sep',
                            },
                            '\xB7',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            null,
                            o.members,
                            ' members',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'sep',
                            },
                            '\xB7',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            null,
                            'since ',
                            o.since,
                          ),
                        ),
                      ),
                      editing &&
                        !isPrimary &&
                        /*#__PURE__*/ React.createElement(
                          'button',
                          {
                            className: 'org-leave',
                            title: 'Set as primary',
                            'aria-label': 'Set ' + o.name + ' as primary',
                            onClick: () => set('primaryOrg', o.id),
                          },
                          /*#__PURE__*/ React.createElement(PI, {
                            n: 'star',
                          }),
                        ),
                    );
                  }),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'btn btn-ghost btn-sm',
                      style: {
                        width: '100%',
                        marginTop: 'var(--space-3)',
                      },
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'plus',
                    }),
                    ' Find organizations',
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                  style: {
                    marginTop: 'var(--space-5)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'shield-check',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Account & security',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'fctl',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'fl',
                      },
                      /*#__PURE__*/ React.createElement(PI, {
                        n: 'at-sign',
                      }),
                      ' Station username',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'locked-field',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'lv',
                        },
                        cur.username,
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'lock',
                        },
                        /*#__PURE__*/ React.createElement(PI, {
                          n: 'lock',
                        }),
                        ' Permanent',
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'fctl',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'fl',
                      },
                      /*#__PURE__*/ React.createElement(PI, {
                        n: 'mail',
                      }),
                      ' Email',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'locked-field',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'lv',
                        },
                        cur.email,
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'lock',
                        },
                        /*#__PURE__*/ React.createElement(PI, {
                          n: 'lock',
                        }),
                        ' Verified',
                      ),
                    ),
                  ),
                  !pwOpen
                    ? /*#__PURE__*/ React.createElement(
                        'button',
                        {
                          className: 'btn btn-ghost btn-sm',
                          style: {
                            width: '100%',
                          },
                          onClick: () => setPwOpen(true),
                        },
                        /*#__PURE__*/ React.createElement(PI, {
                          n: 'key-round',
                        }),
                        ' Change password',
                      )
                    : /*#__PURE__*/ React.createElement(PasswordForm, {
                        onClose: () => setPwOpen(false),
                        onSave: () => {
                          setPwOpen(false);
                          toast('Password changed', 'shield-check');
                        },
                      }),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'sec-note',
                    },
                    /*#__PURE__*/ React.createElement(PI, {
                      n: 'info',
                    }),
                    " Your username and email are tied to your Station account and can't be changed here. Contact an org admin for account recovery.",
                  ),
                ),
              ),
            ),
          ),
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
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            style: {
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              background: 'var(--surface-sunken)',
            },
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'fctl',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'fl',
              },
              /*#__PURE__*/ React.createElement(PI, {
                n: 'lock',
              }),
              ' Current password',
            ),
            /*#__PURE__*/ React.createElement('input', {
              type: 'password',
              value: cu,
              onChange: (e) => setCu(e.target.value),
              autoFocus: true,
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'fctl',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'fl',
              },
              /*#__PURE__*/ React.createElement(PI, {
                n: 'key-round',
              }),
              ' New password',
            ),
            /*#__PURE__*/ React.createElement('input', {
              type: 'password',
              value: nu,
              onChange: (e) => setNu(e.target.value),
            }),
            tooShort &&
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'charcount',
                  style: {
                    textAlign: 'left',
                    color: 'var(--coral-400)',
                  },
                },
                'At least 6 characters',
              ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'fctl',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'fl',
              },
              /*#__PURE__*/ React.createElement(PI, {
                n: 'key-round',
              }),
              ' Confirm new password',
            ),
            /*#__PURE__*/ React.createElement('input', {
              type: 'password',
              value: cf,
              onChange: (e) => setCf(e.target.value),
            }),
            mismatch &&
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'charcount',
                  style: {
                    textAlign: 'left',
                    color: 'var(--coral-400)',
                  },
                },
                "Passwords don't match",
              ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: 'var(--space-3)',
              },
            },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-ghost btn-sm',
                style: {
                  flex: 1,
                },
                onClick: onClose,
              },
              'Cancel',
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-primary btn-sm',
                style: {
                  flex: 1,
                },
                disabled: !ready,
                onClick: onSave,
              },
              /*#__PURE__*/ React.createElement(PI, {
                n: 'check',
              }),
              ' Update password',
            ),
          ),
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
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'profile',
            commands: commands,
            helpExtra: helpExtra,
            onNew: () => {
              const b = document.getElementById('pf-edit');
              if (b) b.click();
            },
            searchPlaceholder: 'Search Station\u2026',
          },
          /*#__PURE__*/ React.createElement(ProfilePage, null),
        );
      }
      window.ProfileApp = ProfileApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/Profile.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/Treasury.jsx
  try {
    (() => {
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
        mining: {
          label: 'Mining payout',
          color: 'var(--aqua-400)',
          dir: 'in',
        },
        contract: {
          label: 'Contract reward',
          color: 'var(--warning-500)',
          dir: 'in',
        },
        salvage: {
          label: 'Salvage sale',
          color: '#C879D8',
          dir: 'in',
        },
        trade: {
          label: 'Trade profit',
          color: 'var(--success-500)',
          dir: 'in',
        },
        dues: {
          label: 'Member dues',
          color: 'var(--teal-400)',
          dir: 'in',
        },
        donation: {
          label: 'Donation',
          color: 'var(--success-500)',
          dir: 'in',
        },
        ship: {
          label: 'Ship purchase',
          color: 'var(--coral-400)',
          dir: 'out',
        },
        fees: {
          label: 'Refinery fees',
          color: 'var(--coral-400)',
          dir: 'out',
        },
        payout: {
          label: 'Member payout',
          color: 'var(--coral-400)',
          dir: 'out',
        },
        repair: {
          label: 'Repairs',
          color: 'var(--coral-400)',
          dir: 'out',
        },
        bail: {
          label: 'Bail posted',
          color: '#D9A6E6',
          dir: 'out',
        },
        fine: {
          label: 'Fine / penalty',
          color: 'var(--coral-400)',
          dir: 'out',
        },
        bounty: {
          label: 'Bounty earned',
          color: 'var(--success-500)',
          dir: 'in',
        },
        transfer: {
          label: 'Transfer',
          color: 'var(--teal-300)',
          dir: 'xfer',
        },
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
        return /*#__PURE__*/ React.createElement(
          'span',
          {
            className: 'cur-badge ' + c.cls,
          },
          /*#__PURE__*/ React.createElement(TI, {
            n: c.icon,
          }),
          c.label,
        );
      }

      // ---- account card ----
      function AcctCard({ a, balance, active, onSelect }) {
        const spark = [40, 55, 48, 70, 62, 85, 78, 96];
        return /*#__PURE__*/ React.createElement(
          'button',
          {
            className: 'acct-card' + (active ? ' active' : ''),
            onClick: onSelect,
            'aria-pressed': active,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'top',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'ic ' + a.tint,
              },
              /*#__PURE__*/ React.createElement(TI, {
                n: a.icon,
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'nm',
                },
                a.name,
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'ty',
                },
                a.typeLabel,
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'bal',
            },
            abbr(balance),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'cur',
              },
              CURRENCY[a.currency].label,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'spark',
            },
            spark.map((h, i) =>
              /*#__PURE__*/ React.createElement('i', {
                key: i,
                style: {
                  height: h + '%',
                  background: active ? 'var(--brand)' : undefined,
                },
              }),
            ),
          ),
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
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': selected,
            onFocus: onFocus,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'led-ic ' + icCls,
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: icName,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'led-desc',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'd',
                  },
                  tx.desc,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'm',
                  },
                  tx.member,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'led-cat',
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'cdot',
                style: {
                  background: cat.color,
                },
              }),
              cat.label,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 't-muted t-mono',
              style: {
                fontSize: 'var(--text-xs)',
              },
            },
            tx.date.slice(5),
            ' \xB7 ',
            tx.t,
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'amt ' + (tx.amount >= 0 ? 'pos' : 'neg'),
            },
            moneySigned(tx.amount),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'run',
            },
            money(running),
          ),
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
          return filtered.map((tx) => ({
            tx,
            running: fullRun[tx.id],
          }));
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
          setBalances((b) => ({
            ...b,
            [selId]: b[selId] + signed,
          }));
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
          setLedgers((L) => ({
            ...L,
            [id]: [],
          }));
          setBalances((b) => ({
            ...b,
            [id]: Number(acc.starting) || 0,
          }));
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
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'landmark',
                }),
                ' Assets ',
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'chevron-right',
                }),
                ' Treasury',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'Treasury',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                "Track the org's accounts and ledgers \u2014 a main treasury plus division accounts and funds, each in its own currency. Record income, expenses, and transfers.",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  onClick: () => setDialog('account'),
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'plus',
                }),
                ' New account',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  id: 'trez-new',
                  onClick: () => setDialog('tx'),
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'arrow-left-right',
                }),
                ' New transaction ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                    style: {
                      marginLeft: 6,
                    },
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
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
            ],
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'acct-strip',
            },
            accounts.map((a) =>
              /*#__PURE__*/ React.createElement(AcctCard, {
                key: a.id,
                a: a,
                balance: balances[a.id],
                active: a.id === selId,
                onSelect: () => setSelId(a.id),
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'acct-add',
                onClick: () => setDialog('account'),
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'pl',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'plus',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'lbl',
                },
                'Add account',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'acct-head',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'big-ic ' + sel.tint,
              },
              /*#__PURE__*/ React.createElement(TI, {
                n: sel.icon,
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'h',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 't',
                },
                sel.name,
                ' ',
                /*#__PURE__*/ React.createElement(CurBadge, {
                  currency: sel.currency,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 's',
                },
                sel.desc,
                ' \xB7 Managed by ',
                sel.lead,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'bal-big',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'k',
                },
                'Current balance',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'v',
                },
                money(balances[selId]),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'cur',
                  },
                  curLabel,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
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
            ],
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'ledger-toolbar',
            },
            /*#__PURE__*/ React.createElement(
              'label',
              {
                className: 'inv-search',
              },
              /*#__PURE__*/ React.createElement(TI, {
                n: 'search',
              }),
              /*#__PURE__*/ React.createElement('input', {
                value: search,
                placeholder: 'Search ledger\u2026',
                onChange: (e) => setSearch(e.target.value),
                'aria-label': 'Search ledger',
              }),
            ),
            /*#__PURE__*/ React.createElement('span', {
              className: 'grow',
            }),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'chips',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'filter',
                }),
                ' All categories',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'download',
                }),
                ' Export CSV',
              ),
            ),
          ),
          rows.length === 0
            ? /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'dtable-wrap',
                  style: {
                    marginTop: 'var(--space-5)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'ledger-empty',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'e-ic',
                    },
                    /*#__PURE__*/ React.createElement(TI, {
                      n: 'receipt',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'h3',
                    null,
                    search
                      ? 'No entries match your search'
                      : 'No transactions yet',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'p',
                    null,
                    search
                      ? 'Try a different term.'
                      : 'Record income, an expense, or a transfer to start this ledger.',
                  ),
                ),
              )
            : /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'dtable-wrap',
                  style: {
                    marginTop: 'var(--space-5)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'table',
                  {
                    className: 'dtable led-table',
                    role: 'grid',
                    'aria-label': sel.name + ' ledger',
                    onKeyDown: roving.onKeyDown,
                  },
                  /*#__PURE__*/ React.createElement(
                    'thead',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'tr',
                      null,
                      /*#__PURE__*/ React.createElement(
                        'th',
                        null,
                        'Transaction',
                      ),
                      /*#__PURE__*/ React.createElement('th', null, 'Category'),
                      /*#__PURE__*/ React.createElement('th', null, 'Date'),
                      /*#__PURE__*/ React.createElement(
                        'th',
                        {
                          className: 'num',
                        },
                        'Amount',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'th',
                        {
                          className: 'num',
                        },
                        'Balance',
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'tbody',
                    null,
                    rows.map(({ tx, running }, i) =>
                      /*#__PURE__*/ React.createElement(LedgerRow, {
                        key: tx.id,
                        tx: tx,
                        currency: sel.currency,
                        running: running,
                        tabIndex: roving.getTab(i),
                        regRef: roving.register(i),
                        onFocus: () => roving.setIdx(i),
                        selected: roving.idx === i,
                      }),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'list-hint',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'kbd',
                    },
                    /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                    /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
                  ),
                  ' move',
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'kbd',
                    },
                    /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                  ),
                  ' new transaction',
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      style: {
                        marginLeft: 'auto',
                      },
                    },
                    rows.length,
                    ' of ',
                    ledger.length,
                    ' entries \xB7 all amounts in ',
                    curLabel,
                  ),
                ),
              ),
          dialog === 'tx' &&
            /*#__PURE__*/ React.createElement(TxDialog, {
              account: sel,
              onClose: () => setDialog(null),
              onSave: addTx,
            }),
          dialog === 'account' &&
            /*#__PURE__*/ React.createElement(AccountDialog, {
              onClose: () => setDialog(null),
              onSave: addAccount,
            }),
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
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            onMouseDown: onClose,
            onKeyDown: (e) => {
              if (e.key === 'Escape') onClose();
            },
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'act-pop',
              style: {
                marginTop: '11vh',
                width: 'min(440px, 94vw)',
              },
              onMouseDown: (e) => e.stopPropagation(),
              role: 'dialog',
              'aria-label': 'New transaction',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-head',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'arrow-left-right',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't',
                },
                'New transaction \xB7 ',
                account.name,
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'ibtn',
                  onClick: onClose,
                  'aria-label': 'Close',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'x',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-body',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'seg-pills',
                  role: 'group',
                  'aria-label': 'Direction',
                },
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'seg-pill',
                    'aria-pressed': dir === 'in',
                    onClick: () => {
                      setDir('in');
                      setCat('contract');
                    },
                  },
                  /*#__PURE__*/ React.createElement(TI, {
                    n: 'arrow-down-left',
                  }),
                  ' Income',
                ),
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'seg-pill',
                    'aria-pressed': dir === 'out',
                    onClick: () => {
                      setDir('out');
                      setCat('payout');
                    },
                  },
                  /*#__PURE__*/ React.createElement(TI, {
                    n: 'arrow-up-right',
                  }),
                  ' Expense',
                ),
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'seg-pill',
                    'aria-pressed': dir === 'xfer',
                    onClick: () => {
                      setDir('xfer');
                      setCat('transfer');
                    },
                  },
                  /*#__PURE__*/ React.createElement(TI, {
                    n: 'arrow-left-right',
                  }),
                  ' Transfer',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Amount (',
                  cur,
                  ')',
                ),
                /*#__PURE__*/ React.createElement('input', {
                  className: 'field-in mono',
                  value: amount,
                  onChange: (e) => setAmount(e.target.value),
                  placeholder: '0',
                  autoFocus: true,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Description',
                ),
                /*#__PURE__*/ React.createElement('input', {
                  className: 'field-in',
                  value: desc,
                  onChange: (e) => setDesc(e.target.value),
                  placeholder: 'What was this for?',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Category',
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'inv-select',
                    style: {
                      width: '100%',
                      height: 40,
                    },
                  },
                  /*#__PURE__*/ React.createElement(TI, {
                    n: 'tag',
                    className: 'lead',
                  }),
                  /*#__PURE__*/ React.createElement(
                    'select',
                    {
                      value: cat,
                      onChange: (e) => setCat(e.target.value),
                      style: {
                        flex: 1,
                      },
                    },
                    cats.map(([k, c]) =>
                      /*#__PURE__*/ React.createElement(
                        'option',
                        {
                          key: k,
                          value: k,
                        },
                        c.label,
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(TI, {
                    n: 'chevron-down',
                    className: 'chev',
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Member / counterparty',
                ),
                /*#__PURE__*/ React.createElement('input', {
                  className: 'field-in',
                  value: member,
                  onChange: (e) => setMember(e.target.value),
                  placeholder: account.lead,
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-foot',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  onClick: onClose,
                },
                'Cancel',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  disabled: !ready,
                  onClick: () =>
                    onSave({
                      dir,
                      amount: Number(amount),
                      desc,
                      cat,
                      member,
                    }),
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'check',
                }),
                ' Record',
              ),
            ),
          ),
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
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            onMouseDown: onClose,
            onKeyDown: (e) => {
              if (e.key === 'Escape') onClose();
            },
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'act-pop',
              style: {
                marginTop: '9vh',
                width: 'min(460px, 94vw)',
              },
              onMouseDown: (e) => e.stopPropagation(),
              role: 'dialog',
              'aria-label': 'New account',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-head',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'landmark',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't',
                },
                'New account',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'ibtn',
                  onClick: onClose,
                  'aria-label': 'Close',
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'x',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-body',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Account name',
                ),
                /*#__PURE__*/ React.createElement('input', {
                  className: 'field-in',
                  value: name,
                  onChange: (e) => setName(e.target.value),
                  placeholder: 'e.g. Salvage Division',
                  autoFocus: true,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Account type',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'type-grid',
                    role: 'group',
                    'aria-label': 'Account type',
                  },
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'type-opt',
                      'aria-pressed': type === 'division',
                      onClick: () => setType('division'),
                    },
                    /*#__PURE__*/ React.createElement(TI, {
                      n: 'git-branch',
                    }),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'l',
                      },
                      'Division',
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'type-opt',
                      'aria-pressed': type === 'fund',
                      onClick: () => setType('fund'),
                    },
                    /*#__PURE__*/ React.createElement(TI, {
                      n: 'piggy-bank',
                    }),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'l',
                      },
                      'Fund',
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'type-opt',
                      'aria-pressed': type === 'main',
                      onClick: () => setType('main'),
                    },
                    /*#__PURE__*/ React.createElement(TI, {
                      n: 'landmark',
                    }),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'l',
                      },
                      'Operating',
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Currency',
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'cur-choice',
                    role: 'group',
                    'aria-label': 'Currency',
                  },
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'cur-opt',
                      'aria-pressed': currency === 'aUEC',
                      onClick: () => setCurrency('aUEC'),
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'ci acct-main',
                      },
                      /*#__PURE__*/ React.createElement(TI, {
                        n: 'coins',
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      null,
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'nm',
                        },
                        'aUEC',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'sub',
                        },
                        'Standard credits',
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'cur-opt',
                      'aria-pressed': currency === 'merits',
                      onClick: () => setCurrency('merits'),
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'ci acct-merits',
                      },
                      /*#__PURE__*/ React.createElement(TI, {
                        n: 'gavel',
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      null,
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'nm',
                        },
                        'merits',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'sub',
                        },
                        'Prison currency',
                      ),
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Starting balance (',
                  CURRENCY[currency].label,
                  ')',
                ),
                /*#__PURE__*/ React.createElement('input', {
                  className: 'field-in mono',
                  value: starting,
                  onChange: (e) => setStarting(e.target.value),
                  placeholder: '0',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'label',
                  {
                    className: 'field-lbl',
                  },
                  'Description (optional)',
                ),
                /*#__PURE__*/ React.createElement('input', {
                  className: 'field-in',
                  value: desc,
                  onChange: (e) => setDesc(e.target.value),
                  placeholder: 'What is this account for?',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'act-pop-foot',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  onClick: onClose,
                },
                'Cancel',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  disabled: !ready,
                  onClick: () =>
                    onSave({
                      name,
                      type,
                      currency,
                      starting,
                      desc,
                    }),
                },
                /*#__PURE__*/ React.createElement(TI, {
                  n: 'check',
                }),
                ' Create account',
              ),
            ),
          ),
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
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'treasury',
            commands: commands,
            helpExtra: helpExtra,
            onNew: () => {
              const b = document.getElementById('trez-new');
              if (b) b.click();
            },
            searchPlaceholder: 'Search accounts, ledger\u2026',
          },
          /*#__PURE__*/ React.createElement(TreasuryPage, null),
        );
      }
      window.TreasuryApp = TreasuryApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/Treasury.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/WorkOrders.jsx
  try {
    (() => {
      // ============================================================
      // Station — Work Orders page (v2)
      // A work order is a JOB that may involve MANY ships feeding one
      // refinery batch + crew-share split. Two views:
      //   • LIST  — top stats aggregate over a PERIOD (session / 7d / 30d)
      //   • ACTIVE (drill-in) — top stats scoped to ONE work order, plus
      //     the ships participating, refinery, ore, expenses, crew shares.
      // Keyboard-first: roving list, Enter drills in, Esc steps back, n = new.
      // ============================================================

      const I = window.StationIcon;

      // ---- ore reference (aUEC per refined SCU, plausible 4.x values) ----
      const ORE = {
        Quantanium: {
          price: 26800,
          color: '#5BD6B0',
        },
        Bexalite: {
          price: 17400,
          color: '#7CBEF9',
        },
        Taranite: {
          price: 16100,
          color: '#C879D8',
        },
        Gold: {
          price: 12300,
          color: '#E0B23A',
        },
        Laranite: {
          price: 6300,
          color: '#9AA7B2',
        },
        Agricium: {
          price: 5800,
          color: '#B6E3D4',
        },
        Hephaestanite: {
          price: 5300,
          color: '#E0913A',
        },
        Titanium: {
          price: 1900,
          color: '#8FA0AE',
        },
        Tungsten: {
          price: 1500,
          color: '#6E7BF2',
        },
        Iron: {
          price: 1100,
          color: '#C2724B',
        },
        RMC: {
          price: 12100,
          color: '#5BD6B0',
        },
        CMAT: {
          price: 1800,
          color: '#9AA7B2',
        },
      };
      const oreColor = (n) => (ORE[n] && ORE[n].color) || '#9AA7B2';
      const TYPE = {
        ship: {
          icon: 'gem',
          label: 'Ship Mining',
          cls: 'ship',
          shipIcon: 'gem',
        },
        vehicle: {
          icon: 'car',
          label: 'Vehicle (ROC)',
          cls: 'vehicle',
          shipIcon: 'car',
        },
        salvage: {
          icon: 'recycle',
          label: 'Salvage',
          cls: 'salvage',
          shipIcon: 'recycle',
        },
      };
      const STATUS = {
        refining: {
          tone: 'warn',
          icon: 'loader',
          label: 'Refining',
        },
        refined: {
          tone: 'info',
          icon: 'package-check',
          label: 'Refined',
        },
        sold: {
          tone: 'success',
          icon: 'badge-check',
          label: 'Sold',
        },
        pending: {
          tone: 'neutral',
          icon: 'circle-dashed',
          label: 'Pending',
        },
        failed: {
          tone: 'danger',
          icon: 'circle-x',
          label: 'Failed',
        },
      };
      const tintFor = (type) =>
        ({
          ship: {
            background: 'color-mix(in srgb, var(--aqua-400) 18%, transparent)',
            color: 'var(--aqua-300)',
          },
          vehicle: {
            background: 'color-mix(in srgb, var(--teal-400) 18%, transparent)',
            color: 'var(--teal-300)',
          },
          salvage: {
            background: 'color-mix(in srgb, #C879D8 20%, transparent)',
            color: '#D9A6E6',
          },
        })[type];

      // ---- work orders (each can hold MANY ships) ----
      const ORDERS = [
        {
          id: 'WO-3041',
          title: 'Aaron Halo dragline',
          type: 'ship',
          status: 'refining',
          loc: 'Aaron Halo · Cluster 7',
          daysAgo: 0,
          session: true,
          refinery: 'ARC-L1 · Refinery',
          method: 'Dinyx Solventation',
          yield: 78,
          progress: 0.64,
          timeLeft: '1h 12m',
          ships: [
            {
              ship: 'MISC Mole',
              op: 'hezeqiah',
              scu: 96,
            },
            {
              ship: 'MISC Mole',
              op: 'Vesper Calderon',
              scu: 88,
            },
            {
              ship: 'MISC Prospector',
              op: 'Iris Tanaka',
              scu: 32,
            },
          ],
          ores: [
            ['Quantanium', 132, 103],
            ['Taranite', 60, 47],
            ['Bexalite', 24, 19],
          ],
          expenses: [
            ['Refinery fee', 31400, 'hezeqiah'],
            ['Fuel + QT', 8200, 'Vesper Calderon'],
          ],
          crew: [
            {
              name: 'hezeqiah',
              role: 'Lead · Seller',
              type: 'equal',
            },
            {
              name: 'Vesper Calderon',
              role: 'Operator',
              type: 'equal',
            },
            {
              name: 'Iris Tanaka',
              role: 'Operator',
              type: 'equal',
            },
            {
              name: 'Dax Moreno',
              role: 'Escort',
              type: 'percent',
              val: 10,
            },
          ],
        },
        {
          id: 'WO-3040',
          title: 'Lyria surface sweep',
          type: 'ship',
          status: 'refined',
          loc: 'Lyria · Crater Field',
          daysAgo: 1,
          session: true,
          refinery: 'ARC-L1 · Refinery',
          method: 'Ferron Exchange',
          yield: 71,
          progress: 1,
          timeLeft: 'Ready to sell',
          ships: [
            {
              ship: 'MISC Prospector',
              op: 'Iris Tanaka',
              scu: 50,
            },
          ],
          ores: [
            ['Laranite', 32, 23],
            ['Agricium', 18, 13],
          ],
          expenses: [['Refinery fee', 6200, 'Iris Tanaka']],
          crew: [
            {
              name: 'Iris Tanaka',
              role: 'Solo · Seller',
              type: 'equal',
            },
          ],
        },
        {
          id: 'WO-3038',
          title: 'Daymar ROC gem run',
          type: 'vehicle',
          status: 'sold',
          loc: 'Daymar · Eager Flats',
          daysAgo: 2,
          session: true,
          refinery: '—',
          method: 'Hand-sold (gems)',
          yield: 100,
          progress: 1,
          timeLeft: 'Sold',
          ships: [
            {
              ship: 'Greycat ROC',
              op: 'Dax Moreno',
              scu: 9,
            },
            {
              ship: 'Greycat ROC',
              op: 'Kova Rhys',
              scu: 7,
            },
          ],
          ores: [['Hephaestanite', 16, 16]],
          expenses: [],
          crew: [
            {
              name: 'Dax Moreno',
              role: 'Driver · Seller',
              type: 'equal',
            },
            {
              name: 'Kova Rhys',
              role: 'Driver',
              type: 'equal',
            },
          ],
        },
        {
          id: 'WO-3037',
          title: 'Yela wreck reclaim',
          type: 'salvage',
          status: 'refining',
          loc: 'Yela Belt · Wrecks 19–24',
          daysAgo: 4,
          refinery: 'CRU-L1 · Reclamation',
          method: 'Material Reclaim',
          yield: 96,
          progress: 0.31,
          timeLeft: '3h 48m',
          ships: [
            {
              ship: 'Drake Vulture',
              op: 'Kova Rhys',
              scu: 64,
            },
            {
              ship: 'Aegis Reclaimer',
              op: 'hezeqiah',
              scu: 220,
            },
          ],
          ores: [
            ['RMC', 180, 172],
            ['CMAT', 96, 91],
          ],
          expenses: [['Hull repair', 18400, 'Kova Rhys']],
          crew: [
            {
              name: 'hezeqiah',
              role: 'Reclaimer crew · Seller',
              type: 'equal',
            },
            {
              name: 'Kova Rhys',
              role: 'Operator',
              type: 'flat',
              val: 120000,
            },
            {
              name: 'Talia Vance',
              role: 'Processing',
              type: 'equal',
            },
          ],
          altSeller: 'hezeqiah',
        },
        {
          id: 'WO-3036',
          title: 'Aaron Halo cluster 4',
          type: 'ship',
          status: 'pending',
          loc: 'Aaron Halo · Cluster 4',
          daysAgo: 6,
          refinery: 'Not submitted',
          method: '—',
          yield: 0,
          progress: 0,
          timeLeft: 'Awaiting refinery',
          ships: [
            {
              ship: 'MISC Mole',
              op: 'hezeqiah',
              scu: 84,
            },
            {
              ship: 'MISC Mole',
              op: 'Vesper Calderon',
              scu: 76,
            },
          ],
          ores: [
            ['Bexalite', 54, 0],
            ['Titanium', 120, 0],
          ],
          expenses: [],
          crew: [
            {
              name: 'hezeqiah',
              role: 'Lead · Seller',
              type: 'equal',
            },
            {
              name: 'Vesper Calderon',
              role: 'Operator',
              type: 'equal',
            },
          ],
        },
        {
          id: 'WO-3030',
          title: 'Wala ring (ship lost)',
          type: 'ship',
          status: 'failed',
          loc: 'Wala · Ring',
          daysAgo: 12,
          refinery: 'HUR-L2 · Refinery',
          method: 'Cormack Method',
          yield: 0,
          progress: 0,
          timeLeft: 'Ship lost — claim filed',
          ships: [
            {
              ship: 'MISC Prospector',
              op: 'Vesper Calderon',
              scu: 28,
            },
          ],
          ores: [['Gold', 28, 0]],
          expenses: [['Insurance excess', 4500, 'Vesper Calderon']],
          crew: [
            {
              name: 'Vesper Calderon',
              role: 'Solo',
              type: 'equal',
            },
          ],
        },
        {
          id: 'WO-3024',
          title: 'Daymar quant haul',
          type: 'ship',
          status: 'sold',
          loc: 'Daymar · Kudre Ore',
          daysAgo: 21,
          refinery: 'CRU-L1 · Refinery',
          method: 'Dinyx Solventation',
          yield: 82,
          progress: 1,
          timeLeft: 'Sold',
          ships: [
            {
              ship: 'MISC Mole',
              op: 'hezeqiah',
              scu: 110,
            },
            {
              ship: 'MISC Prospector',
              op: 'Bram Holloway',
              scu: 44,
            },
          ],
          ores: [
            ['Quantanium', 120, 98],
            ['Taranite', 30, 24],
          ],
          expenses: [['Refinery fee', 22400, 'hezeqiah']],
          crew: [
            {
              name: 'hezeqiah',
              role: 'Lead · Seller',
              type: 'equal',
            },
            {
              name: 'Bram Holloway',
              role: 'Operator',
              type: 'equal',
            },
          ],
        },
      ];
      const PERIODS = [
        {
          value: 'session',
          label: 'This session',
        },
        {
          value: '7',
          label: 'Last 7 days',
        },
        {
          value: '30',
          label: 'Last 30 days',
        },
      ];
      const inPeriod = (o, p) =>
        p === 'session' ? !!o.session : o.daysAgo <= Number(p);

      // ---- money helpers ----
      const fmt = (n) => Math.round(n).toLocaleString('en-US');
      const abbr = (n) => {
        const a = Math.abs(n);
        if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
        if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(Math.round(n));
      };
      const initials = (s) =>
        s
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
      const realisedQ = (o) => o.status === 'pending' || o.status === 'failed';
      function grossOf(o) {
        return o.ores.reduce(
          (s, [name, , refined]) =>
            s + refined * (ORE[name] ? ORE[name].price : 0),
          0,
        );
      }
      function scuOf(o) {
        return o.ores.reduce((s, x) => s + (realisedQ(o) ? x[1] : x[2]), 0);
      }
      function payoutOf(o) {
        const gross = grossOf(o);
        const totalExp = o.expenses.reduce((s, [, amt]) => s + amt, 0);
        const net = Math.max(0, gross - totalExp);
        const flats = o.crew.filter((c) => c.type === 'flat');
        const pcts = o.crew.filter((c) => c.type === 'percent');
        const equals = o.crew.filter((c) => c.type === 'equal');
        const flatSum = flats.reduce((s, c) => s + (c.val || 0), 0);
        const pctSum = pcts.reduce((s, c) => s + (net * (c.val || 0)) / 100, 0);
        const remainder = Math.max(0, net - flatSum - pctSum);
        const equalEach = equals.length ? remainder / equals.length : 0;
        const rows = o.crew.map((c) => {
          let share = 0,
            label = 'Equal';
          if (c.type === 'flat') {
            share = c.val || 0;
            label = 'Flat';
          } else if (c.type === 'percent') {
            share = (net * (c.val || 0)) / 100;
            label = c.val + '%';
          } else {
            share = equalEach;
            label = 'Equal';
          }
          const reimb = o.expenses
            .filter((e) => e[2] === c.name)
            .reduce((s, e) => s + e[1], 0);
          return {
            ...c,
            share,
            reimb,
            total: share + reimb,
            label,
          };
        });
        return {
          gross,
          totalExp,
          net,
          rows,
        };
      }

      // ===========================================================
      //  LIST VIEW
      // ===========================================================
      function OrderRow({ o, selected, tabIndex, regRef, onSelect, onOpen }) {
        const ty = TYPE[o.type],
          st = STATUS[o.status];
        const gross = grossOf(o);
        const scu = scuOf(o);
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': selected,
            onClick: onSelect,
            onDoubleClick: onOpen,
            onFocus: onSelect,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ic ' + ty.cls,
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: ty.icon,
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  o.title,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sub',
                  },
                  o.id,
                  ' \xB7 ',
                  ty.label,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'ship-count',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'ship-stack',
                },
                o.ships.slice(0, 3).map((s, i) =>
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'mini',
                      key: i,
                    },
                    /*#__PURE__*/ React.createElement(I, {
                      n: ty.shipIcon,
                    }),
                  ),
                ),
              ),
              o.ships.length,
              ' ',
              o.ships.length === 1 ? 'ship' : 'ships',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'num',
            },
            scu,
            ' ',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 't-muted',
                style: {
                  fontWeight: 400,
                },
              },
              'SCU',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              StatusPill,
              {
                tone: st.tone,
                icon: st.icon,
              },
              o.status === 'refining' ? o.timeLeft : st.label,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'num',
            },
            realisedQ(o) ? '—' : abbr(gross),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'num',
              style: {
                paddingLeft: 0,
              },
            },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'ibtn',
                style: {
                  width: 30,
                  height: 30,
                },
                'aria-label': 'Open ' + o.title,
                onClick: (e) => {
                  e.stopPropagation();
                  onOpen();
                },
              },
              /*#__PURE__*/ React.createElement(I, {
                n: 'chevron-right',
              }),
            ),
          ),
        );
      }
      function ListView({ period, setPeriod, filter, setFilter, onOpen }) {
        const visible = React.useMemo(
          () =>
            ORDERS.filter((o) => inPeriod(o, period)).filter(
              (o) => filter === 'all' || o.type === filter,
            ),
          [period, filter],
        );
        const [selId, setSelId] = React.useState(
          visible[0] ? visible[0].id : null,
        );
        React.useEffect(() => {
          if (visible.length && !visible.find((o) => o.id === selId))
            setSelId(visible[0].id);
        }, [period, filter]);
        const roving = window.useRoving(visible.length, {
          onActivate: (i) => {
            if (visible[i]) onOpen(visible[i].id);
          },
        });
        React.useEffect(() => {
          roving.setIdx(0);
        }, [period, filter]);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });

        // period aggregates
        const totals = React.useMemo(() => {
          let yieldScu = 0,
            gross = 0,
            exp = 0,
            refining = 0,
            ships = 0;
          visible.forEach((o) => {
            if (!realisedQ(o)) {
              yieldScu += o.ores.reduce((s, x) => s + x[2], 0);
              gross += grossOf(o);
              exp += o.expenses.reduce((s, e) => s + e[1], 0);
            }
            if (o.status === 'refining') refining += 1;
            ships += o.ships.length;
          });
          return {
            yieldScu,
            gross,
            exp,
            net: gross - exp,
            refining,
            ships,
            orders: visible.length,
          };
        }, [visible]);
        const oreSummary = React.useMemo(() => {
          const m = {};
          visible.forEach((o) => {
            if (!realisedQ(o))
              o.ores.forEach(([n, , r]) => {
                m[n] = (m[n] || 0) + r;
              });
          });
          return Object.entries(m).sort((a, b) => b[1] - a[1]);
        }, [visible]);
        const filters = [
          {
            value: 'all',
            label: 'All',
            count: ORDERS.filter((o) => inPeriod(o, period)).length,
          },
          {
            value: 'ship',
            label: 'Ship',
            icon: 'gem',
          },
          {
            value: 'vehicle',
            label: 'ROC',
            icon: 'car',
          },
          {
            value: 'salvage',
            label: 'Salvage',
            icon: 'recycle',
          },
        ];
        const periodLabel = PERIODS.find(
          (p) => p.value === period,
        ).label.toLowerCase();
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'page-head',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'crumb',
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: 'pickaxe',
                }),
                ' Operations ',
                /*#__PURE__*/ React.createElement(I, {
                  n: 'chevron-right',
                }),
                ' Work Orders',
              ),
              /*#__PURE__*/ React.createElement(
                'h1',
                {
                  className: 'page-title',
                },
                'Work Orders',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'page-sub',
                },
                'Every refinery job and its crew-share split in one place. A work order can pool many ships into one payout \u2014 open one to see the ships, ore, expenses, and who gets what.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'page-actions',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: 'scan-line',
                }),
                ' Capture',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  id: 'wo-new',
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: 'plus',
                }),
                ' New work order ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'kbd',
                    style: {
                      marginLeft: 6,
                    },
                  },
                  /*#__PURE__*/ React.createElement('kbd', null, 'n'),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wo-period',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pcap',
              },
              'Summary for',
            ),
            /*#__PURE__*/ React.createElement(Segmented, {
              options: PERIODS,
              value: period,
              onChange: setPeriod,
              ariaLabel: 'Summary period',
            }),
            /*#__PURE__*/ React.createElement('span', {
              className: 'grow',
            }),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'live-tag',
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'live',
              }),
              'Aaron Halo session \xB7 open',
            ),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
              {
                k: 'Orders',
                icon: 'layers',
                v: totals.orders,
                d: totals.ships + ' ships involved',
              },
              {
                k: 'Yield (' + periodLabel + ')',
                icon: 'gem',
                v: totals.yieldScu,
                unit: 'SCU',
                d: oreSummary.length + ' ores refined',
              },
              {
                k: 'Gross value',
                icon: 'coins',
                v: abbr(totals.gross),
                unit: 'aUEC',
                d: 'at UEX sell prices',
              },
              {
                k: 'Net payout',
                icon: 'hand-coins',
                v: abbr(totals.net),
                unit: 'aUEC',
                d: 'after expenses',
                tone: 'up',
              },
              {
                k: 'Refining now',
                icon: 'loader',
                v: totals.refining,
                d: 'jobs in progress',
              },
            ],
          }),
          oreSummary.length > 0 &&
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'ore-sum',
              },
              oreSummary.map(([name, scu]) =>
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'chip',
                    key: name,
                  },
                  /*#__PURE__*/ React.createElement('span', {
                    className: 'dot',
                    style: {
                      background: oreColor(name),
                    },
                  }),
                  name,
                  ' ',
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'q',
                    },
                    scu,
                    ' SCU',
                  ),
                ),
              ),
            ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wo-toolbar',
            },
            /*#__PURE__*/ React.createElement(Segmented, {
              options: filters,
              value: filter,
              onChange: setFilter,
              ariaLabel: 'Filter work orders by type',
            }),
            /*#__PURE__*/ React.createElement('span', {
              className: 'grow',
            }),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'chips',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: 'arrow-down-up',
                }),
                ' Sort: Newest',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'fchip',
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: 'download',
                }),
                ' Export CSV',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'dtable-wrap',
              style: {
                marginTop: 'var(--space-5)',
              },
            },
            visible.length === 0
              ? /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'empty',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'e-ic',
                    },
                    /*#__PURE__*/ React.createElement(I, {
                      n: 'pickaxe',
                    }),
                  ),
                  'No work orders in this period.',
                )
              : /*#__PURE__*/ React.createElement(
                  'table',
                  {
                    className: 'dtable',
                    role: 'grid',
                    'aria-label': 'Work orders',
                    onKeyDown: roving.onKeyDown,
                  },
                  /*#__PURE__*/ React.createElement(
                    'thead',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'tr',
                      null,
                      /*#__PURE__*/ React.createElement(
                        'th',
                        null,
                        'Work order',
                      ),
                      /*#__PURE__*/ React.createElement('th', null, 'Ships'),
                      /*#__PURE__*/ React.createElement(
                        'th',
                        {
                          className: 'num',
                        },
                        'Yield',
                      ),
                      /*#__PURE__*/ React.createElement('th', null, 'Status'),
                      /*#__PURE__*/ React.createElement(
                        'th',
                        {
                          className: 'num',
                        },
                        'Value',
                      ),
                      /*#__PURE__*/ React.createElement('th', null),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'tbody',
                    null,
                    visible.map((o, i) =>
                      /*#__PURE__*/ React.createElement(OrderRow, {
                        key: o.id,
                        o: o,
                        selected: o.id === selId,
                        tabIndex: roving.getTab(i),
                        regRef: roving.register(i),
                        onSelect: () => {
                          setSelId(o.id);
                          roving.setIdx(i);
                        },
                        onOpen: () => onOpen(o.id),
                      }),
                    ),
                  ),
                ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'list-hint',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
              ),
              ' move',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
              ),
              ' open work order',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, 'n'),
              ),
              ' new',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  style: {
                    marginLeft: 'auto',
                  },
                },
                visible.length,
                ' orders \xB7 ',
                periodLabel,
              ),
            ),
          ),
        );
      }

      // ===========================================================
      //  ACTIVE (drill-in) VIEW
      // ===========================================================
      function ActiveView({ o, onBack }) {
        const backRef = React.useRef(null);
        const ty = TYPE[o.type],
          st = STATUS[o.status];
        const { gross, totalExp, net, rows } = payoutOf(o);
        const realised = realisedQ(o);
        const totalShipScu = o.ships.reduce((s, x) => s + x.scu, 0);
        React.useEffect(() => {
          if (backRef.current) backRef.current.focus();
        }, [o.id]);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        React.useEffect(() => {
          const onKey = (e) => {
            if (e.key === 'Escape') {
              const open = document.querySelector('.scrim');
              if (!open) onBack();
            }
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        }, [onBack]);
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'wo-active',
          },
          /*#__PURE__*/ React.createElement(
            'button',
            {
              className: 'wo-back',
              ref: backRef,
              onClick: onBack,
            },
            /*#__PURE__*/ React.createElement(I, {
              n: 'arrow-left',
            }),
            ' All work orders ',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'kbd',
                style: {
                  marginLeft: 4,
                },
              },
              /*#__PURE__*/ React.createElement('kbd', null, 'Esc'),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wo-active-head',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'big-ic',
                style: tintFor(o.type),
              },
              /*#__PURE__*/ React.createElement(I, {
                n: ty.icon,
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'h',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 't',
                },
                o.title,
                ' ',
                /*#__PURE__*/ React.createElement(
                  StatusPill,
                  {
                    tone: st.tone,
                    icon: st.icon,
                  },
                  st.label,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 's',
                },
                /*#__PURE__*/ React.createElement('span', null, o.id),
                /*#__PURE__*/ React.createElement('span', null, '\xB7'),
                /*#__PURE__*/ React.createElement('span', null, ty.label),
                /*#__PURE__*/ React.createElement('span', null, '\xB7'),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    },
                  },
                  /*#__PURE__*/ React.createElement(I, {
                    n: 'map-pin',
                  }),
                  o.loc,
                ),
                /*#__PURE__*/ React.createElement('span', null, '\xB7'),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    },
                  },
                  /*#__PURE__*/ React.createElement(I, {
                    n: 'rocket',
                  }),
                  o.ships.length,
                  ' ships \xB7 ',
                  o.crew.length,
                  ' crew',
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'acts',
              },
              o.status === 'refined' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                  },
                  /*#__PURE__*/ React.createElement(I, {
                    n: 'coins',
                  }),
                  ' Mark sold & pay crew',
                ),
              o.status === 'pending' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-primary btn-sm',
                  },
                  /*#__PURE__*/ React.createElement(I, {
                    n: 'send',
                  }),
                  ' Submit to refinery',
                ),
              o.status === 'refining' &&
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'btn btn-ghost btn-sm',
                  },
                  /*#__PURE__*/ React.createElement(I, {
                    n: 'bell',
                  }),
                  ' Notify when done',
                ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'btn btn-ghost btn-sm',
                  'aria-label': 'Edit work order',
                },
                /*#__PURE__*/ React.createElement(I, {
                  n: 'pencil',
                }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(StatStrip, {
            items: [
              {
                k: 'Order yield',
                icon: 'gem',
                v: scuOf(o),
                unit: 'SCU',
                d: o.ores.length + ' ore types',
              },
              {
                k: 'Gross value',
                icon: 'coins',
                v: realised ? '—' : abbr(gross),
                unit: realised ? '' : 'aUEC',
                d: 'at UEX prices',
              },
              {
                k: 'Expenses',
                icon: 'receipt',
                v: totalExp ? abbr(totalExp) : '0',
                unit: 'aUEC',
                d: o.expenses.length + ' items',
                tone: 'warn',
              },
              {
                k: 'Net payout',
                icon: 'hand-coins',
                v: realised ? '—' : abbr(net),
                unit: realised ? '' : 'aUEC',
                d: 'split ' + o.crew.length + ' ways',
                tone: 'up',
              },
              {
                k: 'Ships',
                icon: 'rocket',
                v: o.ships.length,
                d: totalShipScu + ' SCU hauled',
              },
            ],
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'split',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(I, {
                      n: 'rocket',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Ships participating',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 't-mono t-muted',
                      style: {
                        fontSize: 'var(--text-xs)',
                      },
                    },
                    totalShipScu,
                    ' SCU',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                    style: {
                      paddingTop: 4,
                      paddingBottom: 4,
                    },
                  },
                  o.ships.map((s, i) => {
                    const pct = totalShipScu
                      ? Math.round((s.scu / totalShipScu) * 100)
                      : 0;
                    return /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'ship-row',
                        key: i,
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'ship-ic',
                          style: tintFor(o.type),
                        },
                        /*#__PURE__*/ React.createElement(I, {
                          n: ty.shipIcon,
                        }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'info',
                        },
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'nm',
                          },
                          s.ship,
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'op',
                          },
                          /*#__PURE__*/ React.createElement(I, {
                            n: 'user',
                          }),
                          s.op,
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'ship-scu',
                        },
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'v',
                          },
                          s.scu,
                        ),
                        ' ',
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'u',
                          },
                          'SCU \xB7 ',
                          pct,
                          '%',
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'bar',
                          },
                          /*#__PURE__*/ React.createElement('i', {
                            style: {
                              width: pct + '%',
                            },
                          }),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(I, {
                      n: 'factory',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Refinery',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 't-mono t-muted',
                      style: {
                        fontSize: 'var(--text-xs)',
                      },
                    },
                    'yield ',
                    o.yield ? o.yield + '%' : '—',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'refbox',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'refbox-top',
                      },
                      /*#__PURE__*/ React.createElement(
                        'div',
                        null,
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'refbox-method',
                          },
                          o.method,
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'refbox-method st',
                          },
                          o.refinery,
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'refbox-time',
                        },
                        o.timeLeft,
                      ),
                    ),
                    o.status === 'refining' &&
                      /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'tbar',
                          },
                          /*#__PURE__*/ React.createElement('i', {
                            style: {
                              width: Math.round(o.progress * 100) + '%',
                            },
                          }),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'refbox-foot',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            null,
                            Math.round(o.progress * 100),
                            '% complete',
                          ),
                          /*#__PURE__*/ React.createElement(
                            'span',
                            null,
                            'ETA ',
                            o.timeLeft,
                          ),
                        ),
                      ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'detail-section',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'ds-cap',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      null,
                      'Ore yield (pooled)',
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'table',
                    {
                      className: 'ore-table',
                    },
                    /*#__PURE__*/ React.createElement(
                      'thead',
                      null,
                      /*#__PURE__*/ React.createElement(
                        'tr',
                        null,
                        /*#__PURE__*/ React.createElement('th', null, 'Ore'),
                        /*#__PURE__*/ React.createElement(
                          'th',
                          {
                            className: 'num',
                          },
                          'Raw',
                        ),
                        /*#__PURE__*/ React.createElement(
                          'th',
                          {
                            className: 'num',
                          },
                          'Refined',
                        ),
                        /*#__PURE__*/ React.createElement(
                          'th',
                          {
                            className: 'num',
                          },
                          'Value',
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'tbody',
                      null,
                      o.ores.map(([name, raw, refined]) =>
                        /*#__PURE__*/ React.createElement(
                          'tr',
                          {
                            key: name,
                          },
                          /*#__PURE__*/ React.createElement(
                            'td',
                            null,
                            /*#__PURE__*/ React.createElement(
                              'span',
                              {
                                className: 'ore-name',
                              },
                              /*#__PURE__*/ React.createElement('span', {
                                className: 'ore-dot',
                                style: {
                                  background: oreColor(name),
                                },
                              }),
                              name,
                            ),
                          ),
                          /*#__PURE__*/ React.createElement(
                            'td',
                            {
                              className: 'num t-muted',
                            },
                            raw,
                          ),
                          /*#__PURE__*/ React.createElement(
                            'td',
                            {
                              className: 'num',
                            },
                            realised ? '—' : refined,
                          ),
                          /*#__PURE__*/ React.createElement(
                            'td',
                            {
                              className: 'num',
                            },
                            realised
                              ? '—'
                              : fmt(
                                  refined * (ORE[name] ? ORE[name].price : 0),
                                ),
                          ),
                        ),
                      ),
                    ),
                    !realised &&
                      /*#__PURE__*/ React.createElement(
                        'tfoot',
                        null,
                        /*#__PURE__*/ React.createElement(
                          'tr',
                          null,
                          /*#__PURE__*/ React.createElement(
                            'td',
                            null,
                            'Gross',
                          ),
                          /*#__PURE__*/ React.createElement('td', {
                            className: 'num',
                          }),
                          /*#__PURE__*/ React.createElement('td', {
                            className: 'num',
                          }),
                          /*#__PURE__*/ React.createElement(
                            'td',
                            {
                              className: 'num',
                            },
                            fmt(gross),
                          ),
                        ),
                      ),
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              o.expenses.length > 0 &&
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'panel-head',
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'ic',
                      },
                      /*#__PURE__*/ React.createElement(I, {
                        n: 'receipt',
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'panel-title',
                      },
                      'Expenses',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 't-mono',
                        style: {
                          fontSize: 'var(--text-xs)',
                          color: 'var(--coral-400)',
                        },
                      },
                      '\u2212',
                      fmt(totalExp),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'panel-body',
                      style: {
                        paddingTop: 4,
                        paddingBottom: 8,
                      },
                    },
                    o.expenses.map(([label, amt, claimant], i) =>
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'exp-row',
                          key: i,
                        },
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'ex-ic',
                          },
                          /*#__PURE__*/ React.createElement(I, {
                            n: 'receipt',
                          }),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'ex-lbl',
                          },
                          label,
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'ex-claim',
                            },
                            'Reimbursed to ',
                            claimant,
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'ex-amt',
                          },
                          '\u2212',
                          fmt(amt),
                        ),
                      ),
                    ),
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'panel',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-head',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ic',
                    },
                    /*#__PURE__*/ React.createElement(I, {
                      n: 'users',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'panel-title',
                    },
                    'Crew shares \xB7 ',
                    o.crew.length,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 't-muted',
                      style: {
                        fontSize: 'var(--text-xs)',
                      },
                    },
                    'net ',
                    realised ? '—' : fmt(net),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'panel-body',
                  },
                  rows.map((c) =>
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'share-row',
                        key: c.name,
                      },
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'share-who',
                        },
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'av',
                            style: {
                              background: window.avColor(c.name),
                            },
                          },
                          initials(c.name),
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            style: {
                              minWidth: 0,
                            },
                          },
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'nm',
                            },
                            c.name,
                          ),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            {
                              className: 'role',
                            },
                            c.role,
                            c.reimb > 0 &&
                              /*#__PURE__*/ React.createElement(
                                'span',
                                {
                                  className: 't-mono',
                                  style: {
                                    color: 'var(--teal-300)',
                                  },
                                },
                                '+',
                                abbr(c.reimb),
                                ' reimb',
                              ),
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'share-type',
                        },
                        c.label,
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'share-pay',
                        },
                        realised ? '—' : fmt(c.total),
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'sub',
                          },
                          'aUEC',
                        ),
                      ),
                    ),
                  ),
                  o.altSeller &&
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'alt-note',
                      },
                      /*#__PURE__*/ React.createElement(I, {
                        n: 'user-check',
                      }),
                      'Alternate seller: ',
                      /*#__PURE__*/ React.createElement(
                        'strong',
                        null,
                        o.altSeller,
                      ),
                      ' handles the sale and settles payouts to the crew.',
                    ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'payout-foot',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'row',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'l',
                        },
                        'Gross value',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'r',
                        },
                        realised ? '—' : fmt(gross),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'row',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'l',
                        },
                        'Less expenses',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'r',
                          style: {
                            color: 'var(--coral-400)',
                          },
                        },
                        totalExp ? '−' + fmt(totalExp) : '0',
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'row total',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'l',
                        },
                        'Net distributed',
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'r',
                        },
                        realised ? '—' : fmt(net) + ' aUEC',
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }

      // ===========================================================
      //  PAGE
      // ===========================================================
      function WorkOrdersPage() {
        const [period, setPeriod] = React.useState('session');
        const [filter, setFilter] = React.useState('all');
        const [activeId, setActiveId] = React.useState(null);
        const active = activeId ? ORDERS.find((o) => o.id === activeId) : null;
        React.useEffect(() => {
          window.scrollTo(0, 0);
        }, [activeId]);
        if (active)
          return /*#__PURE__*/ React.createElement(ActiveView, {
            o: active,
            onBack: () => setActiveId(null),
          });
        return /*#__PURE__*/ React.createElement(ListView, {
          period: period,
          setPeriod: setPeriod,
          filter: filter,
          setFilter: setFilter,
          onOpen: setActiveId,
        });
      }
      function WorkOrdersApp() {
        const onNew = () => {
          window.__toast &&
            window.__toast(
              'New work order — capture from game or enter ships manually',
              'plus',
            );
        };
        const commands = [
          {
            id: 'wo-new',
            group: 'Work Orders',
            icon: 'plus',
            label: 'New work order',
            hint: 'n',
            run: () =>
              window.__toast &&
              window.__toast('New work order started', 'plus'),
          },
          {
            id: 'wo-capture',
            group: 'Work Orders',
            icon: 'scan-line',
            label: 'Capture order from game (OCR)',
            run: () =>
              window.__toast &&
              window.__toast('Share your game window to capture', 'scan-line'),
          },
          {
            id: 'wo-summary',
            group: 'Work Orders',
            icon: 'receipt',
            label: 'Session summary & payouts',
            run: () =>
              window.__toast &&
              window.__toast('Opening session summary', 'receipt'),
          },
          {
            id: 'wo-close',
            group: 'Work Orders',
            icon: 'lock',
            label: 'Close session',
            run: () =>
              window.__toast && window.__toast('Session closed', 'lock'),
          },
        ];
        const helpExtra = [
          ['New work order', ['n']],
          ['Open work order', ['↵']],
          ['Back to list', ['Esc']],
          ['Change period', ['←', '→']],
        ];
        return /*#__PURE__*/ React.createElement(
          AppShell,
          {
            active: 'workorders',
            commands: commands,
            helpExtra: helpExtra,
            onNew: onNew,
            searchPlaceholder: 'Search orders, ships, crew\u2026',
          },
          /*#__PURE__*/ React.createElement(WorkOrdersPage, null),
        );
      }
      window.WorkOrdersApp = WorkOrdersApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/WorkOrders.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/app-shell.jsx
  try {
    (() => {
      // ============================================================
      // Station — application shell (shared)
      // Sidebar + app bar + command palette + keyboard shortcuts +
      // roving-focus helpers + shared primitives. Exposed on window
      // so each page's JSX can use them.
      //   Keyboard model:
      //   ⌘/Ctrl K  command palette      ?  shortcuts        /  search
      //   g then d/w/c/f/m  go to page    n  new (page-defined)   Esc close
      // ============================================================

      // Render lucide icons as REAL React-owned SVG (no createIcons() DOM mutation).
      // This keeps React in full control so subtree swaps (e.g. edit toggles) never
      // hit "removeChild" errors from lucide replacing nodes in place.
      const ICON_ALIAS = {
        'hand-helping': 'Handshake',
        'helping-hand': 'Handshake',
      };
      function lucideNode(name) {
        const L = window.lucide || {};
        const key =
          ICON_ALIAS[name] ||
          String(name)
            .split('-')
            .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
            .join('');
        const node = L[key] || (L.icons && L.icons[key]);
        return Array.isArray(node) ? node : null;
      }
      function iconChildren(kids) {
        return (kids || []).map((c, i) => {
          const [tag, attrs, sub] = c;
          const props = {
            key: i,
          };
          for (const k in attrs || {})
            props[k.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] =
              attrs[k];
          return React.createElement(
            tag,
            props,
            sub ? iconChildren(sub) : undefined,
          );
        });
      }
      const Icon = ({ n, size, ...p }) => {
        const node = lucideNode(n);
        return React.createElement(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: size || 24,
            height: size || 24,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': true,
            ...p,
          },
          node ? iconChildren(node[2]) : null,
        );
      };

      // org-tool navigation (single source of truth)
      const NAV = [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'layout-dashboard',
          href: '../dashboard/Station Dashboard v2.html',
          key: 'd',
        },
        {
          id: 'workorders',
          label: 'Work Orders',
          icon: 'pickaxe',
          href: 'Work Orders.html',
          key: 'w',
        },
        {
          id: 'contracts',
          label: 'Contracts',
          icon: 'scroll-text',
          href: 'Contracts.html',
          key: 'c',
        },
        {
          id: 'fleet',
          label: 'Fleet',
          icon: 'rocket',
          href: 'Fleet.html',
          key: 'f',
        },
        {
          id: 'members',
          label: 'Members',
          icon: 'users',
          href: 'Members.html',
          key: 'm',
        },
      ];
      const NAV_SECONDARY = [
        {
          id: 'inventory',
          label: 'Inventory',
          icon: 'archive',
          href: 'Inventory.html',
        },
        {
          id: 'treasury',
          label: 'Treasury',
          icon: 'landmark',
          href: 'Treasury.html',
        },
      ];

      // ---- theme + accent (persisted; shared with dashboard) -------
      function useChrome() {
        const [theme, setTheme] = React.useState(() => {
          try {
            return localStorage.getItem('station-dash-theme') || 'dark';
          } catch (e) {
            return 'dark';
          }
        });
        const [accent, setAccent] = React.useState(() => {
          try {
            return localStorage.getItem('station-accent') || 'aqua';
          } catch (e) {
            return 'aqua';
          }
        });
        React.useEffect(() => {
          document.documentElement.setAttribute('data-theme', theme);
          try {
            localStorage.setItem('station-dash-theme', theme);
          } catch (e) {}
        }, [theme]);
        React.useEffect(() => {
          try {
            localStorage.setItem('station-accent', accent);
          } catch (e) {}
        }, [accent]);
        return {
          theme,
          setTheme,
          accent,
          setAccent,
        };
      }

      // ---- roving focus for lists/tables --------------------------
      // returns handlers; rows get tabIndex from getTab(i); container onKeyDown.
      function useRoving(count, { onActivate, orientation = 'vertical' } = {}) {
        const [idx, setIdx] = React.useState(0);
        const refs = React.useRef([]);
        const focus = (i) => {
          const el = refs.current[i];
          if (el) el.focus();
        };
        const clamp = (i) => Math.max(0, Math.min(count - 1, i));
        const onKeyDown = (e) => {
          const nextKeys =
            orientation === 'vertical' ? ['ArrowDown', 'j'] : ['ArrowRight'];
          const prevKeys =
            orientation === 'vertical' ? ['ArrowUp', 'k'] : ['ArrowLeft'];
          if (nextKeys.includes(e.key)) {
            e.preventDefault();
            const i = clamp(idx + 1);
            setIdx(i);
            focus(i);
          } else if (prevKeys.includes(e.key)) {
            e.preventDefault();
            const i = clamp(idx - 1);
            setIdx(i);
            focus(i);
          } else if (e.key === 'Home') {
            e.preventDefault();
            setIdx(0);
            focus(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            setIdx(count - 1);
            focus(count - 1);
          } else if ((e.key === 'Enter' || e.key === ' ') && onActivate) {
            e.preventDefault();
            onActivate(idx);
          }
        };
        const getTab = (i) => (i === idx ? 0 : -1);
        const register = (i) => (el) => {
          refs.current[i] = el;
        };
        return {
          idx,
          setIdx,
          onKeyDown,
          getTab,
          register,
          focus,
        };
      }

      // ---- primitives ----------------------------------------------
      function Kbd({ keys }) {
        return /*#__PURE__*/ React.createElement(
          'span',
          {
            className: 'kbd',
          },
          keys.map((k, i) =>
            /*#__PURE__*/ React.createElement(
              'kbd',
              {
                key: i,
              },
              k,
            ),
          ),
        );
      }
      function Segmented({ options, value, onChange, ariaLabel }) {
        const ref = React.useRef(null);
        const onKey = (e) => {
          const i = options.findIndex((o) => (o.value ?? o) === value);
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const d = e.key === 'ArrowRight' ? 1 : -1;
            const n = (i + d + options.length) % options.length;
            onChange(options[n].value ?? options[n]);
            const btns = ref.current.querySelectorAll('button');
            if (btns[n]) btns[n].focus();
          }
        };
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'seg',
            role: 'tablist',
            'aria-label': ariaLabel,
            ref: ref,
            onKeyDown: onKey,
          },
          options.map((o) => {
            const v = o.value ?? o;
            const label = o.label ?? o;
            const sel = v === value;
            return /*#__PURE__*/ React.createElement(
              'button',
              {
                key: v,
                role: 'tab',
                'aria-selected': sel,
                tabIndex: sel ? 0 : -1,
                onClick: () => onChange(v),
              },
              o.icon &&
                /*#__PURE__*/ React.createElement(Icon, {
                  n: o.icon,
                }),
              label,
              o.count != null &&
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'count',
                  },
                  o.count,
                ),
            );
          }),
        );
      }
      function StatusPill({ tone = 'neutral', icon, children }) {
        return /*#__PURE__*/ React.createElement(
          'span',
          {
            className: 'spill ' + tone,
          },
          icon &&
            /*#__PURE__*/ React.createElement(Icon, {
              n: icon,
            }),
          children,
        );
      }
      function StatStrip({ items }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'statstrip',
            style: {
              '--n': items.length,
            },
          },
          items.map((s, i) =>
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'statcard',
                key: i,
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'k',
                },
                s.icon &&
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: s.icon,
                  }),
                s.k,
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'v',
                },
                s.v,
                s.unit &&
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'unit',
                    },
                    s.unit,
                  ),
              ),
              s.d &&
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'd' + (s.tone ? ' ' + s.tone : ''),
                  },
                  s.d,
                ),
            ),
          ),
        );
      }

      // deterministic avatar color from a string
      function avColor(seed) {
        const palettes = [
          'var(--aqua-500)',
          'var(--teal-500)',
          'var(--coral-500)',
          '#6E7BF2',
          '#C879D8',
          '#3FB6A8',
          '#E0913A',
        ];
        let h = 0;
        for (let i = 0; i < seed.length; i++)
          h = (h * 31 + seed.charCodeAt(i)) % 997;
        return palettes[h % palettes.length];
      }
      function AvatarChip({ name, handle }) {
        const initials = name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        return /*#__PURE__*/ React.createElement(
          'span',
          {
            className: 'achip',
          },
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'av',
              style: {
                background: avColor(name),
              },
            },
            initials,
          ),
          /*#__PURE__*/ React.createElement(
            'span',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'nm',
              },
              name,
            ),
            handle &&
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't-muted',
                  style: {
                    fontSize: 'var(--text-xs)',
                    marginLeft: 6,
                  },
                },
                handle,
              ),
          ),
        );
      }

      // ---- toasts (tiny global) -----------------------------------
      const ToastCtx = React.createContext(() => {});
      function useToast() {
        return React.useContext(ToastCtx);
      }

      // ---- command palette ----------------------------------------
      function CommandPalette({ open, onClose, commands }) {
        const [q, setQ] = React.useState('');
        const [sel, setSel] = React.useState(0);
        const inputRef = React.useRef(null);
        React.useEffect(() => {
          if (open) {
            setQ('');
            setSel(0);
            setTimeout(() => inputRef.current && inputRef.current.focus(), 20);
          }
        }, [open]);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        if (!open) return null;
        const filtered = commands.filter((c) =>
          (c.label + ' ' + (c.group || ''))
            .toLowerCase()
            .includes(q.toLowerCase()),
        );
        const run = (c) => {
          onClose();
          if (c.run) c.run();
        };
        const onKey = (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSel((s) => Math.min(filtered.length - 1, s + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSel((s) => Math.max(0, s - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[sel]) run(filtered[sel]);
          }
        };
        let lastGroup = null;
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            onMouseDown: onClose,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'cmdk',
              role: 'dialog',
              'aria-label': 'Command palette',
              onMouseDown: (e) => e.stopPropagation(),
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'cmdk-in',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'search',
              }),
              /*#__PURE__*/ React.createElement('input', {
                ref: inputRef,
                value: q,
                placeholder: 'Search actions, pages, people\u2026',
                onChange: (e) => {
                  setQ(e.target.value);
                  setSel(0);
                },
                onKeyDown: onKey,
              }),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, 'Esc'),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'cmdk-list',
              },
              filtered.length === 0 &&
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'cmdk-empty',
                  },
                  'No matches for \u201C',
                  q,
                  '\u201D.',
                ),
              filtered.map((c, i) => {
                const head =
                  c.group && c.group !== lastGroup
                    ? /*#__PURE__*/ React.createElement(
                        'div',
                        {
                          className: 'cmdk-cap',
                          key: 'g' + i,
                        },
                        c.group,
                      )
                    : null;
                lastGroup = c.group;
                return /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  {
                    key: c.id,
                  },
                  head,
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'cmdk-item' + (i === sel ? ' active' : ''),
                      onMouseEnter: () => setSel(i),
                      onClick: () => run(c),
                    },
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'ic',
                      },
                      /*#__PURE__*/ React.createElement(Icon, {
                        n: c.icon,
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'lbl',
                      },
                      c.label,
                    ),
                    c.hint &&
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'hint',
                        },
                        c.hint,
                      ),
                  ),
                );
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'cmdk-foot',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u2191'),
                /*#__PURE__*/ React.createElement('kbd', null, '\u2193'),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't-muted',
                  style: {
                    fontSize: 'var(--text-xs)',
                  },
                },
                'navigate',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'kbd',
                },
                /*#__PURE__*/ React.createElement('kbd', null, '\u21B5'),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 't-muted',
                  style: {
                    fontSize: 'var(--text-xs)',
                  },
                },
                'run',
              ),
            ),
          ),
        );
      }

      // ---- keyboard help ------------------------------------------
      function KeyHelp({ open, onClose, extra = [] }) {
        React.useEffect(() => {
          if (open && window.lucide) window.lucide.createIcons();
        });
        if (!open) return null;
        const groups = [
          {
            cap: 'Global',
            rows: [
              ['Command palette', ['⌘', 'K']],
              ['Search', ['/']],
              ['This help', ['?']],
              ['Close / back', ['Esc']],
            ],
          },
          {
            cap: 'Go to',
            rows: [
              ['Dashboard', ['g', 'd']],
              ['Work Orders', ['g', 'w']],
              ['Contracts', ['g', 'c']],
              ['Fleet', ['g', 'f']],
              ['Members', ['g', 'm']],
            ],
          },
          {
            cap: 'Lists & tables',
            rows: [
              ['Move selection', ['↑', '↓']],
              ['Vim move', ['j', 'k']],
              ['First / last', ['Home', 'End']],
              ['Open row', ['↵']],
            ],
          },
          {
            cap: 'This page',
            rows: extra.length
              ? extra
              : [
                  ['New item', ['n']],
                  ['Toggle theme', ['t']],
                ],
          },
        ];
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'scrim',
            onMouseDown: onClose,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'khelp',
              role: 'dialog',
              'aria-label': 'Keyboard shortcuts',
              onMouseDown: (e) => e.stopPropagation(),
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'khelp-head',
              },
              /*#__PURE__*/ React.createElement(
                'h2',
                null,
                'Keyboard shortcuts',
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'ibtn',
                  onClick: onClose,
                  'aria-label': 'Close',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'x',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'khelp-grid',
              },
              groups.map((g) =>
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    key: g.cap,
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'grp-cap',
                    },
                    g.cap,
                  ),
                  g.rows.map((r, i) =>
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'krow',
                        key: i,
                      },
                      /*#__PURE__*/ React.createElement('span', null, r[0]),
                      /*#__PURE__*/ React.createElement(Kbd, {
                        keys: r[1],
                      }),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }

      // ---- the shell ----------------------------------------------
      function AppShell({
        active,
        title,
        children,
        commands = [],
        helpExtra = [],
        onNew,
        searchPlaceholder = 'Search…',
      }) {
        const { theme, setTheme, accent, setAccent } = useChrome();
        const [cmdOpen, setCmdOpen] = React.useState(false);
        const [helpOpen, setHelpOpen] = React.useState(false);
        const [navOpen, setNavOpen] = React.useState(false);
        const [toasts, setToasts] = React.useState([]);
        const gPending = React.useRef(false);
        const pushToast = React.useCallback((msg, icon = 'check') => {
          const id = Math.random().toString(36).slice(2);
          setToasts((t) => [
            ...t,
            {
              id,
              msg,
              icon,
            },
          ]);
          setTimeout(
            () => setToasts((t) => t.filter((x) => x.id !== id)),
            2600,
          );
        }, []);
        // expose toast globally so page-level commands can fire it
        React.useEffect(() => {
          window.__toast = pushToast;
          return () => {
            if (window.__toast === pushToast) delete window.__toast;
          };
        }, [pushToast]);
        const go = (href) => {
          if (href && href !== '#') window.location.href = href;
        };
        const toggleTheme = () =>
          setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

        // build default command set (nav + theme + page commands)
        const allCommands = React.useMemo(() => {
          const navCmds = NAV.filter((n) => !n.soon).map((n) => ({
            id: 'nav-' + n.id,
            group: 'Go to',
            icon: n.icon,
            label: n.label,
            hint: 'g ' + n.key,
            run: () => go(n.href),
          }));
          const sys = [
            {
              id: 'theme',
              group: 'System',
              icon: theme === 'dark' ? 'sun' : 'moon',
              label:
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode',
              run: toggleTheme,
            },
            {
              id: 'accent',
              group: 'System',
              icon: 'palette',
              label: 'Toggle accent (Aqua / Coral)',
              run: () => setAccent((a) => (a === 'aqua' ? 'coral' : 'aqua')),
            },
            {
              id: 'help',
              group: 'System',
              icon: 'keyboard',
              label: 'Keyboard shortcuts',
              hint: '?',
              run: () => setHelpOpen(true),
            },
          ];
          return [...commands, ...navCmds, ...sys];
        }, [commands, theme]);

        // global keyboard
        React.useEffect(() => {
          const onKey = (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            const typing =
              tag === 'input' ||
              tag === 'textarea' ||
              e.target.isContentEditable;
            // ⌘K / Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              setCmdOpen((o) => !o);
              return;
            }
            if (e.key === 'Escape') {
              setCmdOpen(false);
              setHelpOpen(false);
              setNavOpen(false);
              return;
            }
            if (typing) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            // g-then-key navigation
            if (gPending.current) {
              gPending.current = false;
              const target = NAV.find((n) => n.key === e.key.toLowerCase());
              if (target) {
                e.preventDefault();
                go(target.href);
                return;
              }
            }
            if (e.key === 'g') {
              gPending.current = true;
              setTimeout(() => {
                gPending.current = false;
              }, 900);
              return;
            }
            if (e.key === '/') {
              e.preventDefault();
              setCmdOpen(true);
              return;
            }
            if (e.key === '?') {
              e.preventDefault();
              setHelpOpen(true);
              return;
            }
            if (e.key === 't') {
              toggleTheme();
              return;
            }
            if (e.key === 'n' && onNew) {
              e.preventDefault();
              onNew();
              return;
            }
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        }, [onNew, theme]);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const activeNav = NAV.find((n) => n.id === active);
        return /*#__PURE__*/ React.createElement(
          ToastCtx.Provider,
          {
            value: pushToast,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'app' + (navOpen ? ' nav-open' : ''),
              'data-theme': theme,
              'data-accent': accent,
            },
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'skip',
                href: '#main',
              },
              'Skip to content',
            ),
            /*#__PURE__*/ React.createElement(
              'aside',
              {
                className: 'sidebar',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-head',
                },
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'side-org',
                    'aria-label': 'Switch organization',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'badge',
                    },
                    'AV',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'nm',
                      },
                      'Atlas Vanguard',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'role',
                      },
                      'Quartermaster',
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'chev',
                    },
                    /*#__PURE__*/ React.createElement(Icon, {
                      n: 'chevrons-up-down',
                    }),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'nav',
                {
                  className: 'side-nav',
                  'aria-label': 'Primary',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'side-cap',
                  },
                  'Operations',
                ),
                NAV.map((n) =>
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      key: n.id,
                      className:
                        'side-link' +
                        (n.id === active ? ' active' : '') +
                        (n.soon ? ' soon' : ''),
                      href: n.soon ? undefined : n.href,
                      'aria-current': n.id === active ? 'page' : undefined,
                      'aria-disabled': n.soon || undefined,
                    },
                    /*#__PURE__*/ React.createElement(Icon, {
                      n: n.icon,
                    }),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'lbl',
                      },
                      n.label,
                    ),
                    n.soon
                      ? /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'soon-tag',
                          },
                          'soon',
                        )
                      : /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'key',
                          },
                          n.key,
                        ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'side-cap',
                  },
                  'Assets',
                ),
                NAV_SECONDARY.map((n) =>
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      key: n.id,
                      className:
                        'side-link' +
                        (n.id === active ? ' active' : '') +
                        (n.soon ? ' soon' : ''),
                      href: n.soon ? undefined : n.href,
                      'aria-current': n.id === active ? 'page' : undefined,
                      'aria-disabled': n.soon || undefined,
                    },
                    /*#__PURE__*/ React.createElement(Icon, {
                      n: n.icon,
                    }),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'lbl',
                      },
                      n.label,
                    ),
                    n.soon
                      ? /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'soon-tag',
                          },
                          'soon',
                        )
                      : n.id === active
                        ? null
                        : /*#__PURE__*/ React.createElement('span', {
                            className: 'key',
                          }),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-foot',
                },
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'side-help',
                    onClick: () => setHelpOpen(true),
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'keyboard',
                  }),
                  ' Keyboard shortcuts ',
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'kbd',
                    },
                    /*#__PURE__*/ React.createElement('kbd', null, '?'),
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'main',
              },
              /*#__PURE__*/ React.createElement(
                'header',
                {
                  className: 'appbar',
                },
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'ibtn side-toggle',
                    'aria-label': 'Menu',
                    onClick: () => setNavOpen((o) => !o),
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'menu',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'button',
                  {
                    className: 'appbar-search',
                    onClick: () => setCmdOpen(true),
                    'aria-label': 'Search and commands',
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'search',
                  }),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ph',
                    },
                    searchPlaceholder,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'kbd',
                    },
                    /*#__PURE__*/ React.createElement('kbd', null, '\u2318'),
                    /*#__PURE__*/ React.createElement('kbd', null, 'K'),
                  ),
                ),
                /*#__PURE__*/ React.createElement('span', {
                  className: 'appbar-spacer',
                }),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'appbar-right',
                  },
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'ibtn',
                      onClick: toggleTheme,
                      'aria-label':
                        theme === 'dark'
                          ? 'Switch to light mode'
                          : 'Switch to dark mode',
                      title: 'Toggle theme (t)',
                    },
                    /*#__PURE__*/ React.createElement(Icon, {
                      n: theme === 'dark' ? 'sun' : 'moon',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'button',
                    {
                      className: 'ibtn',
                      'aria-label': 'Notifications',
                    },
                    /*#__PURE__*/ React.createElement(Icon, {
                      n: 'bell',
                    }),
                    /*#__PURE__*/ React.createElement('span', {
                      className: 'dot',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      className: 'uavatar',
                      href: 'Profile.html',
                      'aria-label': 'Account \xB7 My Profile',
                      title: 'My Profile',
                      style: {
                        textDecoration: 'none',
                      },
                    },
                    'H',
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'main',
                {
                  className: 'page',
                  id: 'main',
                },
                children,
              ),
            ),
            /*#__PURE__*/ React.createElement(CommandPalette, {
              open: cmdOpen,
              onClose: () => setCmdOpen(false),
              commands: allCommands,
            }),
            /*#__PURE__*/ React.createElement(KeyHelp, {
              open: helpOpen,
              onClose: () => setHelpOpen(false),
              extra: helpExtra,
            }),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'toasts',
                'aria-live': 'polite',
              },
              toasts.map((t) =>
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'toast',
                    key: t.id,
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: t.icon,
                  }),
                  t.msg,
                ),
              ),
            ),
          ),
        );
      }
      Object.assign(window, {
        StationIcon: Icon,
        NAV,
        useRoving,
        useChrome,
        useToast,
        Kbd,
        Segmented,
        StatusPill,
        StatStrip,
        AvatarChip,
        avColor,
        AppShell,
      });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/app-shell.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/inventory-data.jsx
  try {
    (() => {
      // ============================================================
      // Station — Inventory data & helpers
      // Mock UEX catalog + personal/org inventory records, mirroring the
      // real app's data model (uexItemId, categoryName, quantity, notes,
      // sharedOrgId). Exposed on window for Inventory.jsx.
      // ============================================================

      // category families with tint colors (Star Citizen commodity/component types)
      const INV_CATEGORIES = [
        {
          id: 1,
          name: 'Refined Ore',
          color: '#5BD6B0',
        },
        {
          id: 2,
          name: 'Raw Ore',
          color: '#C2724B',
        },
        {
          id: 3,
          name: 'Salvage',
          color: '#C879D8',
        },
        {
          id: 4,
          name: 'Components',
          color: '#7CBEF9',
        },
        {
          id: 5,
          name: 'Weapons',
          color: '#E06A52',
        },
        {
          id: 6,
          name: 'Ship Weapons',
          color: '#E0913A',
        },
        {
          id: 7,
          name: 'Consumables',
          color: '#5BD6B0',
        },
        {
          id: 8,
          name: 'Trade Goods',
          color: '#E0B23A',
        },
        {
          id: 9,
          name: 'Liveries',
          color: '#9AA7B2',
        },
        {
          id: 10,
          name: 'Vehicles',
          color: '#6E7BF2',
        },
      ];
      const catById = (id) =>
        INV_CATEGORIES.find((c) => c.id === id) || INV_CATEGORIES[0];
      const catColor = (name) =>
        (INV_CATEGORIES.find((c) => c.name === name) || {}).color ||
        'var(--text-faint)';
      const catIcon = (name) =>
        ({
          'Refined Ore': 'gem',
          'Raw Ore': 'mountain',
          Salvage: 'recycle',
          Components: 'cpu',
          Weapons: 'crosshair',
          'Ship Weapons': 'rocket',
          Consumables: 'flask-conical',
          'Trade Goods': 'package',
          Liveries: 'paintbrush',
          Vehicles: 'car',
        })[name] || 'box';

      // UEX catalog (searchable in the add dialog)
      const UEX_CATALOG = [
        {
          uexId: 101,
          name: 'Quantanium',
          categoryId: 1,
        },
        {
          uexId: 102,
          name: 'Bexalite',
          categoryId: 1,
        },
        {
          uexId: 103,
          name: 'Taranite',
          categoryId: 1,
        },
        {
          uexId: 104,
          name: 'Laranite',
          categoryId: 1,
        },
        {
          uexId: 105,
          name: 'Agricium',
          categoryId: 1,
        },
        {
          uexId: 106,
          name: 'Gold (refined)',
          categoryId: 1,
        },
        {
          uexId: 107,
          name: 'Titanium',
          categoryId: 1,
        },
        {
          uexId: 108,
          name: 'Hephaestanite',
          categoryId: 1,
        },
        {
          uexId: 201,
          name: 'Quantanium (raw)',
          categoryId: 2,
        },
        {
          uexId: 202,
          name: 'Iron (raw)',
          categoryId: 2,
        },
        {
          uexId: 203,
          name: 'Tungsten (raw)',
          categoryId: 2,
        },
        {
          uexId: 301,
          name: 'Recycled Material Composite',
          categoryId: 3,
        },
        {
          uexId: 302,
          name: 'Construction Materials',
          categoryId: 3,
        },
        {
          uexId: 303,
          name: 'Ship Hull Plating',
          categoryId: 3,
        },
        {
          uexId: 401,
          name: 'C788 Sa Power Plant',
          categoryId: 4,
        },
        {
          uexId: 402,
          name: 'FR-76 Shield Generator',
          categoryId: 4,
        },
        {
          uexId: 403,
          name: 'Atlas Quantum Drive',
          categoryId: 4,
        },
        {
          uexId: 404,
          name: 'JS-300 Jump Module',
          categoryId: 4,
        },
        {
          uexId: 501,
          name: 'Demeco LMG',
          categoryId: 5,
        },
        {
          uexId: 502,
          name: 'P8-AR Assault Rifle',
          categoryId: 5,
        },
        {
          uexId: 503,
          name: 'Gemini S71 Rifle',
          categoryId: 5,
        },
        {
          uexId: 601,
          name: 'CF-337 Panther Repeater',
          categoryId: 6,
        },
        {
          uexId: 602,
          name: 'Attrition-3 Laser Cannon',
          categoryId: 6,
        },
        {
          uexId: 701,
          name: 'Medical Supplies',
          categoryId: 7,
        },
        {
          uexId: 702,
          name: 'Medical Pen (Hemozal)',
          categoryId: 7,
        },
        {
          uexId: 703,
          name: 'Oxygen Canister',
          categoryId: 7,
        },
        {
          uexId: 801,
          name: 'Stims',
          categoryId: 8,
        },
        {
          uexId: 802,
          name: 'Distilled Spirits',
          categoryId: 8,
        },
        {
          uexId: 803,
          name: 'Pressurized Ice',
          categoryId: 8,
        },
        {
          uexId: 901,
          name: '100i Frostbite Livery',
          categoryId: 9,
        },
        {
          uexId: 902,
          name: 'Cutlass Skull & Crossbones',
          categoryId: 9,
        },
        {
          uexId: 1001,
          name: 'Greycat ROC',
          categoryId: 10,
        },
        {
          uexId: 1002,
          name: 'Greycat PTV',
          categoryId: 10,
        },
      ];

      // orgs the user belongs to + permission sets
      const INV_ORGS = [
        {
          id: 1,
          name: 'Atlas Vanguard',
          badge: 'AV',
          perms: ['view', 'edit', 'admin'],
        },
        {
          id: 2,
          name: 'Crimson Fleet',
          badge: 'CF',
          perms: ['view'],
        },
      ];

      // personal inventory records
      let _id = 1;
      const rec = (uexId, quantity, opts = {}) => {
        const c = UEX_CATALOG.find((x) => x.uexId === uexId);
        const cat = catById(c.categoryId);
        return {
          id: _id++,
          uexItemId: uexId,
          itemName: c.name,
          categoryName: cat.name,
          quantity,
          notes: opts.notes || '',
          sharedOrgId: opts.sharedOrgId || null,
          location: opts.location || 'Personal hangar',
          modified: opts.modified || '2d ago',
        };
      };
      const PERSONAL_ITEMS = [
        rec(101, 96, {
          location: 'ARC-L1 Storage',
          modified: '2h ago',
        }),
        rec(103, 31, {
          sharedOrgId: 1,
          location: 'CRU-L1 Storage',
          modified: '5h ago',
        }),
        rec(104, 23, {
          location: 'Lyria Outpost',
          modified: '1d ago',
        }),
        rec(301, 61, {
          sharedOrgId: 1,
          location: 'CRU-L1',
          modified: '3h ago',
        }),
        rec(403, 1, {
          notes: 'Spare — for the Prospector',
          location: 'New Babbage',
          modified: '4d ago',
        }),
        rec(501, 1, {
          location: 'Area18 · Hangar 4',
          modified: '1w ago',
        }),
        rec(502, 2, {
          sharedOrgId: 1,
          location: 'Port Olisar',
          modified: '6h ago',
        }),
        rec(701, 48, {
          location: 'Atlas Hangar',
          modified: '2d ago',
        }),
        rec(901, 3, {
          location: 'Everus Harbor',
          modified: '3w ago',
        }),
        rec(1001, 2, {
          location: 'New Babbage',
          modified: '5d ago',
        }),
        rec(102, 54, {
          location: 'Aaron Halo cache',
          modified: '8h ago',
        }),
        rec(202, 1240, {
          sharedOrgId: 1,
          location: 'CRU-L1 Storage',
          modified: '1h ago',
        }),
        rec(802, 18, {
          location: 'microTech',
          modified: '2w ago',
        }),
        rec(303, 12, {
          location: 'CRU-L1 Reclamation',
          modified: '7h ago',
        }),
      ];

      // org inventory records (Atlas Vanguard)
      const ORG_ITEMS = [
        rec(101, 420, {
          location: 'Org vault · ARC-L1',
          modified: '1h ago',
        }),
        rec(403, 6, {
          location: 'Fleet stores',
          modified: '3d ago',
        }),
        rec(402, 9, {
          location: 'Fleet stores',
          modified: '3d ago',
        }),
        rec(701, 240, {
          location: 'Atlas medbay',
          modified: '12h ago',
        }),
        rec(502, 14, {
          location: 'Armory',
          modified: '1d ago',
        }),
        rec(601, 8, {
          location: 'Armory',
          modified: '2d ago',
        }),
        rec(301, 880, {
          location: 'Org vault · CRU-L1',
          modified: '4h ago',
        }),
        rec(803, 320, {
          location: 'Refinery dock',
          modified: '6h ago',
        }),
      ];
      window.StationInv = {
        INV_CATEGORIES,
        UEX_CATALOG,
        INV_ORGS,
        PERSONAL_ITEMS,
        ORG_ITEMS,
        catById,
        catColor,
        catIcon,
      };
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/inventory-data.jsx',
      error: String((e && e.message) || e),
    });
  }

  // app/inventory-rows.jsx
  try {
    (() => {
      // ============================================================
      // Station — Inventory page
      // Reimplements the app's Inventory: personal/org views, filters,
      // sort, group, density editor mode (inline qty edit + new row),
      // row actions (edit/split/share/unshare/delete), catalog add dialog.
      // Keyboard-first on the shared app shell.
      // ============================================================

      const NI = window.StationIcon;
      const {
        INV_CATEGORIES,
        UEX_CATALOG,
        INV_ORGS,
        PERSONAL_ITEMS,
        ORG_ITEMS,
        catColor,
        catIcon,
      } = window.StationInv;
      const qfmt = (n) =>
        Number(n).toLocaleString('en-US', {
          maximumFractionDigits: 6,
        });
      const abbr = (n) =>
        n >= 1e6
          ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
          : n >= 1e3
            ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
            : String(Math.round(n));

      // ============== row ==============
      function InvRow({
        it,
        editing,
        orgMode,
        draft,
        qtyState,
        qtyErr,
        isActive,
        tabIndex,
        regRef,
        onSelect,
        onQtyFocus,
        onQtyChange,
        onQtyCommit,
        onAction,
      }) {
        const shared = it.sharedOrgId;
        const org = INV_ORGS.find((o) => o.id === it.sharedOrgId);
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            ref: regRef,
            tabIndex: tabIndex,
            'aria-selected': isActive,
            onFocus: onSelect,
          },
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 't-ent',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'inv-thumb',
                },
                /*#__PURE__*/ React.createElement(NI, {
                  n: catIcon(it.categoryName),
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                null,
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nm',
                  },
                  it.itemName,
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'sub',
                  },
                  it.notes ? it.notes : it.location,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'divc',
                style: {
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                },
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'catdot',
                style: {
                  background: catColor(it.categoryName),
                },
              }),
              it.categoryName,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'qty-cell',
            },
            editing
              ? /*#__PURE__*/ React.createElement(
                  'div',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'qty-edit',
                    },
                    /*#__PURE__*/ React.createElement('input', {
                      className: 'qty-input',
                      type: 'text',
                      inputMode: 'decimal',
                      value: draft != null ? draft : it.quantity,
                      ref: regRef ? undefined : undefined,
                      onFocus: onQtyFocus,
                      onChange: (e) => onQtyChange(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onQtyCommit(true);
                        }
                      },
                      onBlur: () => onQtyCommit(false),
                      'aria-label': 'Quantity for ' + it.itemName,
                    }),
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'qty-state ' + (qtyState || ''),
                      },
                      qtyState === 'saving' &&
                        /*#__PURE__*/ React.createElement(NI, {
                          n: 'loader',
                        }),
                      qtyState === 'saved' &&
                        /*#__PURE__*/ React.createElement(NI, {
                          n: 'check',
                        }),
                    ),
                  ),
                  qtyErr &&
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'qty-err',
                      },
                      qtyErr,
                    ),
                )
              : /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'qty-static',
                    tabIndex: -1,
                  },
                  qfmt(it.quantity),
                ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            null,
            orgMode
              ? /*#__PURE__*/ React.createElement(
                  StatusPill,
                  {
                    tone: 'brand',
                    icon: 'building-2',
                  },
                  'Org stock',
                )
              : shared
                ? /*#__PURE__*/ React.createElement(
                    StatusPill,
                    {
                      tone: 'success',
                      icon: 'share-2',
                    },
                    org ? org.name : 'Shared',
                  )
                : /*#__PURE__*/ React.createElement(
                    StatusPill,
                    {
                      tone: 'neutral',
                      icon: 'lock',
                    },
                    'Private',
                  ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 't-muted t-mono',
              style: {
                fontSize: 'var(--text-xs)',
              },
            },
            it.modified,
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              style: {
                width: 44,
              },
            },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'row-act',
                'aria-label': 'Actions for ' + it.itemName,
                onClick: (e) => {
                  e.stopPropagation();
                  onAction(e.currentTarget, it);
                },
              },
              /*#__PURE__*/ React.createElement(NI, {
                n: 'more-horizontal',
              }),
            ),
          ),
        );
      }

      // ============== new row (editor mode) ==============
      function NewRow({ orgMode, onAdd }) {
        const [q, setQ] = React.useState('');
        const [sel, setSel] = React.useState(null);
        const [qty, setQty] = React.useState('');
        const [open, setOpen] = React.useState(false);
        const [hi, setHi] = React.useState(0);
        const itemRef = React.useRef(null);
        const matches = React.useMemo(() => {
          const s = q.trim().toLowerCase();
          if (!s) return UEX_CATALOG.slice(0, 8);
          return UEX_CATALOG.filter((c) =>
            c.name.toLowerCase().includes(s),
          ).slice(0, 8);
        }, [q]);
        const choose = (c) => {
          setSel(c);
          setQ(c.name);
          setOpen(false);
        };
        const save = () => {
          if (!sel) {
            itemRef.current && itemRef.current.focus();
            return;
          }
          const n = Number(qty);
          if (!Number.isFinite(n) || n <= 0) return;
          onAdd(sel, n);
          setSel(null);
          setQ('');
          setQty('');
          setHi(0);
          itemRef.current && itemRef.current.focus();
        };
        return /*#__PURE__*/ React.createElement(
          'tr',
          {
            className: 'new-row',
          },
          /*#__PURE__*/ React.createElement(
            'td',
            {
              colSpan: 2,
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'new-row-item',
              },
              /*#__PURE__*/ React.createElement(NI, {
                n: 'plus',
              }),
              /*#__PURE__*/ React.createElement('input', {
                ref: itemRef,
                value: q,
                placeholder: orgMode
                  ? 'Add org item — search catalog…'
                  : 'Add item — search catalog…',
                onChange: (e) => {
                  setQ(e.target.value);
                  setSel(null);
                  setOpen(true);
                  setHi(0);
                },
                onFocus: () => setOpen(true),
                onKeyDown: (e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHi((h) => Math.min(matches.length - 1, h + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHi((h) => Math.max(0, h - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (matches[hi]) choose(matches[hi]);
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                },
                onBlur: () => setTimeout(() => setOpen(false), 150),
              }),
              open &&
                matches.length > 0 &&
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'nr-suggest',
                  },
                  matches.map((c, i) =>
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        key: c.uexId,
                        className: 'nr-opt' + (i === hi ? ' active' : ''),
                        onMouseDown: (e) => {
                          e.preventDefault();
                          choose(c);
                        },
                        onMouseEnter: () => setHi(i),
                      },
                      /*#__PURE__*/ React.createElement('span', {
                        className: 'catdot',
                        style: {
                          background: catColor(
                            (
                              INV_CATEGORIES.find(
                                (x) => x.id === c.categoryId,
                              ) || {}
                            ).name,
                          ),
                        },
                      }),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'nm',
                        },
                        c.name,
                      ),
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'cat',
                        },
                        (
                          INV_CATEGORIES.find((x) => x.id === c.categoryId) ||
                          {}
                        ).name,
                      ),
                    ),
                  ),
                ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              className: 'qty-cell',
            },
            /*#__PURE__*/ React.createElement('input', {
              className: 'new-row-qty',
              type: 'text',
              inputMode: 'decimal',
              placeholder: 'Qty',
              value: qty,
              onChange: (e) => setQty(e.target.value),
              onKeyDown: (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              },
              'aria-label': 'New item quantity',
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'td',
            {
              colSpan: 2,
            },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'btn btn-primary btn-sm',
                onClick: save,
              },
              /*#__PURE__*/ React.createElement(NI, {
                n: 'check',
              }),
              ' Add row',
            ),
          ),
          /*#__PURE__*/ React.createElement('td', null),
        );
      }
      window.InvRow = InvRow;
      window.NewRow = NewRow;
      window._invHelpers = {
        qfmt,
        abbr,
      };
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'app/inventory-rows.jsx',
      error: String((e && e.message) || e),
    });
  }

  // components/core/Badge.jsx
  try {
    (() => {
      function _extends() {
        return (
          (_extends = Object.assign
            ? Object.assign.bind()
            : function (n) {
                for (var e = 1; e < arguments.length; e++) {
                  var t = arguments[e];
                  for (var r in t)
                    ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
                }
                return n;
              }),
          _extends.apply(null, arguments)
        );
      }
      /**
       * Compact status / category label. Mono-cased pill used across Station
       * for fleet readiness, contract states, plan tiers, etc.
       */
      function Badge({
        tone = 'brand',
        variant = 'soft',
        children,
        style,
        ...rest
      }) {
        const palette = {
          brand: {
            c: 'var(--brand)',
            soft: 'var(--brand-subtle)',
          },
          warm: {
            c: 'var(--coral-500)',
            soft: 'color-mix(in srgb, var(--coral-500) 18%, transparent)',
          },
          success: {
            c: 'var(--success-500)',
            soft: 'color-mix(in srgb, var(--success-500) 16%, transparent)',
          },
          warning: {
            c: 'var(--warning-500)',
            soft: 'color-mix(in srgb, var(--warning-500) 18%, transparent)',
          },
          danger: {
            c: 'var(--danger-500)',
            soft: 'color-mix(in srgb, var(--danger-500) 16%, transparent)',
          },
          neutral: {
            c: 'var(--text-muted)',
            soft: 'var(--surface-sunken)',
          },
        };
        const p = palette[tone] || palette.brand;
        const base = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xs)',
          fontWeight: 'var(--weight-semibold)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          padding: '3px 9px',
          borderRadius: 'var(--radius-pill)',
          lineHeight: 1.5,
          ...(variant === 'solid'
            ? {
                background: p.c,
                color: tone === 'brand' ? 'var(--brand-contrast)' : '#fff',
              }
            : {
                background: p.soft,
                color: p.c,
              }),
          ...style,
        };
        return /*#__PURE__*/ React.createElement(
          'span',
          _extends(
            {
              style: base,
            },
            rest,
          ),
          children,
        );
      }
      Object.assign(__ds_scope, { Badge });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'components/core/Badge.jsx',
      error: String((e && e.message) || e),
    });
  }

  // components/core/Button.jsx
  try {
    (() => {
      function _extends() {
        return (
          (_extends = Object.assign
            ? Object.assign.bind()
            : function (n) {
                for (var e = 1; e < arguments.length; e++) {
                  var t = arguments[e];
                  for (var r in t)
                    ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
                }
                return n;
              }),
          _extends.apply(null, arguments)
        );
      }
      /**
       * Presstronic / Station primary action button.
       * Styled entirely from design-system tokens so it adapts to light/dark
       * and to the Station sub-brand automatically.
       */
      function Button({
        variant = 'primary',
        size = 'md',
        type = 'button',
        href,
        disabled = false,
        iconLeft,
        iconRight,
        children,
        style,
        ...rest
      }) {
        const sizes = {
          sm: {
            padding: '9px 16px',
            fontSize: 'var(--text-sm)',
          },
          md: {
            padding: '13px 22px',
            fontSize: 'var(--text-sm)',
          },
          lg: {
            padding: '16px 28px',
            fontSize: 'var(--text-base)',
          },
        };
        const variants = {
          primary: {
            background: 'var(--brand)',
            color: 'var(--brand-contrast)',
            borderColor: 'transparent',
            boxShadow: 'var(--glow-aqua)',
          },
          warm: {
            background: 'var(--coral-500)',
            color: 'var(--white)',
            borderColor: 'transparent',
            boxShadow: 'var(--glow-coral)',
          },
          ghost: {
            background: 'transparent',
            color: 'var(--text-strong)',
            borderColor: 'var(--border-strong)',
            boxShadow: 'none',
          },
          subtle: {
            background: 'var(--brand-subtle)',
            color: 'var(--brand)',
            borderColor: 'transparent',
            boxShadow: 'none',
          },
        };
        const base = {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          fontFamily: 'var(--font-body)',
          fontWeight: 'var(--weight-semibold)',
          lineHeight: 1,
          borderRadius: 'var(--radius-md)',
          border: '1px solid transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition:
            'transform 120ms cubic-bezier(0.22,1,0.36,1), background 200ms, box-shadow 200ms, border-color 200ms',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          ...sizes[size],
          ...variants[variant],
          ...style,
        };
        const content = /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          iconLeft,
          children,
          iconRight,
        );
        if (href && !disabled) {
          return /*#__PURE__*/ React.createElement(
            'a',
            _extends(
              {
                href: href,
                style: base,
              },
              rest,
            ),
            content,
          );
        }
        return /*#__PURE__*/ React.createElement(
          'button',
          _extends(
            {
              type: type,
              disabled: disabled,
              style: base,
            },
            rest,
          ),
          content,
        );
      }
      Object.assign(__ds_scope, { Button });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'components/core/Button.jsx',
      error: String((e && e.message) || e),
    });
  }

  // dashboard/DashboardApp.jsx
  try {
    (() => {
      function _extends() {
        return (
          (_extends = Object.assign
            ? Object.assign.bind()
            : function (n) {
                for (var e = 1; e < arguments.length; e++) {
                  var t = arguments[e];
                  for (var r in t)
                    ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
                }
                return n;
              }),
          _extends.apply(null, arguments)
        );
      }
      // ============================================================
      // Station — post-login dashboard (DashboardApp)
      // Rebuilds the real Dashboard + InventoryPortlet on Presstronic tokens.
      // Tweaks: data state (empty/populated), summary-card style, accent.
      // ============================================================

      const USER = {
        name: 'hezeqiah',
        email: 'hez@station.app',
      };

      // ---- mock data: populated state ------------------------------
      const ITEMS_FULL = [
        {
          name: '100i Frostbite Livery',
          sku: 'UEX-100I-FRB',
          cat: 'Liveries',
          qty: 3,
          loc: 'Everus Harbor',
          status: 'Private',
          tone: 'neutral',
          ico: 'paintbrush',
        },
        {
          name: 'Demeco LMG',
          sku: 'UEX-WPN-DMC',
          cat: 'Personal Weapons',
          qty: 1,
          loc: 'Area18 · Hangar 4',
          status: 'Atlas Vanguard',
          tone: 'brand',
          ico: 'crosshair',
        },
        {
          name: 'P8-AR Assault Rifle',
          sku: 'UEX-WPN-P8AR',
          cat: 'Personal Weapons',
          qty: 2,
          loc: 'Port Olisar',
          status: 'Atlas Vanguard',
          tone: 'brand',
          ico: 'crosshair',
        },
        {
          name: 'Quantanium',
          sku: 'UEX-MAT-QNT',
          cat: 'Mining · Refined',
          qty: 1240,
          loc: 'CRU-L1 Storage',
          status: 'Shared',
          tone: 'success',
          ico: 'gem',
        },
        {
          name: 'Medical Supplies',
          sku: 'UEX-MED-SUP',
          cat: 'Consumables',
          qty: 48,
          loc: 'Atlas Hangar',
          status: 'Atlas Vanguard',
          tone: 'brand',
          ico: 'cross',
        },
        {
          name: 'Greycat ROC',
          sku: 'UEX-VEH-ROC',
          cat: 'Vehicles',
          qty: 2,
          loc: 'New Babbage',
          status: 'Private',
          tone: 'neutral',
          ico: 'truck',
        },
      ];
      const ITEMS_EMPTY = [
        {
          name: '100i Frostbite Livery',
          sku: 'UEX-100I-FRB',
          cat: 'Liveries',
          qty: 3,
          loc: 'Unknown',
          status: 'Private',
          tone: 'neutral',
          ico: 'paintbrush',
        },
        {
          name: 'Demeco LMG',
          sku: 'UEX-WPN-DMC',
          cat: 'Personal Weapons',
          qty: 1,
          loc: 'Unknown',
          status: 'Private',
          tone: 'neutral',
          ico: 'crosshair',
        },
        {
          name: 'P8-AR Assault Rifle',
          sku: 'UEX-WPN-P8AR',
          cat: 'Personal Weapons',
          qty: 2,
          loc: 'Unknown',
          status: 'Private',
          tone: 'neutral',
          ico: 'crosshair',
        },
      ];
      const Icon = ({ n, ...p }) =>
        /*#__PURE__*/ React.createElement(
          'i',
          _extends(
            {
              'data-lucide': n,
            },
            p,
          ),
        );

      // ---- top bar -------------------------------------------------
      function TopBar() {
        return /*#__PURE__*/ React.createElement(
          'header',
          {
            className: 'topbar',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'topbar-inner',
            },
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'logo',
                href: '#',
                'aria-label': 'Station home',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'logo-mark',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'orbit',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'logo-word',
                },
                'STATION',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'nav',
              {
                className: 'topbar-nav',
              },
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'topnav-link active',
                  href: '#',
                },
                'Overview',
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'topnav-link',
                  href: '#',
                },
                'Organizations',
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'topnav-link',
                  href: '#',
                },
                'Inventory',
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'topnav-link',
                  href: '#',
                },
                'Members',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'topbar-right',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'icon-btn',
                  'aria-label': 'Notifications',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'bell',
                }),
                /*#__PURE__*/ React.createElement('span', {
                  className: 'dot',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'avatar',
                  'aria-label': 'Account menu',
                },
                USER.name.charAt(0).toUpperCase(),
              ),
            ),
          ),
        );
      }

      // ---- welcome + quick stats -----------------------------------
      function Welcome({ populated }) {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'welcome',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'welcome-copy',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'eyebrow welcome-eyebrow',
              },
              'Command center',
            ),
            /*#__PURE__*/ React.createElement(
              'h1',
              null,
              'Welcome back, ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'name',
                },
                USER.name,
              ),
              '.',
            ),
            /*#__PURE__*/ React.createElement(
              'p',
              {
                className: 'welcome-sub',
              },
              USER.email,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'welcome-actions',
            },
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-ghost btn-sm',
                href: '#',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'settings-2',
              }),
              ' Settings',
            ),
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-primary btn-sm',
                href: '#',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'plus',
              }),
              ' New organization',
            ),
          ),
        );
      }
      function QuickStats() {
        const stats = [
          {
            k: 'Total items',
            ki: 'package',
            v: '1,296',
            d: '6 categories',
          },
          {
            k: 'Organizations',
            ki: 'users',
            v: '2',
            d: 'Atlas Vanguard +1',
          },
          {
            k: 'Shared items',
            ki: 'share-2',
            v: '291',
            d: '22% of inventory',
          },
          {
            k: 'Est. value',
            ki: 'coins',
            v: '8.42M',
            d: '+4.1% this cycle',
            up: true,
          },
        ];
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'qstats',
          },
          stats.map((s) =>
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'qstat',
                key: s.k,
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'k',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: s.ki,
                }),
                ' ',
                s.k,
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'v',
                },
                s.v,
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'd' + (s.up ? ' up' : ''),
                },
                s.d,
              ),
            ),
          ),
        );
      }

      // ---- summary cards -------------------------------------------
      function SummaryCards({ populated, cardStyle }) {
        if (cardStyle === 'stat' && populated) {
          return /*#__PURE__*/ React.createElement(
            'section',
            {
              className: 'summary-grid',
              'data-style': 'stat',
            },
            /*#__PURE__*/ React.createElement(
              'article',
              {
                className: 'scard link',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-ico',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'user-round',
                }),
              ),
              /*#__PURE__*/ React.createElement('h3', null, 'My Profile'),
              /*#__PURE__*/ React.createElement(
                'p',
                null,
                'View and update your profile, handle, and contact details.',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-foot',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-sm',
                    href: '#',
                  },
                  'Open profile ',
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'arrow-right',
                  }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'article',
              {
                className: 'scard',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-ico',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'users',
                }),
              ),
              /*#__PURE__*/ React.createElement('h3', null, 'Organizations'),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'big',
                },
                '2',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                null,
                'Atlas Vanguard \xB7 Crimson Fleet',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-foot',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-sm',
                    href: '#',
                  },
                  'Manage orgs ',
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'arrow-right',
                  }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'article',
              {
                className: 'scard',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-ico',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'mail',
                }),
              ),
              /*#__PURE__*/ React.createElement('h3', null, 'Invitations'),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'big',
                },
                '1',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                null,
                'Hollow Point Mercenaries invited you.',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-foot',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-primary btn-sm',
                    href: '#',
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'check',
                  }),
                  ' Review',
                ),
              ),
            ),
          );
        }
        if (populated) {
          return /*#__PURE__*/ React.createElement(
            'section',
            {
              className: 'summary-grid',
            },
            /*#__PURE__*/ React.createElement(
              'article',
              {
                className: 'scard link',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-ico',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'user-round',
                }),
              ),
              /*#__PURE__*/ React.createElement('h3', null, 'My Profile'),
              /*#__PURE__*/ React.createElement(
                'p',
                null,
                'View and update your profile information, handle, and contact details.',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-foot',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-sm',
                    href: '#',
                  },
                  'Open profile ',
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'arrow-right',
                  }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'article',
              {
                className: 'scard',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'scard-count',
                },
                '2 orgs',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-ico',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'users',
                }),
              ),
              /*#__PURE__*/ React.createElement('h3', null, 'My Organizations'),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'org-list',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'org-row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'org-badge',
                    },
                    'AV',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'org-name',
                      },
                      'Atlas Vanguard',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'org-meta',
                      },
                      'Quartermaster \xB7 312 members',
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'org-row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'org-badge',
                      style: {
                        background:
                          'linear-gradient(140deg, var(--coral-300), var(--coral-500))',
                      },
                    },
                    'CF',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'org-name',
                      },
                      'Crimson Fleet',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'org-meta',
                      },
                      'Member \xB7 88 members',
                    ),
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'article',
              {
                className: 'scard',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'scard-count',
                },
                '1 new',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-ico',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'mail',
                }),
              ),
              /*#__PURE__*/ React.createElement('h3', null, 'Invitations'),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'org-list',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'inv-row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'org-badge',
                      style: {
                        background:
                          'linear-gradient(140deg, var(--teal-300), var(--teal-500))',
                      },
                    },
                    'HP',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      style: {
                        flex: 1,
                      },
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'inv-name',
                      },
                      'Hollow Point Mercenaries',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'inv-meta',
                      },
                      'Invited you as Operative',
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'scard-foot',
                  style: {
                    display: 'flex',
                    gap: 'var(--space-2)',
                  },
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-primary btn-sm',
                    href: '#',
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'check',
                  }),
                  ' Accept',
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-sm',
                    href: '#',
                  },
                  'Decline',
                ),
              ),
            ),
          );
        }

        // empty / new-user state (matches the screenshot)
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'summary-grid',
          },
          /*#__PURE__*/ React.createElement(
            'article',
            {
              className: 'scard link',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'scard-ico',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'user-round',
              }),
            ),
            /*#__PURE__*/ React.createElement('h3', null, 'My Profile'),
            /*#__PURE__*/ React.createElement(
              'p',
              null,
              'View and update your profile information.',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'scard-foot',
              },
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-ghost btn-sm',
                  href: '#',
                },
                'Open profile ',
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'arrow-right',
                }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'article',
            {
              className: 'scard',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'scard-ico',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'users',
              }),
            ),
            /*#__PURE__*/ React.createElement('h3', null, 'My Organizations'),
            /*#__PURE__*/ React.createElement(
              'p',
              null,
              'You are not a member of any organizations yet.',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'scard-foot',
              },
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-primary btn-sm',
                  href: '#',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'plus',
                }),
                ' Create organization',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'article',
            {
              className: 'scard',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'scard-ico',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'mail',
              }),
            ),
            /*#__PURE__*/ React.createElement('h3', null, 'Invitations'),
            /*#__PURE__*/ React.createElement(
              'p',
              null,
              'No pending invitations.',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'scard-foot',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'chip-badge neutral',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'inbox',
                }),
                ' Inbox zero',
              ),
            ),
          ),
        );
      }

      // ---- inventory portlet ---------------------------------------
      function InventoryPortlet({ populated }) {
        const items = populated ? ITEMS_FULL : ITEMS_EMPTY;
        const [sharedOnly, setSharedOnly] = React.useState(false);
        const shown = sharedOnly
          ? items.filter((i) => i.status !== 'Private')
          : items;
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'portlet',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'portlet-head',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'portlet-ico',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'archive',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'portlet-title',
              },
              'My Inventory',
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'sub',
                },
                'Synced from UEX \xB7 Star Citizen',
              ),
            ),
            /*#__PURE__*/ React.createElement('span', {
              className: 'spacer',
            }),
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'icon-btn',
                'aria-label': 'Expand inventory',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'maximize-2',
              }),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'portlet-controls',
            },
            /*#__PURE__*/ React.createElement(
              'label',
              {
                className: 'search',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'search',
              }),
              /*#__PURE__*/ React.createElement('input', {
                type: 'text',
                placeholder: 'Search items\u2026',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'select',
              },
              /*#__PURE__*/ React.createElement('span', null, 'All categories'),
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'chevron-down',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'toggle-field' + (sharedOnly ? ' on' : ''),
                onClick: () => setSharedOnly((v) => !v),
                role: 'switch',
                'aria-checked': sharedOnly,
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'switch',
              }),
              /*#__PURE__*/ React.createElement('span', null, 'Shared only'),
            ),
          ),
          shown.length === 0
            ? /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'inv-empty',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'e-ico',
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    n: 'package-open',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'p',
                  null,
                  'No items match \u2014 try turning off \u201CShared only\u201D.',
                ),
              )
            : /*#__PURE__*/ React.createElement(
                'table',
                {
                  className: 'inv-table',
                },
                /*#__PURE__*/ React.createElement(
                  'thead',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'tr',
                    null,
                    /*#__PURE__*/ React.createElement('th', null, 'Item'),
                    /*#__PURE__*/ React.createElement('th', null, 'Category'),
                    /*#__PURE__*/ React.createElement(
                      'th',
                      {
                        className: 'num',
                      },
                      'Quantity',
                    ),
                    /*#__PURE__*/ React.createElement('th', null, 'Location'),
                    /*#__PURE__*/ React.createElement('th', null, 'Status'),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'tbody',
                  null,
                  shown.map((it) =>
                    /*#__PURE__*/ React.createElement(
                      'tr',
                      {
                        key: it.sku,
                      },
                      /*#__PURE__*/ React.createElement(
                        'td',
                        null,
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'inv-item',
                          },
                          /*#__PURE__*/ React.createElement(
                            'span',
                            {
                              className: 'thumb',
                            },
                            /*#__PURE__*/ React.createElement(Icon, {
                              n: it.ico,
                            }),
                          ),
                          /*#__PURE__*/ React.createElement(
                            'div',
                            null,
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'nm',
                              },
                              it.name,
                            ),
                            /*#__PURE__*/ React.createElement(
                              'div',
                              {
                                className: 'sku',
                              },
                              it.sku,
                            ),
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'td',
                        {
                          className: 'cell-muted',
                        },
                        it.cat,
                      ),
                      /*#__PURE__*/ React.createElement(
                        'td',
                        {
                          className: 'cell-num',
                        },
                        it.qty.toLocaleString(),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'td',
                        {
                          className: 'cell-muted',
                        },
                        it.loc,
                      ),
                      /*#__PURE__*/ React.createElement(
                        'td',
                        null,
                        /*#__PURE__*/ React.createElement(
                          'span',
                          {
                            className: 'chip-badge ' + it.tone,
                          },
                          it.tone === 'brand' &&
                            /*#__PURE__*/ React.createElement(Icon, {
                              n: 'shield',
                            }),
                          it.tone === 'success' &&
                            /*#__PURE__*/ React.createElement(Icon, {
                              n: 'share-2',
                            }),
                          it.tone === 'neutral' &&
                            /*#__PURE__*/ React.createElement(Icon, {
                              n: 'lock',
                            }),
                          it.status,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pagination',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'rpp',
              },
              'Rows per page: ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'pill',
                },
                '10 ',
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'chevron-down',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              null,
              '1\u2013',
              shown.length,
              ' of ',
              shown.length,
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'pager',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  disabled: true,
                  'aria-label': 'Previous page',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'chevron-left',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  disabled: true,
                  'aria-label': 'Next page',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'chevron-right',
                }),
              ),
            ),
          ),
        );
      }

      // ---- quick actions -------------------------------------------
      function QuickActions({ populated }) {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'qactions',
          },
          /*#__PURE__*/ React.createElement('h2', null, 'Quick actions'),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'qactions-row',
            },
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-primary',
                href: '#',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'users',
              }),
              ' ',
              populated ? 'New organization' : 'Create organization',
            ),
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-ghost',
                href: '#',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'user-round-pen',
              }),
              ' Edit profile',
            ),
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-ghost',
                href: '#',
              },
              /*#__PURE__*/ React.createElement(Icon, {
                n: 'package-plus',
              }),
              ' Add inventory item',
            ),
            populated &&
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-ghost',
                  href: '#',
                },
                /*#__PURE__*/ React.createElement(Icon, {
                  n: 'scroll-text',
                }),
                ' Post contract',
              ),
          ),
        );
      }

      // ---- tweaks defaults -----------------------------------------
      const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
        dataState: 'Populated',
        cardStyle: 'Detailed',
        accent: 'Aqua',
      }; /*EDITMODE-END*/
      function DashboardApp() {
        const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const populated = String(t.dataState || 'Populated') === 'Populated';
        const accent = String(t.accent || 'Aqua').toLowerCase();
        const cardStyle =
          String(t.cardStyle || 'Detailed') === 'Stat tiles'
            ? 'stat'
            : 'detailed';
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'dash station',
            'data-theme': 'dark',
            'data-accent': accent,
          },
          /*#__PURE__*/ React.createElement(TopBar, null),
          /*#__PURE__*/ React.createElement(
            'main',
            {
              className: 'dash-main',
            },
            /*#__PURE__*/ React.createElement(Welcome, {
              populated: populated,
            }),
            populated && /*#__PURE__*/ React.createElement(QuickStats, null),
            /*#__PURE__*/ React.createElement(SummaryCards, {
              populated: populated,
              cardStyle: cardStyle,
            }),
            /*#__PURE__*/ React.createElement(InventoryPortlet, {
              populated: populated,
            }),
            /*#__PURE__*/ React.createElement(QuickActions, {
              populated: populated,
            }),
          ),
          /*#__PURE__*/ React.createElement(
            TweaksPanel,
            null,
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Data',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'State',
              value: t.dataState,
              options: ['Empty', 'Populated'],
              onChange: (v) => setTweak('dataState', v),
            }),
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Layout',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'Summary cards',
              value: t.cardStyle,
              options: ['Detailed', 'Stat tiles'],
              onChange: (v) => setTweak('cardStyle', v),
            }),
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Brand',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'Accent',
              value: t.accent,
              options: ['Aqua', 'Coral'],
              onChange: (v) => setTweak('accent', v),
            }),
          ),
        );
      }
      window.DashboardApp = DashboardApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'dashboard/DashboardApp.jsx',
      error: String((e && e.message) || e),
    });
  }

  // dashboard/DashboardGrid.jsx
  try {
    (() => {
      // ============================================================
      // Station — customizable dashboard (v2)
      // Edit-Layout mode + HTML5 drag-and-drop reorder into fixed grid zones,
      // layout persistence, preset profiles (Miner/Salvager/Hauler), reset.
      // Depends on portlets.jsx (window.Portlet / PORTLETS / LAYOUTS / PIcon).
      // ============================================================

      const LS_KEY = 'station-dash-layout-v2';
      const THEME_KEY = 'station-dash-theme';
      const RAIL_KEY = 'station-dash-rail';
      const ALL_IDS = Object.keys(PORTLETS);

      // shared nav (mirrors the app shell so the rail feels identical across screens)
      const RAIL_NAV = [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'layout-dashboard',
          href: '#',
          active: true,
        },
        {
          id: 'workorders',
          label: 'Work Orders',
          icon: 'pickaxe',
          href: '../app/Work Orders.html',
        },
        {
          id: 'contracts',
          label: 'Contracts',
          icon: 'scroll-text',
          href: '../app/Contracts.html',
        },
        {
          id: 'fleet',
          label: 'Fleet',
          icon: 'rocket',
          href: '../app/Fleet.html',
        },
        {
          id: 'members',
          label: 'Members',
          icon: 'users',
          href: '../app/Members.html',
        },
      ];
      const RAIL_NAV2 = [
        {
          id: 'inventory',
          label: 'Inventory',
          icon: 'archive',
          href: '../app/Inventory.html',
        },
        {
          id: 'treasury',
          label: 'Treasury',
          icon: 'landmark',
          href: '../app/Treasury.html',
        },
      ];

      // ---- collapsible rail (defaults collapsed on the dashboard) --------
      function DashSidebar({ collapsed, onToggle }) {
        const linkEl = (n) =>
          /*#__PURE__*/ React.createElement(
            'a',
            {
              key: n.id,
              className: 'dr-link' + (n.active ? ' active' : ''),
              href: n.active ? undefined : n.href,
              'aria-current': n.active ? 'page' : undefined,
              title: collapsed ? n.label : undefined,
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: n.icon,
            }),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'lbl',
              },
              n.label,
            ),
          );
        return /*#__PURE__*/ React.createElement(
          'aside',
          {
            className: 'dash-rail',
            'aria-label': 'Primary',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'dr-head',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'dr-badge',
              },
              'AV',
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'dr-org',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'nm',
                },
                'Atlas Vanguard',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'role',
                },
                'Quartermaster',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'nav',
            {
              className: 'dr-nav',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'dr-cap',
              },
              'Operations',
            ),
            RAIL_NAV.map(linkEl),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'dr-cap',
              },
              'Assets',
            ),
            RAIL_NAV2.map(linkEl),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'dr-foot',
            },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                className: 'dr-toggle',
                onClick: onToggle,
                'aria-label': collapsed ? 'Expand sidebar' : 'Collapse sidebar',
                title: collapsed ? 'Expand' : 'Collapse',
              },
              /*#__PURE__*/ React.createElement(PIcon, {
                n: 'chevrons-left',
              }),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'lbl',
                },
                'Collapse',
              ),
            ),
          ),
        );
      }

      // keep a saved order valid against the current registry
      function reconcile(arr) {
        const seen = new Set();
        const out = [];
        arr.forEach((id) => {
          if (PORTLETS[id] && !seen.has(id)) {
            seen.add(id);
            out.push(id);
          }
        });
        ALL_IDS.forEach((id) => {
          if (!seen.has(id)) out.push(id);
        });
        return out;
      }
      function loadSaved() {
        try {
          const s = JSON.parse(localStorage.getItem(LS_KEY));
          if (Array.isArray(s) && s.length) return reconcile(s);
        } catch (e) {
          /* ignore */
        }
        return null;
      }
      function persist(order) {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(order));
        } catch (e) {
          /* ignore */
        }
      }

      // ---- top bar (self-contained) --------------------------------
      function TopBar({ theme, onToggleTheme, onToggleRail }) {
        const dark = theme === 'dark';
        return /*#__PURE__*/ React.createElement(
          'header',
          {
            className: 'topbar',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'topbar-inner',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                },
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'icon-btn topbar-railbtn',
                  onClick: onToggleRail,
                  'aria-label': 'Toggle sidebar',
                  title: 'Toggle sidebar',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'panel-left',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'logo',
                  href: '#',
                  'aria-label': 'Station home',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'logo-mark',
                  },
                  /*#__PURE__*/ React.createElement(PIcon, {
                    n: 'orbit',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'logo-word',
                  },
                  'STATION',
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'topbar-right',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'icon-btn',
                  onClick: onToggleTheme,
                  'aria-label': dark
                    ? 'Switch to light mode'
                    : 'Switch to dark mode',
                  title: dark ? 'Light mode' : 'Dark mode',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: dark ? 'sun' : 'moon',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'icon-btn',
                  'aria-label': 'Notifications',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'bell',
                }),
                /*#__PURE__*/ React.createElement('span', {
                  className: 'dot',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'avatar',
                  'aria-label': 'Account menu',
                },
                'H',
              ),
            ),
          ),
        );
      }
      function DashboardGridApp() {
        const [t, setTweak] = useTweaks(
          /*EDITMODE-BEGIN*/ {
            layout: 'Default',
            accent: 'Aqua',
          } /*EDITMODE-END*/,
        );
        const [order, setOrder] = React.useState(
          () => loadSaved() || LAYOUTS[String(t.layout)] || LAYOUTS.Default,
        );
        const [editing, setEditing] = React.useState(false);
        const [editBase, setEditBase] = React.useState(null); // snapshot for Cancel
        const [dragId, setDragId] = React.useState(null);
        const [overId, setOverId] = React.useState(null);

        // ---- theme (light-first token system; dark is the product default) ----
        const [theme, setTheme] = React.useState(() => {
          try {
            return localStorage.getItem(THEME_KEY) || 'dark';
          } catch (e) {
            return 'dark';
          }
        });
        React.useEffect(() => {
          document.documentElement.setAttribute('data-theme', theme);
          try {
            localStorage.setItem(THEME_KEY, theme);
          } catch (e) {
            /* ignore */
          }
        }, [theme]);
        const toggleTheme = () =>
          setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

        // ---- rail (collapsed by default on the dashboard; persisted) ----
        const [rail, setRail] = React.useState(() => {
          try {
            return localStorage.getItem(RAIL_KEY) || 'collapsed';
          } catch (e) {
            return 'collapsed';
          }
        });
        React.useEffect(() => {
          try {
            localStorage.setItem(RAIL_KEY, rail);
          } catch (e) {}
        }, [rail]);
        const toggleRail = () =>
          setRail((p) => (p === 'collapsed' ? 'expanded' : 'collapsed'));

        // apply a preset when the Tweak changes (but not on first mount)
        const firstRun = React.useRef(true);
        React.useEffect(() => {
          if (firstRun.current) {
            firstRun.current = false;
            return;
          }
          const next = LAYOUTS[String(t.layout)] || LAYOUTS.Default;
          setEditing(false);
          setOrder(next);
          persist(next);
        }, [t.layout]);

        // (re)build Lucide glyphs after each render
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const accent = String(t.accent || 'Aqua').toLowerCase();

        // ---- edit session controls ----
        const startEdit = () => {
          setEditBase(order);
          setEditing(true);
        };
        const cancelEdit = () => {
          if (editBase) setOrder(editBase);
          setEditing(false);
          setDragId(null);
          setOverId(null);
        };
        const saveEdit = () => {
          persist(order);
          setEditing(false);
          setDragId(null);
          setOverId(null);
        };
        const resetLayout = () => {
          const def = LAYOUTS[String(t.layout)] || LAYOUTS.Default;
          setOrder(def);
        };

        // ---- drag-and-drop reorder (insert dragged before target) ----
        const move = (drag, target) => {
          if (!drag || drag === target) return;
          setOrder((prev) => {
            const arr = prev.filter((id) => id !== drag);
            const idx = arr.indexOf(target);
            arr.splice(idx < 0 ? arr.length : idx, 0, drag);
            return arr;
          });
        };
        const dragPropsFor = (id) =>
          editing
            ? {
                draggable: true,
                onDragStart: (e) => {
                  setDragId(id);
                  e.dataTransfer.effectAllowed = 'move';
                  try {
                    e.dataTransfer.setData('text/plain', id);
                  } catch (x) {}
                },
                onDragOver: (e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (overId !== id) setOverId(id);
                },
                onDragLeave: () => {
                  if (overId === id) setOverId(null);
                },
                onDrop: (e) => {
                  e.preventDefault();
                  move(dragId, id);
                  setDragId(null);
                  setOverId(null);
                },
                onDragEnd: () => {
                  setDragId(null);
                  setOverId(null);
                },
              }
            : {};
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'dash station',
            'data-theme': theme,
            'data-accent': accent,
            'data-rail': rail,
          },
          /*#__PURE__*/ React.createElement(DashSidebar, {
            collapsed: rail === 'collapsed',
            onToggle: toggleRail,
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'dash-shellcol',
            },
            /*#__PURE__*/ React.createElement(TopBar, {
              theme: theme,
              onToggleTheme: toggleTheme,
              onToggleRail: toggleRail,
            }),
            /*#__PURE__*/ React.createElement(
              'main',
              {
                className: 'dash-main',
              },
              /*#__PURE__*/ React.createElement(
                'section',
                {
                  className: 'welcome',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'welcome-copy',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'eyebrow welcome-eyebrow',
                    },
                    'Command center',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'h1',
                    null,
                    'Welcome back, ',
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'name',
                      },
                      'hezeqiah',
                    ),
                    '.',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'p',
                    {
                      className: 'welcome-sub',
                    },
                    'Your dashboard, your way \u2014 arrange portlets around how you play.',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'welcome-actions',
                  },
                  !editing &&
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-ghost btn-sm edit-toggle',
                        onClick: startEdit,
                      },
                      /*#__PURE__*/ React.createElement(PIcon, {
                        n: 'layout-grid',
                      }),
                      ' Edit layout',
                    ),
                ),
              ),
              editing &&
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'edit-banner',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'eb-ico',
                    },
                    /*#__PURE__*/ React.createElement(PIcon, {
                      n: 'move',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'eb-text',
                    },
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'eb-title',
                      },
                      'Customizing your dashboard',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'eb-sub',
                      },
                      'Drag any portlet by its handle to move it into a new zone.',
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'eb-actions',
                    },
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn-link',
                        onClick: resetLayout,
                      },
                      /*#__PURE__*/ React.createElement(PIcon, {
                        n: 'rotate-ccw',
                      }),
                      ' Reset to default',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-ghost btn-sm',
                        onClick: cancelEdit,
                      },
                      'Cancel',
                    ),
                    /*#__PURE__*/ React.createElement(
                      'button',
                      {
                        className: 'btn btn-primary btn-sm',
                        onClick: saveEdit,
                      },
                      /*#__PURE__*/ React.createElement(PIcon, {
                        n: 'check',
                      }),
                      ' Save layout',
                    ),
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                'section',
                {
                  className: 'pgrid' + (editing ? ' editing' : ''),
                },
                order.map((id) => {
                  const def = PORTLETS[id];
                  if (!def) return null;
                  const Body = def.Body;
                  return /*#__PURE__*/ React.createElement(
                    Portlet,
                    {
                      key: id,
                      id: id,
                      icon: def.icon,
                      title: def.title,
                      href: def.href,
                      full: def.full,
                      editing: editing,
                      dragging: dragId === id,
                      dropTarget: editing && overId === id && dragId !== id,
                      dragProps: dragPropsFor(id),
                    },
                    /*#__PURE__*/ React.createElement(Body, null),
                  );
                }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            TweaksPanel,
            null,
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Layout profile',
            }),
            /*#__PURE__*/ React.createElement(TweakSelect, {
              label: 'Starting layout',
              value: t.layout,
              options: ['Default', 'Miner', 'Salvager', 'Hauler'],
              onChange: (v) => setTweak('layout', v),
            }),
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Brand',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'Accent',
              value: t.accent,
              options: ['Aqua', 'Coral'],
              onChange: (v) => setTweak('accent', v),
            }),
          ),
        );
      }
      window.DashboardGridApp = DashboardGridApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'dashboard/DashboardGrid.jsx',
      error: String((e && e.message) || e),
    });
  }

  // dashboard/portlets.jsx
  try {
    (() => {
      function _extends() {
        return (
          (_extends = Object.assign
            ? Object.assign.bind()
            : function (n) {
                for (var e = 1; e < arguments.length; e++) {
                  var t = arguments[e];
                  for (var r in t)
                    ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
                }
                return n;
              }),
          _extends.apply(null, arguments)
        );
      }
      // ============================================================
      // Station — portlet library (v2)
      // A uniform Portlet shell + 10 portlet bodies + registry + presets.
      // Every portlet is a self-contained card so it can be dragged into any
      // grid zone. Exposed on window for DashboardGrid.jsx.
      // ============================================================

      const PIcon = ({ n, ...p }) =>
        /*#__PURE__*/ React.createElement(
          'i',
          _extends(
            {
              'data-lucide': n,
            },
            p,
          ),
        );

      // ---- uniform shell -------------------------------------------
      // dragHandlers + editing are injected by the grid; content is `children`.
      function Portlet({
        id,
        icon,
        title,
        action,
        href,
        full,
        editing,
        dragging,
        dropTarget,
        dragProps = {},
        children,
      }) {
        const headAction =
          action ||
          (href && !editing
            ? /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'pcard-act',
                  href: href,
                  'aria-label': 'Open ' + title,
                  title: 'Open ' + title,
                  onClick: (e) => e.stopPropagation(),
                  onMouseDown: (e) => e.stopPropagation(),
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'arrow-up-right',
                }),
              )
            : /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'pcard-act',
                  'aria-label': 'Portlet options',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'more-horizontal',
                }),
              ));
        return /*#__PURE__*/ React.createElement(
          'article',
          _extends(
            {
              className:
                'pcard' +
                (full ? ' pcard--full' : '') +
                (dragging ? ' dragging' : '') +
                (dropTarget ? ' drop-target' : ''),
              'data-portlet': id,
            },
            dragProps,
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pcard-head',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pcard-grip',
                'aria-hidden': 'true',
              },
              /*#__PURE__*/ React.createElement(PIcon, {
                n: 'grip-vertical',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pcard-ico',
              },
              /*#__PURE__*/ React.createElement(PIcon, {
                n: icon,
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pcard-title',
              },
              title,
            ),
            headAction,
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pcard-body',
            },
            children,
          ),
        );
      }

      // ---- compact bodies ------------------------------------------
      function MiningBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Refined \xB7 this cycle',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '1,240',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'SCU',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pdelta up',
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: 'trending-up',
            }),
            ' +18% vs last cycle',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pbars',
            },
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '40%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '62%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '48%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '78%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '55%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              className: 'hi',
              style: {
                height: '96%',
              },
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'gem',
                }),
                ' Top commodity',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                'Quantanium',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'pickaxe',
                }),
                ' Active rigs',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '3',
              ),
            ),
          ),
        );
      }
      function WorkOrdersBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Session net payout \xB7 Aaron Halo',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '3.55',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'M aUEC',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pdelta warn',
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: 'loader',
            }),
            ' 2 jobs refining now',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pbars',
            },
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '38%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '64%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '52%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '80%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '60%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              className: 'hi',
              style: {
                height: '92%',
              },
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'package-check',
                }),
                ' Ready to sell',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                '1 order',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'gem',
                }),
                ' Session yield',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '250 SCU',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'users',
                }),
                ' Crew shares',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '5',
              ),
            ),
          ),
        );
      }
      function SalvageBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Reclaimed materials',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '318',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'RMC',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pdelta up',
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: 'trending-up',
            }),
            ' +42 this week',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'recycle',
                }),
                ' CM stripped',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '96',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'ship',
                }),
                ' Hulls processed',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '12',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'map-pin',
                }),
                ' Field',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                'Aaron Halo',
              ),
            ),
          ),
        );
      }
      function HaulingBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Trade profit \xB7 30d',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '2.1',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'M aUEC',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pdelta up',
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: 'trending-up',
            }),
            ' +4.1% margin',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'route',
                }),
                ' Routes run',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '42',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'container',
                }),
                ' Cargo moved',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '9,840 SCU',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'fuel',
                }),
                ' Best lane',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                'ARC \u2192 Hurston',
              ),
            ),
          ),
        );
      }
      function FleetBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Hangar status',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '14',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'ships',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'pdots',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    className: 'ok',
                  }),
                ),
                ' Ready',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '9',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'pdots',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    className: 'warn',
                  }),
                ),
                ' In repair',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '2',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'pdots',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    className: 'off',
                  }),
                ),
                ' Stored',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '3',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'rocket',
                }),
                ' Flagship',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                'Polaris',
              ),
            ),
          ),
        );
      }
      function ContractsBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Org contracts',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '5',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'active',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pdelta warn',
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: 'clock',
            }),
            ' 2 due within 48h',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'hand-coins',
                }),
                ' Pending payout',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                '1.2M',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'check-check',
                }),
                ' Completed \xB7 30d',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '23',
              ),
            ),
          ),
        );
      }
      function TreasuryBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'plabel',
            },
            'Org treasury',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmetric',
            },
            '8.42',
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'unit',
              },
              'M aUEC',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pdelta up',
            },
            /*#__PURE__*/ React.createElement(PIcon, {
              n: 'trending-up',
            }),
            ' +4.1% this cycle',
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pbars',
            },
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '52%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '46%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '64%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '58%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              style: {
                height: '72%',
              },
            }),
            /*#__PURE__*/ React.createElement('i', {
              className: 'hi',
              style: {
                height: '88%',
              },
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'users',
                }),
                ' Contributors',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '41',
              ),
            ),
          ),
        );
      }
      function OrganizationsBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmini',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pavatar',
              },
              'AV',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pnm',
                },
                'Atlas Vanguard',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pmeta',
                },
                'Quartermaster \xB7 312 members',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmini',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pavatar',
                style: {
                  background:
                    'linear-gradient(140deg, var(--coral-300), var(--coral-500))',
                },
              },
              'CF',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pnm',
                },
                'Crimson Fleet',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pmeta',
                },
                'Member \xB7 88 members',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pbtn-row',
            },
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-ghost btn-sm',
                href: '#',
              },
              'Manage orgs ',
              /*#__PURE__*/ React.createElement(PIcon, {
                n: 'arrow-right',
              }),
            ),
          ),
        );
      }
      function InvitationsBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pmini',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'pavatar',
                style: {
                  background:
                    'linear-gradient(140deg, var(--teal-300), var(--teal-500))',
                },
              },
              'HP',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pnm',
                },
                'Hollow Point Mercs',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pmeta',
                },
                'Invited you as Operative',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pbtn-row',
            },
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-primary btn-sm',
                href: '#',
              },
              /*#__PURE__*/ React.createElement(PIcon, {
                n: 'check',
              }),
              ' Accept',
            ),
            /*#__PURE__*/ React.createElement(
              'a',
              {
                className: 'btn btn-ghost btn-sm',
                href: '#',
              },
              'Decline',
            ),
          ),
        );
      }
      function ProfileBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pprofile',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'big-av',
              },
              'H',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              null,
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'ph',
                },
                'hezeqiah',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'pr',
                },
                'Quartermaster \xB7 Atlas Vanguard',
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'prows',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'shield-check',
                }),
                ' Reputation',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v brand',
                },
                'Trusted',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'prow',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'l',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'calendar',
                }),
                ' Member since',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'v',
                },
                '2952',
              ),
            ),
          ),
        );
      }

      // ---- inventory body (compact reuse of the table) -------------
      const INV_ROWS = [
        {
          name: 'Quantanium',
          sku: 'UEX-MAT-QNT',
          cat: 'Mining · Refined',
          qty: 1240,
          loc: 'CRU-L1 Storage',
          status: 'Shared',
          tone: 'success',
          ico: 'gem',
        },
        {
          name: 'Demeco LMG',
          sku: 'UEX-WPN-DMC',
          cat: 'Personal Weapons',
          qty: 1,
          loc: 'Area18 · Hangar 4',
          status: 'Atlas Vanguard',
          tone: 'brand',
          ico: 'crosshair',
        },
        {
          name: '100i Frostbite Livery',
          sku: 'UEX-100I-FRB',
          cat: 'Liveries',
          qty: 3,
          loc: 'Everus Harbor',
          status: 'Private',
          tone: 'neutral',
          ico: 'paintbrush',
        },
        {
          name: 'Medical Supplies',
          sku: 'UEX-MED-SUP',
          cat: 'Consumables',
          qty: 48,
          loc: 'Atlas Hangar',
          status: 'Atlas Vanguard',
          tone: 'brand',
          ico: 'cross',
        },
      ];
      function InventoryBody() {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'portlet-controls',
            },
            /*#__PURE__*/ React.createElement(
              'label',
              {
                className: 'search',
              },
              /*#__PURE__*/ React.createElement(PIcon, {
                n: 'search',
              }),
              /*#__PURE__*/ React.createElement('input', {
                type: 'text',
                placeholder: 'Search items\u2026',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'select',
              },
              /*#__PURE__*/ React.createElement('span', null, 'All categories'),
              /*#__PURE__*/ React.createElement(PIcon, {
                n: 'chevron-down',
              }),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'toggle-field',
              },
              /*#__PURE__*/ React.createElement('span', {
                className: 'switch',
              }),
              /*#__PURE__*/ React.createElement('span', null, 'Shared only'),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'table',
            {
              className: 'inv-table',
            },
            /*#__PURE__*/ React.createElement(
              'thead',
              null,
              /*#__PURE__*/ React.createElement(
                'tr',
                null,
                /*#__PURE__*/ React.createElement('th', null, 'Item'),
                /*#__PURE__*/ React.createElement('th', null, 'Category'),
                /*#__PURE__*/ React.createElement(
                  'th',
                  {
                    className: 'num',
                  },
                  'Quantity',
                ),
                /*#__PURE__*/ React.createElement('th', null, 'Location'),
                /*#__PURE__*/ React.createElement('th', null, 'Status'),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'tbody',
              null,
              INV_ROWS.map((it) =>
                /*#__PURE__*/ React.createElement(
                  'tr',
                  {
                    key: it.sku,
                  },
                  /*#__PURE__*/ React.createElement(
                    'td',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'div',
                      {
                        className: 'inv-item',
                      },
                      /*#__PURE__*/ React.createElement(
                        'span',
                        {
                          className: 'thumb',
                        },
                        /*#__PURE__*/ React.createElement(PIcon, {
                          n: it.ico,
                        }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        'div',
                        null,
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'nm',
                          },
                          it.name,
                        ),
                        /*#__PURE__*/ React.createElement(
                          'div',
                          {
                            className: 'sku',
                          },
                          it.sku,
                        ),
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'td',
                    {
                      className: 'cell-muted',
                    },
                    it.cat,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'td',
                    {
                      className: 'cell-num',
                    },
                    it.qty.toLocaleString(),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'td',
                    {
                      className: 'cell-muted',
                    },
                    it.loc,
                  ),
                  /*#__PURE__*/ React.createElement(
                    'td',
                    null,
                    /*#__PURE__*/ React.createElement(
                      'span',
                      {
                        className: 'chip-badge ' + it.tone,
                      },
                      it.tone === 'brand' &&
                        /*#__PURE__*/ React.createElement(PIcon, {
                          n: 'shield',
                        }),
                      it.tone === 'success' &&
                        /*#__PURE__*/ React.createElement(PIcon, {
                          n: 'share-2',
                        }),
                      it.tone === 'neutral' &&
                        /*#__PURE__*/ React.createElement(PIcon, {
                          n: 'lock',
                        }),
                      it.status,
                    ),
                  ),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'pagination',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'rpp',
              },
              'Rows per page: ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'pill',
                },
                '10 ',
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'chevron-down',
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement('span', null, '1\u20134 of 4'),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'pager',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  disabled: true,
                  'aria-label': 'Previous',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'chevron-left',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  disabled: true,
                  'aria-label': 'Next',
                },
                /*#__PURE__*/ React.createElement(PIcon, {
                  n: 'chevron-right',
                }),
              ),
            ),
          ),
        );
      }

      // ---- registry ------------------------------------------------
      const PORTLETS = {
        profile: {
          icon: 'user-round',
          title: 'My Profile',
          Body: ProfileBody,
          href: '../app/Profile.html',
        },
        invitations: {
          icon: 'mail',
          title: 'Invitations',
          Body: InvitationsBody,
        },
        workorders: {
          icon: 'pickaxe',
          title: 'Work Orders',
          Body: WorkOrdersBody,
          href: '../app/Work Orders.html',
        },
        fleet: {
          icon: 'rocket',
          title: 'Fleet',
          Body: FleetBody,
          href: '../app/Fleet.html',
        },
        mining: {
          icon: 'pickaxe',
          title: 'Mining',
          Body: MiningBody,
        },
        salvage: {
          icon: 'recycle',
          title: 'Salvage',
          Body: SalvageBody,
        },
        hauling: {
          icon: 'truck',
          title: 'Hauling & Trade',
          Body: HaulingBody,
        },
        contracts: {
          icon: 'scroll-text',
          title: 'Contracts',
          Body: ContractsBody,
          href: '../app/Contracts.html',
        },
        treasury: {
          icon: 'landmark',
          title: 'Treasury',
          Body: TreasuryBody,
          href: '../app/Treasury.html',
        },
        inventory: {
          icon: 'archive',
          title: 'My Inventory',
          Body: InventoryBody,
          full: true,
          href: '../app/Inventory.html',
        },
      };

      // ---- preset layouts (seed of future system-level profiles) ---
      const LAYOUTS = {
        Default: [
          'profile',
          'invitations',
          'workorders',
          'fleet',
          'hauling',
          'contracts',
          'treasury',
          'inventory',
          'mining',
          'salvage',
        ],
        Miner: [
          'workorders',
          'treasury',
          'fleet',
          'inventory',
          'hauling',
          'contracts',
          'invitations',
          'profile',
          'mining',
          'salvage',
        ],
        Salvager: [
          'workorders',
          'fleet',
          'treasury',
          'inventory',
          'contracts',
          'hauling',
          'invitations',
          'profile',
          'salvage',
          'mining',
        ],
        Hauler: [
          'hauling',
          'treasury',
          'contracts',
          'inventory',
          'fleet',
          'workorders',
          'invitations',
          'profile',
          'mining',
          'salvage',
        ],
      };
      Object.assign(window, {
        Portlet,
        PORTLETS,
        LAYOUTS,
        PIcon,
      });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'dashboard/portlets.jsx',
      error: String((e && e.message) || e),
    });
  }

  // dashboard/tweaks-panel.jsx
  try {
    (() => {
      // @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

      /* BEGIN USAGE */
      // tweaks-panel.jsx
      // Reusable Tweaks shell + form-control helpers.
      // Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
      //   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
      //
      // Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
      // posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
      // individual prototypes don't re-roll it. Ships a consistent set of controls so you
      // don't hand-draw <input type="range">, segmented radios, steppers, etc.
      //
      // Usage (in an HTML file that loads React + Babel):
      //
      //   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      //     "primaryColor": "#D97757",
      //     "palette": ["#D97757", "#29261b", "#f6f4ef"],
      //     "fontSize": 16,
      //     "density": "regular",
      //     "dark": false
      //   }/*EDITMODE-END*/;
      //
      //   function App() {
      //     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
      //     return (
      //       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
      //         Hello
      //         <TweaksPanel>
      //           <TweakSection label="Typography" />
      //           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
      //                        onChange={(v) => setTweak('fontSize', v)} />
      //           <TweakRadio  label="Density" value={t.density}
      //                        options={['compact', 'regular', 'comfy']}
      //                        onChange={(v) => setTweak('density', v)} />
      //           <TweakSection label="Theme" />
      //           <TweakColor  label="Primary" value={t.primaryColor}
      //                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
      //                        onChange={(v) => setTweak('primaryColor', v)} />
      //           <TweakColor  label="Palette" value={t.palette}
      //                        options={[['#D97757', '#29261b', '#f6f4ef'],
      //                                  ['#475569', '#0f172a', '#f1f5f9']]}
      //                        onChange={(v) => setTweak('palette', v)} />
      //           <TweakToggle label="Dark mode" value={t.dark}
      //                        onChange={(v) => setTweak('dark', v)} />
      //         </TweaksPanel>
      //       </div>
      //     );
      //   }
      //
      // TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
      // TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
      // options are many or long. For color tweaks always curate 3-4 options rather than
      // a free picker; an option can also be a whole 2–5 color palette (the stored value
      // is the array). The Tweak* controls are a floor, not a ceiling — build custom
      // controls inside the panel if a tweak calls for UI they don't cover.
      /* END USAGE */
      // ─────────────────────────────────────────────────────────────────────────────

      const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

      // ── useTweaks ───────────────────────────────────────────────────────────────
      // Single source of truth for tweak values. setTweak persists via the host
      // (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
      function useTweaks(defaults) {
        const [values, setValues] = React.useState(defaults);
        // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
        // useState-style call doesn't write a "[object Object]" key into the persisted
        // JSON block.
        const setTweak = React.useCallback((keyOrEdits, val) => {
          const edits =
            typeof keyOrEdits === 'object' && keyOrEdits !== null
              ? keyOrEdits
              : {
                  [keyOrEdits]: val,
                };
          setValues((prev) => ({
            ...prev,
            ...edits,
          }));
          window.parent.postMessage(
            {
              type: '__edit_mode_set_keys',
              edits,
            },
            '*',
          );
          // Same-window signal so in-page listeners (deck-stage rail thumbnails)
          // can react — the parent message only reaches the host, not peers.
          window.dispatchEvent(
            new CustomEvent('tweakchange', {
              detail: edits,
            }),
          );
        }, []);
        return [values, setTweak];
      }

      // ── TweaksPanel ─────────────────────────────────────────────────────────────
      // Floating shell. Registers the protocol listener BEFORE announcing
      // availability — if the announce ran first, the host's activate could land
      // before our handler exists and the toolbar toggle would silently no-op.
      // The close button posts __edit_mode_dismissed so the host's toolbar toggle
      // flips off in lockstep; the host echoes __deactivate_edit_mode back which
      // is what actually hides the panel.
      function TweaksPanel({ title = 'Tweaks', children }) {
        const [open, setOpen] = React.useState(false);
        const dragRef = React.useRef(null);
        const offsetRef = React.useRef({
          x: 16,
          y: 16,
        });
        const PAD = 16;
        const clampToViewport = React.useCallback(() => {
          const panel = dragRef.current;
          if (!panel) return;
          const w = panel.offsetWidth,
            h = panel.offsetHeight;
          const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
          const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
          offsetRef.current = {
            x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
            y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
          };
          panel.style.right = offsetRef.current.x + 'px';
          panel.style.bottom = offsetRef.current.y + 'px';
        }, []);
        React.useEffect(() => {
          if (!open) return;
          clampToViewport();
          if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', clampToViewport);
            return () => window.removeEventListener('resize', clampToViewport);
          }
          const ro = new ResizeObserver(clampToViewport);
          ro.observe(document.documentElement);
          return () => ro.disconnect();
        }, [open, clampToViewport]);
        React.useEffect(() => {
          const onMsg = (e) => {
            const t = e?.data?.type;
            if (t === '__activate_edit_mode') setOpen(true);
            else if (t === '__deactivate_edit_mode') setOpen(false);
          };
          window.addEventListener('message', onMsg);
          window.parent.postMessage(
            {
              type: '__edit_mode_available',
            },
            '*',
          );
          return () => window.removeEventListener('message', onMsg);
        }, []);
        const dismiss = () => {
          setOpen(false);
          window.parent.postMessage(
            {
              type: '__edit_mode_dismissed',
            },
            '*',
          );
        };
        const onDragStart = (e) => {
          const panel = dragRef.current;
          if (!panel) return;
          const r = panel.getBoundingClientRect();
          const sx = e.clientX,
            sy = e.clientY;
          const startRight = window.innerWidth - r.right;
          const startBottom = window.innerHeight - r.bottom;
          const move = (ev) => {
            offsetRef.current = {
              x: startRight - (ev.clientX - sx),
              y: startBottom - (ev.clientY - sy),
            };
            clampToViewport();
          };
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        };
        if (!open) return null;
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement('style', null, __TWEAKS_STYLE),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              ref: dragRef,
              className: 'twk-panel',
              'data-omelette-chrome': '',
              style: {
                right: offsetRef.current.x,
                bottom: offsetRef.current.y,
              },
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-hd',
                onMouseDown: onDragStart,
              },
              /*#__PURE__*/ React.createElement('b', null, title),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'twk-x',
                  'aria-label': 'Close tweaks',
                  onMouseDown: (e) => e.stopPropagation(),
                  onClick: dismiss,
                },
                '\u2715',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-body',
              },
              children,
            ),
          ),
        );
      }

      // ── Layout helpers ──────────────────────────────────────────────────────────

      function TweakSection({ label, children }) {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-sect',
            },
            label,
          ),
          children,
        );
      }
      function TweakRow({ label, value, children, inline = false }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: inline ? 'twk-row twk-row-h' : 'twk-row',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-lbl',
            },
            /*#__PURE__*/ React.createElement('span', null, label),
            value != null &&
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'twk-val',
                },
                value,
              ),
          ),
          children,
        );
      }

      // ── Controls ────────────────────────────────────────────────────────────────

      function TweakSlider({
        label,
        value,
        min = 0,
        max = 100,
        step = 1,
        unit = '',
        onChange,
      }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
            value: `${value}${unit}`,
          },
          /*#__PURE__*/ React.createElement('input', {
            type: 'range',
            className: 'twk-slider',
            min: min,
            max: max,
            step: step,
            value: value,
            onChange: (e) => onChange(Number(e.target.value)),
          }),
        );
      }
      function TweakToggle({ label, value, onChange }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'twk-row twk-row-h',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-lbl',
            },
            /*#__PURE__*/ React.createElement('span', null, label),
          ),
          /*#__PURE__*/ React.createElement(
            'button',
            {
              type: 'button',
              className: 'twk-toggle',
              'data-on': value ? '1' : '0',
              role: 'switch',
              'aria-checked': !!value,
              onClick: () => onChange(!value),
            },
            /*#__PURE__*/ React.createElement('i', null),
          ),
        );
      }
      function TweakRadio({ label, value, options, onChange }) {
        const trackRef = React.useRef(null);
        const [dragging, setDragging] = React.useState(false);
        // The active value is read by pointer-move handlers attached for the lifetime
        // of a drag — ref it so a stale closure doesn't fire onChange for every move.
        const valueRef = React.useRef(value);
        valueRef.current = value;

        // Segments wrap mid-word once per-segment width runs out. The track is
        // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
        // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
        // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
        // back to a dropdown rather than wrap.
        const labelLen = (o) =>
          String(typeof o === 'object' ? o.label : o).length;
        const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
        const fitsAsSegments =
          maxLen <=
          ({
            2: 16,
            3: 10,
          }[options.length] ?? 0);
        if (!fitsAsSegments) {
          // <select> emits strings — map back to the original option value so the
          // fallback stays type-preserving (numbers, booleans) like the segment path.
          const resolve = (s) => {
            const m = options.find(
              (o) => String(typeof o === 'object' ? o.value : o) === s,
            );
            return m === undefined ? s : typeof m === 'object' ? m.value : m;
          };
          return /*#__PURE__*/ React.createElement(TweakSelect, {
            label: label,
            value: value,
            options: options,
            onChange: (s) => onChange(resolve(s)),
          });
        }
        const opts = options.map((o) =>
          typeof o === 'object'
            ? o
            : {
                value: o,
                label: o,
              },
        );
        const idx = Math.max(
          0,
          opts.findIndex((o) => o.value === value),
        );
        const n = opts.length;
        const segAt = (clientX) => {
          const r = trackRef.current.getBoundingClientRect();
          const inner = r.width - 4;
          const i = Math.floor(((clientX - r.left - 2) / inner) * n);
          return opts[Math.max(0, Math.min(n - 1, i))].value;
        };
        const onPointerDown = (e) => {
          setDragging(true);
          const v0 = segAt(e.clientX);
          if (v0 !== valueRef.current) onChange(v0);
          const move = (ev) => {
            if (!trackRef.current) return;
            const v = segAt(ev.clientX);
            if (v !== valueRef.current) onChange(v);
          };
          const up = () => {
            setDragging(false);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              ref: trackRef,
              role: 'radiogroup',
              onPointerDown: onPointerDown,
              className: dragging ? 'twk-seg dragging' : 'twk-seg',
            },
            /*#__PURE__*/ React.createElement('div', {
              className: 'twk-seg-thumb',
              style: {
                left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                width: `calc((100% - 4px) / ${n})`,
              },
            }),
            opts.map((o) =>
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  key: o.value,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': o.value === value,
                },
                o.label,
              ),
            ),
          ),
        );
      }
      function TweakSelect({ label, value, options, onChange }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'select',
            {
              className: 'twk-field',
              value: value,
              onChange: (e) => onChange(e.target.value),
            },
            options.map((o) => {
              const v = typeof o === 'object' ? o.value : o;
              const l = typeof o === 'object' ? o.label : o;
              return /*#__PURE__*/ React.createElement(
                'option',
                {
                  key: v,
                  value: v,
                },
                l,
              );
            }),
          ),
        );
      }
      function TweakText({ label, value, placeholder, onChange }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement('input', {
            className: 'twk-field',
            type: 'text',
            value: value,
            placeholder: placeholder,
            onChange: (e) => onChange(e.target.value),
          }),
        );
      }
      function TweakNumber({
        label,
        value,
        min,
        max,
        step = 1,
        unit = '',
        onChange,
      }) {
        const clamp = (n) => {
          if (min != null && n < min) return min;
          if (max != null && n > max) return max;
          return n;
        };
        const startRef = React.useRef({
          x: 0,
          val: 0,
        });
        const onScrubStart = (e) => {
          e.preventDefault();
          startRef.current = {
            x: e.clientX,
            val: value,
          };
          const decimals = (String(step).split('.')[1] || '').length;
          const move = (ev) => {
            const dx = ev.clientX - startRef.current.x;
            const raw = startRef.current.val + dx * step;
            const snapped = Math.round(raw / step) * step;
            onChange(clamp(Number(snapped.toFixed(decimals))));
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'twk-num',
          },
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'twk-num-lbl',
              onPointerDown: onScrubStart,
            },
            label,
          ),
          /*#__PURE__*/ React.createElement('input', {
            type: 'number',
            value: value,
            min: min,
            max: max,
            step: step,
            onChange: (e) => onChange(clamp(Number(e.target.value))),
          }),
          unit &&
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'twk-num-unit',
              },
              unit,
            ),
        );
      }

      // Relative-luminance contrast pick — checkmarks drawn over a swatch need to
      // read on both #111 and #fafafa without per-option configuration. Hex input
      // only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
      function __twkIsLight(hex) {
        const h = String(hex).replace('#', '');
        const x =
          h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
        const n = parseInt(x.slice(0, 6), 16);
        if (Number.isNaN(n)) return true;
        const r = (n >> 16) & 255,
          g = (n >> 8) & 255,
          b = n & 255;
        return r * 299 + g * 587 + b * 114 > 148000;
      }
      const __TwkCheck = ({ light }) =>
        /*#__PURE__*/ React.createElement(
          'svg',
          {
            viewBox: '0 0 14 14',
            'aria-hidden': 'true',
          },
          /*#__PURE__*/ React.createElement('path', {
            d: 'M3 7.2 5.8 10 11 4.2',
            fill: 'none',
            strokeWidth: '2.2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            stroke: light ? 'rgba(0,0,0,.78)' : '#fff',
          }),
        );

      // TweakColor — curated color/palette picker. Each option is either a single
      // hex string or an array of 1-5 hex strings; the card adapts — a lone color
      // renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
      // rest stacked in a sharp column on the right. onChange emits the
      // option in the shape it was passed (string stays string, array stays array).
      // Without options it falls back to the native color input for back-compat.
      function TweakColor({ label, value, options, onChange }) {
        if (!options || !options.length) {
          return /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-row twk-row-h',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-lbl',
              },
              /*#__PURE__*/ React.createElement('span', null, label),
            ),
            /*#__PURE__*/ React.createElement('input', {
              type: 'color',
              className: 'twk-swatch',
              value: value,
              onChange: (e) => onChange(e.target.value),
            }),
          );
        }
        // Native <input type=color> emits lowercase hex per the HTML spec, so
        // compare case-insensitively. String() guards JSON.stringify(undefined),
        // which returns the primitive undefined (no .toLowerCase).
        const key = (o) => String(JSON.stringify(o)).toLowerCase();
        const cur = key(value);
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-chips',
              role: 'radiogroup',
            },
            options.map((o, i) => {
              const colors = Array.isArray(o) ? o : [o];
              const [hero, ...rest] = colors;
              const sup = rest.slice(0, 4);
              const on = key(o) === cur;
              return /*#__PURE__*/ React.createElement(
                'button',
                {
                  key: i,
                  type: 'button',
                  className: 'twk-chip',
                  role: 'radio',
                  'aria-checked': on,
                  'data-on': on ? '1' : '0',
                  'aria-label': colors.join(', '),
                  title: colors.join(' · '),
                  style: {
                    background: hero,
                  },
                  onClick: () => onChange(o),
                },
                sup.length > 0 &&
                  /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    sup.map((c, j) =>
                      /*#__PURE__*/ React.createElement('i', {
                        key: j,
                        style: {
                          background: c,
                        },
                      }),
                    ),
                  ),
                on &&
                  /*#__PURE__*/ React.createElement(__TwkCheck, {
                    light: __twkIsLight(hero),
                  }),
              );
            }),
          ),
        );
      }
      function TweakButton({ label, onClick, secondary = false }) {
        return /*#__PURE__*/ React.createElement(
          'button',
          {
            type: 'button',
            className: secondary ? 'twk-btn secondary' : 'twk-btn',
            onClick: onClick,
          },
          label,
        );
      }
      Object.assign(window, {
        useTweaks,
        TweaksPanel,
        TweakSection,
        TweakRow,
        TweakSlider,
        TweakToggle,
        TweakRadio,
        TweakSelect,
        TweakText,
        TweakNumber,
        TweakColor,
        TweakButton,
      });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'dashboard/tweaks-panel.jsx',
      error: String((e && e.message) || e),
    });
  }

  // landing/LandingApp.jsx
  try {
    (() => {
      // ============================================================
      // Station — pre-login landing page (LandingApp)
      // Real app content (Home.tsx) rebuilt on the Presstronic design system.
      // Reuses the established Station classes; hero has 3 switchable layouts.
      // ============================================================

      const HEADLINES = {
        'Guild — “like a pro”':
          'Manage your gaming guild <span class="accent">like a pro</span>.',
        'Flagship, not a spreadsheet':
          'Run your org like a <span class="accent">flagship</span>, not a spreadsheet.',
        'Command center':
          'Your org deserves a <span class="accent">command center</span>.',
      };

      // ---- product console mock (org overview) ----------------------
      function Console() {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'console',
            role: 'img',
            'aria-label': 'Station org command dashboard preview',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'console-bar',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'console-dots',
              },
              /*#__PURE__*/ React.createElement('i', null),
              /*#__PURE__*/ React.createElement('i', null),
              /*#__PURE__*/ React.createElement('i', null),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'console-title',
              },
              'station.app / atlas-vanguard / overview',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'console-body',
            },
            /*#__PURE__*/ React.createElement(
              'aside',
              {
                className: 'console-side',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item active',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'layout-dashboard',
                }),
                ' Overview',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'rocket',
                }),
                ' Fleet',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'package',
                }),
                ' Inventory',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'users',
                }),
                ' Members',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'shield-check',
                }),
                ' Roles',
              ),
              /*#__PURE__*/ React.createElement('div', {
                className: 'side-sep',
              }),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'landmark',
                }),
                ' Treasury',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'scroll-text',
                }),
                ' Contracts',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'console-main',
              },
              /*#__PURE__*/ React.createElement(
                'h4',
                null,
                'Atlas Vanguard ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'live',
                  },
                  'Live',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'stat-row',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'stat',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'label',
                    },
                    'Members',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'value',
                    },
                    '312',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'delta',
                    },
                    '+18 this week',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'stat',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'label',
                    },
                    'Active Roles',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'value',
                    },
                    '24',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'delta',
                    },
                    'synced to Discord',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'stat',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'label',
                    },
                    'Org Treasury',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'value',
                    },
                    '8.42M',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'delta warm',
                    },
                    '+4.1% this cycle',
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'console-list',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ship-ico',
                    },
                    /*#__PURE__*/ React.createElement('i', {
                      'data-lucide': 'shield-check',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'name',
                    },
                    'Fleet Officer',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'meta',
                    },
                    '14 members \xB7 9 scopes',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'pill-badge active',
                    },
                    'Role',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ship-ico',
                    },
                    /*#__PURE__*/ React.createElement('i', {
                      'data-lucide': 'user-round',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'name',
                    },
                    'Vesper \u201CNyx\u201D Calderon',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'meta',
                    },
                    'Quartermaster',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'pill-badge ready',
                    },
                    'Online',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ship-ico',
                    },
                    /*#__PURE__*/ React.createElement('i', {
                      'data-lucide': 'user-plus',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'name',
                    },
                    '3 applications pending',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'meta',
                    },
                    'Recruitment',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'pill-badge warm',
                    },
                    'Review',
                  ),
                ),
              ),
            ),
          ),
        );
      }

      // ---- logo + nav ----------------------------------------------
      function Logo() {
        return /*#__PURE__*/ React.createElement(
          'a',
          {
            className: 'logo',
            href: '#top',
            'aria-label': 'Station home',
          },
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'logo-mark',
            },
            /*#__PURE__*/ React.createElement('i', {
              'data-lucide': 'orbit',
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'logo-word',
            },
            'STATION',
          ),
        );
      }
      function Nav() {
        const [scrolled, setScrolled] = React.useState(false);
        React.useEffect(() => {
          const onScroll = () => setScrolled(window.scrollY > 8);
          onScroll();
          window.addEventListener('scroll', onScroll, {
            passive: true,
          });
          return () => window.removeEventListener('scroll', onScroll);
        }, []);
        return /*#__PURE__*/ React.createElement(
          'header',
          {
            className: 'nav' + (scrolled ? ' scrolled' : ''),
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'nav-inner',
            },
            /*#__PURE__*/ React.createElement(Logo, null),
            /*#__PURE__*/ React.createElement(
              'nav',
              null,
              /*#__PURE__*/ React.createElement(
                'ul',
                {
                  className: 'nav-links',
                },
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#features',
                    },
                    'Features',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#features',
                    },
                    'Security',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#cta',
                    },
                    'Discord',
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'nav-actions',
              },
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-ghost btn-sm',
                  href: '#',
                },
                'Sign in',
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-primary btn-sm',
                  href: '#',
                },
                'Get started',
              ),
            ),
          ),
        );
      }

      // ---- hero -----------------------------------------------------
      function Hero({ layout, headlineKey, showConsole }) {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'lhero',
            id: 'top',
            'data-hero': layout,
            'data-console': showConsole ? 'on' : 'off',
          },
          /*#__PURE__*/ React.createElement('div', {
            className: 'lhero-bg',
          }),
          /*#__PURE__*/ React.createElement('div', {
            className: 'lhero-grid',
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'lhero-inner wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'lhero-copy',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'lhero-pill',
                },
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'tag',
                  },
                  'New',
                ),
                'Station Bot syncs roles to Discord in real time',
              ),
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'eyebrow',
                },
                'For Star Citizen orgs',
              ),
              /*#__PURE__*/ React.createElement('h1', {
                className: 'lhero-title',
                style: {
                  marginTop: 'var(--space-4)',
                },
                dangerouslySetInnerHTML: {
                  __html: HEADLINES[headlineKey] || Object.values(HEADLINES)[0],
                },
              }),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'lhero-sub',
                },
                'Multi-org management, fine-grained role permissions, and member coordination \u2014 purpose-built for competitive gaming orgs that run like a business.',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'hero-cta',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-primary btn-lg',
                    href: '#',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'rocket',
                  }),
                  ' Get started free',
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-lg',
                    href: '#',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'log-in',
                  }),
                  ' Sign in',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'lhero-trust',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'shield-check',
                }),
                'Free for squads up to 25 \xB7 No card required',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'lhero-visual',
              },
              /*#__PURE__*/ React.createElement(Console, null),
            ),
          ),
        );
      }

      // ---- features (bento) ----------------------------------------
      function FeatureCard({
        icon,
        title,
        children,
        span = 2,
        warm = false,
        chips,
      }) {
        return /*#__PURE__*/ React.createElement(
          'article',
          {
            className:
              'fcard col-' +
              span +
              (warm ? ' warm' : '') +
              (chips ? ' feature-lg' : ''),
          },
          /*#__PURE__*/ React.createElement('div', {
            className: 'fcard-glow',
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'fico',
            },
            /*#__PURE__*/ React.createElement('i', {
              'data-lucide': icon,
            }),
          ),
          /*#__PURE__*/ React.createElement('h3', null, title),
          /*#__PURE__*/ React.createElement('p', null, children),
          chips &&
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'chip-row',
              },
              chips.map((c) =>
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'chip',
                    key: c,
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'check',
                  }),
                  ' ',
                  c,
                ),
              ),
            ),
        );
      }
      function Features() {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'section',
            id: 'features',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'section-head',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'eyebrow',
                },
                'Capabilities',
              ),
              /*#__PURE__*/ React.createElement(
                'h2',
                {
                  className: 'section-title',
                },
                'Everything your guild needs.',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'section-sub',
                },
                'Professional-grade organization tooling for competitive gaming teams \u2014 roles, members, and operations in one cohesive command center.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'bento',
              },
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'boxes',
                  title: 'Multi-organization support',
                  span: 3,
                  chips: ['Separate roles', 'Per-org permissions', 'One login'],
                },
                'Manage multiple guilds from a single account, with independent roles, ranks, and permissions scoped to each organization you run or belong to.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'key-round',
                  title: 'Advanced permissions',
                  span: 3,
                  warm: true,
                  chips: [
                    'Role-based access',
                    'Granular scopes',
                    'Per-member overrides',
                  ],
                },
                'Fine-grained, role-based access control with flexible permission sets for every organization, division, and member \u2014 set it once, enforce it everywhere.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'layout-dashboard',
                  title: 'Intuitive dashboard',
                },
                'A clean, modern command center for members, roles, and guild operations, with real-time updates the moment anything changes.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'zap',
                  title: 'Lightning fast',
                },
                'Redis-powered caching keeps member lists and permission checks instant, even as your roster scales from a squad to an armada.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'id-card',
                  title: 'Member profiles',
                },
                'Rich profiles with bio, contact, and role history across every organization a member belongs to \u2014 no more pinned-message rosters.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'shield-check',
                  title: 'Secure & reliable',
                  span: 6,
                  chips: [
                    'JWT + refresh tokens',
                    'bcrypt hashing',
                    'Audit logging',
                    'Discord sync',
                  ],
                },
                'Built on JWT authentication with refresh tokens, bcrypt password hashing, and comprehensive security measures \u2014 so your org\u2019s data stays exactly where it belongs while roles and ranks stay in lockstep with Discord.',
              ),
            ),
          ),
        );
      }

      // ---- final CTA + footer --------------------------------------
      function FinalCTA() {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'section cta-band',
            id: 'cta',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'cta-card',
              },
              /*#__PURE__*/ React.createElement('div', {
                className: 'cta-card-glow',
              }),
              /*#__PURE__*/ React.createElement(
                'h2',
                null,
                'Ready to level up your guild?',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                null,
                'Join the gaming organizations using Station to run their teams like flagships. Set up in minutes \u2014 your crew stays right where they are, in Discord.',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'hero-cta',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-primary btn-lg',
                    href: '#',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'rocket',
                  }),
                  ' Get started free',
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-lg',
                    href: '#',
                    style: {
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.25)',
                    },
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'log-in',
                  }),
                  ' Sign in',
                ),
              ),
            ),
          ),
        );
      }
      function Footer() {
        const cols = [
          ['Product', ['Features', 'Security', 'Station Bot', 'Changelog']],
          ['Resources', ['Docs', 'API', 'Community', 'Support']],
          ['Company', ['About Presstronic', 'Blog', 'Privacy', 'Terms']],
        ];
        return /*#__PURE__*/ React.createElement(
          'footer',
          {
            className: 'foot',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'foot-top',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'foot-brand',
                },
                /*#__PURE__*/ React.createElement(Logo, null),
                /*#__PURE__*/ React.createElement(
                  'p',
                  null,
                  'Organization management for competitive gaming guilds. A Presstronic product.',
                ),
              ),
              cols.map(([title, links]) =>
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'foot-col',
                    key: title,
                  },
                  /*#__PURE__*/ React.createElement('h5', null, title),
                  /*#__PURE__*/ React.createElement(
                    'ul',
                    null,
                    links.map((l) =>
                      /*#__PURE__*/ React.createElement(
                        'li',
                        {
                          key: l,
                        },
                        /*#__PURE__*/ React.createElement(
                          'a',
                          {
                            href: '#',
                          },
                          l,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'foot-bottom',
              },
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'made',
                },
                '\xA9 2026 Presstronic LLC \xB7 Built for competitive gaming guilds',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'foot-social',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'Discord',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'message-circle',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'GitHub',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'github',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'X',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'at-sign',
                  }),
                ),
              ),
            ),
          ),
        );
      }

      // ---- tweaks defaults -----------------------------------------
      const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
        heroLayout: 'Centered',
        accent: 'Aqua',
        headline: 'Guild — “like a pro”',
        showConsole: true,
      }; /*EDITMODE-END*/
      function LandingApp() {
        const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

        // (re)build Lucide glyphs after every render so new icons resolve
        React.useEffect(() => {
          if (window.lucide) window.lucide.createIcons();
        });
        const layout = String(t.heroLayout || 'Centered').toLowerCase();
        const accent = String(t.accent || 'Aqua').toLowerCase();
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'station',
            'data-theme': 'dark',
            'data-accent': accent,
          },
          /*#__PURE__*/ React.createElement(Nav, null),
          /*#__PURE__*/ React.createElement(Hero, {
            layout: layout,
            headlineKey: t.headline,
            showConsole: t.showConsole !== false,
          }),
          /*#__PURE__*/ React.createElement(Features, null),
          /*#__PURE__*/ React.createElement(FinalCTA, null),
          /*#__PURE__*/ React.createElement(Footer, null),
          /*#__PURE__*/ React.createElement(
            TweaksPanel,
            null,
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Hero',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'Layout',
              value: t.heroLayout,
              options: ['Centered', 'Split', 'Oversized'],
              onChange: (v) => setTweak('heroLayout', v),
            }),
            /*#__PURE__*/ React.createElement(TweakSelect, {
              label: 'Headline',
              value: t.headline,
              options: Object.keys(HEADLINES),
              onChange: (v) => setTweak('headline', v),
            }),
            /*#__PURE__*/ React.createElement(TweakToggle, {
              label: 'Product preview',
              value: t.showConsole !== false,
              onChange: (v) => setTweak('showConsole', v),
            }),
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Brand',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'Accent',
              value: t.accent,
              options: ['Aqua', 'Coral'],
              onChange: (v) => setTweak('accent', v),
            }),
          ),
        );
      }
      window.LandingApp = LandingApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'landing/LandingApp.jsx',
      error: String((e && e.message) || e),
    });
  }

  // landing/tweaks-panel.jsx
  try {
    (() => {
      // @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

      /* BEGIN USAGE */
      // tweaks-panel.jsx
      // Reusable Tweaks shell + form-control helpers.
      // Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
      //   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
      //
      // Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
      // posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
      // individual prototypes don't re-roll it. Ships a consistent set of controls so you
      // don't hand-draw <input type="range">, segmented radios, steppers, etc.
      //
      // Usage (in an HTML file that loads React + Babel):
      //
      //   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      //     "primaryColor": "#D97757",
      //     "palette": ["#D97757", "#29261b", "#f6f4ef"],
      //     "fontSize": 16,
      //     "density": "regular",
      //     "dark": false
      //   }/*EDITMODE-END*/;
      //
      //   function App() {
      //     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
      //     return (
      //       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
      //         Hello
      //         <TweaksPanel>
      //           <TweakSection label="Typography" />
      //           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
      //                        onChange={(v) => setTweak('fontSize', v)} />
      //           <TweakRadio  label="Density" value={t.density}
      //                        options={['compact', 'regular', 'comfy']}
      //                        onChange={(v) => setTweak('density', v)} />
      //           <TweakSection label="Theme" />
      //           <TweakColor  label="Primary" value={t.primaryColor}
      //                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
      //                        onChange={(v) => setTweak('primaryColor', v)} />
      //           <TweakColor  label="Palette" value={t.palette}
      //                        options={[['#D97757', '#29261b', '#f6f4ef'],
      //                                  ['#475569', '#0f172a', '#f1f5f9']]}
      //                        onChange={(v) => setTweak('palette', v)} />
      //           <TweakToggle label="Dark mode" value={t.dark}
      //                        onChange={(v) => setTweak('dark', v)} />
      //         </TweaksPanel>
      //       </div>
      //     );
      //   }
      //
      // TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
      // TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
      // options are many or long. For color tweaks always curate 3-4 options rather than
      // a free picker; an option can also be a whole 2–5 color palette (the stored value
      // is the array). The Tweak* controls are a floor, not a ceiling — build custom
      // controls inside the panel if a tweak calls for UI they don't cover.
      /* END USAGE */
      // ─────────────────────────────────────────────────────────────────────────────

      const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

      // ── useTweaks ───────────────────────────────────────────────────────────────
      // Single source of truth for tweak values. setTweak persists via the host
      // (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
      function useTweaks(defaults) {
        const [values, setValues] = React.useState(defaults);
        // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
        // useState-style call doesn't write a "[object Object]" key into the persisted
        // JSON block.
        const setTweak = React.useCallback((keyOrEdits, val) => {
          const edits =
            typeof keyOrEdits === 'object' && keyOrEdits !== null
              ? keyOrEdits
              : {
                  [keyOrEdits]: val,
                };
          setValues((prev) => ({
            ...prev,
            ...edits,
          }));
          window.parent.postMessage(
            {
              type: '__edit_mode_set_keys',
              edits,
            },
            '*',
          );
          // Same-window signal so in-page listeners (deck-stage rail thumbnails)
          // can react — the parent message only reaches the host, not peers.
          window.dispatchEvent(
            new CustomEvent('tweakchange', {
              detail: edits,
            }),
          );
        }, []);
        return [values, setTweak];
      }

      // ── TweaksPanel ─────────────────────────────────────────────────────────────
      // Floating shell. Registers the protocol listener BEFORE announcing
      // availability — if the announce ran first, the host's activate could land
      // before our handler exists and the toolbar toggle would silently no-op.
      // The close button posts __edit_mode_dismissed so the host's toolbar toggle
      // flips off in lockstep; the host echoes __deactivate_edit_mode back which
      // is what actually hides the panel.
      function TweaksPanel({ title = 'Tweaks', children }) {
        const [open, setOpen] = React.useState(false);
        const dragRef = React.useRef(null);
        const offsetRef = React.useRef({
          x: 16,
          y: 16,
        });
        const PAD = 16;
        const clampToViewport = React.useCallback(() => {
          const panel = dragRef.current;
          if (!panel) return;
          const w = panel.offsetWidth,
            h = panel.offsetHeight;
          const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
          const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
          offsetRef.current = {
            x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
            y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
          };
          panel.style.right = offsetRef.current.x + 'px';
          panel.style.bottom = offsetRef.current.y + 'px';
        }, []);
        React.useEffect(() => {
          if (!open) return;
          clampToViewport();
          if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', clampToViewport);
            return () => window.removeEventListener('resize', clampToViewport);
          }
          const ro = new ResizeObserver(clampToViewport);
          ro.observe(document.documentElement);
          return () => ro.disconnect();
        }, [open, clampToViewport]);
        React.useEffect(() => {
          const onMsg = (e) => {
            const t = e?.data?.type;
            if (t === '__activate_edit_mode') setOpen(true);
            else if (t === '__deactivate_edit_mode') setOpen(false);
          };
          window.addEventListener('message', onMsg);
          window.parent.postMessage(
            {
              type: '__edit_mode_available',
            },
            '*',
          );
          return () => window.removeEventListener('message', onMsg);
        }, []);
        const dismiss = () => {
          setOpen(false);
          window.parent.postMessage(
            {
              type: '__edit_mode_dismissed',
            },
            '*',
          );
        };
        const onDragStart = (e) => {
          const panel = dragRef.current;
          if (!panel) return;
          const r = panel.getBoundingClientRect();
          const sx = e.clientX,
            sy = e.clientY;
          const startRight = window.innerWidth - r.right;
          const startBottom = window.innerHeight - r.bottom;
          const move = (ev) => {
            offsetRef.current = {
              x: startRight - (ev.clientX - sx),
              y: startBottom - (ev.clientY - sy),
            };
            clampToViewport();
          };
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        };
        if (!open) return null;
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement('style', null, __TWEAKS_STYLE),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              ref: dragRef,
              className: 'twk-panel',
              'data-omelette-chrome': '',
              style: {
                right: offsetRef.current.x,
                bottom: offsetRef.current.y,
              },
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-hd',
                onMouseDown: onDragStart,
              },
              /*#__PURE__*/ React.createElement('b', null, title),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'twk-x',
                  'aria-label': 'Close tweaks',
                  onMouseDown: (e) => e.stopPropagation(),
                  onClick: dismiss,
                },
                '\u2715',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-body',
              },
              children,
            ),
          ),
        );
      }

      // ── Layout helpers ──────────────────────────────────────────────────────────

      function TweakSection({ label, children }) {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-sect',
            },
            label,
          ),
          children,
        );
      }
      function TweakRow({ label, value, children, inline = false }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: inline ? 'twk-row twk-row-h' : 'twk-row',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-lbl',
            },
            /*#__PURE__*/ React.createElement('span', null, label),
            value != null &&
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'twk-val',
                },
                value,
              ),
          ),
          children,
        );
      }

      // ── Controls ────────────────────────────────────────────────────────────────

      function TweakSlider({
        label,
        value,
        min = 0,
        max = 100,
        step = 1,
        unit = '',
        onChange,
      }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
            value: `${value}${unit}`,
          },
          /*#__PURE__*/ React.createElement('input', {
            type: 'range',
            className: 'twk-slider',
            min: min,
            max: max,
            step: step,
            value: value,
            onChange: (e) => onChange(Number(e.target.value)),
          }),
        );
      }
      function TweakToggle({ label, value, onChange }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'twk-row twk-row-h',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-lbl',
            },
            /*#__PURE__*/ React.createElement('span', null, label),
          ),
          /*#__PURE__*/ React.createElement(
            'button',
            {
              type: 'button',
              className: 'twk-toggle',
              'data-on': value ? '1' : '0',
              role: 'switch',
              'aria-checked': !!value,
              onClick: () => onChange(!value),
            },
            /*#__PURE__*/ React.createElement('i', null),
          ),
        );
      }
      function TweakRadio({ label, value, options, onChange }) {
        const trackRef = React.useRef(null);
        const [dragging, setDragging] = React.useState(false);
        // The active value is read by pointer-move handlers attached for the lifetime
        // of a drag — ref it so a stale closure doesn't fire onChange for every move.
        const valueRef = React.useRef(value);
        valueRef.current = value;

        // Segments wrap mid-word once per-segment width runs out. The track is
        // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
        // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
        // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
        // back to a dropdown rather than wrap.
        const labelLen = (o) =>
          String(typeof o === 'object' ? o.label : o).length;
        const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
        const fitsAsSegments =
          maxLen <=
          ({
            2: 16,
            3: 10,
          }[options.length] ?? 0);
        if (!fitsAsSegments) {
          // <select> emits strings — map back to the original option value so the
          // fallback stays type-preserving (numbers, booleans) like the segment path.
          const resolve = (s) => {
            const m = options.find(
              (o) => String(typeof o === 'object' ? o.value : o) === s,
            );
            return m === undefined ? s : typeof m === 'object' ? m.value : m;
          };
          return /*#__PURE__*/ React.createElement(TweakSelect, {
            label: label,
            value: value,
            options: options,
            onChange: (s) => onChange(resolve(s)),
          });
        }
        const opts = options.map((o) =>
          typeof o === 'object'
            ? o
            : {
                value: o,
                label: o,
              },
        );
        const idx = Math.max(
          0,
          opts.findIndex((o) => o.value === value),
        );
        const n = opts.length;
        const segAt = (clientX) => {
          const r = trackRef.current.getBoundingClientRect();
          const inner = r.width - 4;
          const i = Math.floor(((clientX - r.left - 2) / inner) * n);
          return opts[Math.max(0, Math.min(n - 1, i))].value;
        };
        const onPointerDown = (e) => {
          setDragging(true);
          const v0 = segAt(e.clientX);
          if (v0 !== valueRef.current) onChange(v0);
          const move = (ev) => {
            if (!trackRef.current) return;
            const v = segAt(ev.clientX);
            if (v !== valueRef.current) onChange(v);
          };
          const up = () => {
            setDragging(false);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              ref: trackRef,
              role: 'radiogroup',
              onPointerDown: onPointerDown,
              className: dragging ? 'twk-seg dragging' : 'twk-seg',
            },
            /*#__PURE__*/ React.createElement('div', {
              className: 'twk-seg-thumb',
              style: {
                left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                width: `calc((100% - 4px) / ${n})`,
              },
            }),
            opts.map((o) =>
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  key: o.value,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': o.value === value,
                },
                o.label,
              ),
            ),
          ),
        );
      }
      function TweakSelect({ label, value, options, onChange }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'select',
            {
              className: 'twk-field',
              value: value,
              onChange: (e) => onChange(e.target.value),
            },
            options.map((o) => {
              const v = typeof o === 'object' ? o.value : o;
              const l = typeof o === 'object' ? o.label : o;
              return /*#__PURE__*/ React.createElement(
                'option',
                {
                  key: v,
                  value: v,
                },
                l,
              );
            }),
          ),
        );
      }
      function TweakText({ label, value, placeholder, onChange }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement('input', {
            className: 'twk-field',
            type: 'text',
            value: value,
            placeholder: placeholder,
            onChange: (e) => onChange(e.target.value),
          }),
        );
      }
      function TweakNumber({
        label,
        value,
        min,
        max,
        step = 1,
        unit = '',
        onChange,
      }) {
        const clamp = (n) => {
          if (min != null && n < min) return min;
          if (max != null && n > max) return max;
          return n;
        };
        const startRef = React.useRef({
          x: 0,
          val: 0,
        });
        const onScrubStart = (e) => {
          e.preventDefault();
          startRef.current = {
            x: e.clientX,
            val: value,
          };
          const decimals = (String(step).split('.')[1] || '').length;
          const move = (ev) => {
            const dx = ev.clientX - startRef.current.x;
            const raw = startRef.current.val + dx * step;
            const snapped = Math.round(raw / step) * step;
            onChange(clamp(Number(snapped.toFixed(decimals))));
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'twk-num',
          },
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'twk-num-lbl',
              onPointerDown: onScrubStart,
            },
            label,
          ),
          /*#__PURE__*/ React.createElement('input', {
            type: 'number',
            value: value,
            min: min,
            max: max,
            step: step,
            onChange: (e) => onChange(clamp(Number(e.target.value))),
          }),
          unit &&
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'twk-num-unit',
              },
              unit,
            ),
        );
      }

      // Relative-luminance contrast pick — checkmarks drawn over a swatch need to
      // read on both #111 and #fafafa without per-option configuration. Hex input
      // only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
      function __twkIsLight(hex) {
        const h = String(hex).replace('#', '');
        const x =
          h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
        const n = parseInt(x.slice(0, 6), 16);
        if (Number.isNaN(n)) return true;
        const r = (n >> 16) & 255,
          g = (n >> 8) & 255,
          b = n & 255;
        return r * 299 + g * 587 + b * 114 > 148000;
      }
      const __TwkCheck = ({ light }) =>
        /*#__PURE__*/ React.createElement(
          'svg',
          {
            viewBox: '0 0 14 14',
            'aria-hidden': 'true',
          },
          /*#__PURE__*/ React.createElement('path', {
            d: 'M3 7.2 5.8 10 11 4.2',
            fill: 'none',
            strokeWidth: '2.2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            stroke: light ? 'rgba(0,0,0,.78)' : '#fff',
          }),
        );

      // TweakColor — curated color/palette picker. Each option is either a single
      // hex string or an array of 1-5 hex strings; the card adapts — a lone color
      // renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
      // rest stacked in a sharp column on the right. onChange emits the
      // option in the shape it was passed (string stays string, array stays array).
      // Without options it falls back to the native color input for back-compat.
      function TweakColor({ label, value, options, onChange }) {
        if (!options || !options.length) {
          return /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-row twk-row-h',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-lbl',
              },
              /*#__PURE__*/ React.createElement('span', null, label),
            ),
            /*#__PURE__*/ React.createElement('input', {
              type: 'color',
              className: 'twk-swatch',
              value: value,
              onChange: (e) => onChange(e.target.value),
            }),
          );
        }
        // Native <input type=color> emits lowercase hex per the HTML spec, so
        // compare case-insensitively. String() guards JSON.stringify(undefined),
        // which returns the primitive undefined (no .toLowerCase).
        const key = (o) => String(JSON.stringify(o)).toLowerCase();
        const cur = key(value);
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-chips',
              role: 'radiogroup',
            },
            options.map((o, i) => {
              const colors = Array.isArray(o) ? o : [o];
              const [hero, ...rest] = colors;
              const sup = rest.slice(0, 4);
              const on = key(o) === cur;
              return /*#__PURE__*/ React.createElement(
                'button',
                {
                  key: i,
                  type: 'button',
                  className: 'twk-chip',
                  role: 'radio',
                  'aria-checked': on,
                  'data-on': on ? '1' : '0',
                  'aria-label': colors.join(', '),
                  title: colors.join(' · '),
                  style: {
                    background: hero,
                  },
                  onClick: () => onChange(o),
                },
                sup.length > 0 &&
                  /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    sup.map((c, j) =>
                      /*#__PURE__*/ React.createElement('i', {
                        key: j,
                        style: {
                          background: c,
                        },
                      }),
                    ),
                  ),
                on &&
                  /*#__PURE__*/ React.createElement(__TwkCheck, {
                    light: __twkIsLight(hero),
                  }),
              );
            }),
          ),
        );
      }
      function TweakButton({ label, onClick, secondary = false }) {
        return /*#__PURE__*/ React.createElement(
          'button',
          {
            type: 'button',
            className: secondary ? 'twk-btn secondary' : 'twk-btn',
            onClick: onClick,
          },
          label,
        );
      }
      Object.assign(window, {
        useTweaks,
        TweaksPanel,
        TweakSection,
        TweakRow,
        TweakSlider,
        TweakToggle,
        TweakRadio,
        TweakSelect,
        TweakText,
        TweakNumber,
        TweakColor,
        TweakButton,
      });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'landing/tweaks-panel.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/CTA.jsx
  try {
    (() => {
      function FinalCTA() {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'section cta-band',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'cta-card',
              },
              /*#__PURE__*/ React.createElement('div', {
                className: 'cta-card-glow',
              }),
              /*#__PURE__*/ React.createElement(
                'h2',
                null,
                'Your org deserves a command center.',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                null,
                'Bring your fleets, finances, and members under one roof. Set up Station in minutes \u2014 your crew stays right where they are, in Discord.',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'hero-cta',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-primary btn-lg',
                    href: '#',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'rocket',
                  }),
                  ' Launch your org free',
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    className: 'btn btn-ghost btn-lg',
                    href: '#',
                    style: {
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.25)',
                    },
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'calendar',
                  }),
                  ' Book a demo',
                ),
              ),
            ),
          ),
        );
      }
      function Footer() {
        const cols = [
          [
            'Product',
            ['Features', 'Pricing', 'Station Bot', 'Changelog', 'Status'],
          ],
          ['Resources', ['Docs', 'API', 'Guides', 'Community', 'Support']],
          ['Company', ['About Presstronic', 'Blog', 'Privacy', 'Terms']],
        ];
        return /*#__PURE__*/ React.createElement(
          'footer',
          {
            className: 'foot',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'foot-top',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'foot-brand',
                },
                /*#__PURE__*/ React.createElement(Logo, null),
                /*#__PURE__*/ React.createElement(
                  'p',
                  null,
                  'The full-stack command center for gaming guilds and orgs. A Presstronic product.',
                ),
              ),
              cols.map(([title, links]) =>
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'foot-col',
                    key: title,
                  },
                  /*#__PURE__*/ React.createElement('h5', null, title),
                  /*#__PURE__*/ React.createElement(
                    'ul',
                    null,
                    links.map((l) =>
                      /*#__PURE__*/ React.createElement(
                        'li',
                        {
                          key: l,
                        },
                        /*#__PURE__*/ React.createElement(
                          'a',
                          {
                            href: '#',
                          },
                          l,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'foot-bottom',
              },
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'made',
                },
                'Made by ',
                /*#__PURE__*/ React.createElement('b', null, 'Presstronic'),
                ' \xB7 \xA9 2026 Presstronic LLC',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'foot-social',
                },
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'Discord',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'message-circle',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'Bluesky',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'cloud',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'X',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'at-sign',
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  'a',
                  {
                    href: '#',
                    'aria-label': 'GitHub',
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'github',
                  }),
                ),
              ),
            ),
          ),
        );
      }
      window.FinalCTA = FinalCTA;
      window.Footer = Footer;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/CTA.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/FAQ.jsx
  try {
    (() => {
      function FAQItem({ q, a, open, onToggle }) {
        const ref = React.useRef(null);
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'faq-item' + (open ? ' open' : ''),
          },
          /*#__PURE__*/ React.createElement(
            'button',
            {
              className: 'faq-q',
              onClick: onToggle,
              'aria-expanded': open,
            },
            /*#__PURE__*/ React.createElement('span', null, q),
            /*#__PURE__*/ React.createElement('i', {
              'data-lucide': 'plus',
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'faq-a',
              style: {
                maxHeight:
                  open && ref.current ? ref.current.scrollHeight + 'px' : 0,
              },
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'faq-a-inner',
                ref: ref,
              },
              a,
            ),
          ),
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
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'section',
            id: 'faq',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap-narrow',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'section-head center',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'eyebrow center',
                },
                'Questions',
              ),
              /*#__PURE__*/ React.createElement(
                'h2',
                {
                  className: 'section-title',
                },
                'Frequently asked.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'faq-list',
              },
              items.map((it, i) =>
                /*#__PURE__*/ React.createElement(FAQItem, {
                  key: i,
                  q: it.q,
                  a: it.a,
                  open: openIdx === i,
                  onToggle: () => setOpenIdx(openIdx === i ? -1 : i),
                }),
              ),
            ),
          ),
        );
      }
      window.FAQ = FAQ;
      window.FAQItem = FAQItem;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/FAQ.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/Features.jsx
  try {
    (() => {
      function FeatureCard({
        icon,
        title,
        children,
        span = 2,
        warm = false,
        chips,
      }) {
        return /*#__PURE__*/ React.createElement(
          'article',
          {
            className:
              'fcard col-' +
              span +
              (warm ? ' warm' : '') +
              (chips ? ' feature-lg' : ''),
          },
          /*#__PURE__*/ React.createElement('div', {
            className: 'fcard-glow',
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'fico',
            },
            /*#__PURE__*/ React.createElement('i', {
              'data-lucide': icon,
            }),
          ),
          /*#__PURE__*/ React.createElement('h3', null, title),
          /*#__PURE__*/ React.createElement('p', null, children),
          chips &&
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'chip-row',
              },
              chips.map((c) =>
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'chip',
                    key: c,
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': 'check',
                  }),
                  ' ',
                  c,
                ),
              ),
            ),
        );
      }
      function Features() {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'section',
            id: 'features',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'section-head',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'eyebrow',
                },
                'Capabilities',
              ),
              /*#__PURE__*/ React.createElement(
                'h2',
                {
                  className: 'section-title',
                },
                'Everything your org needs, in one hangar.',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'section-sub',
                },
                'Station replaces a dozen bots, spreadsheets, and side channels with a single cohesive platform \u2014 purpose-built for the way orgs actually operate.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'bento',
              },
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'rocket',
                  title: 'Fleet management & sharing',
                  span: 3,
                  chips: [
                    'Shared loadouts',
                    'Crew assignments',
                    'Showcase pages',
                    'Readiness status',
                  ],
                },
                'Catalog every hull in the org, assign crews, and track readiness at a glance. Members share fleets, publish showcase pages, and rally the right ships for any operation.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'landmark',
                  title: 'Org & division accounting',
                  span: 3,
                  warm: true,
                  chips: [
                    'General fund',
                    'Division ledgers',
                    'Payouts',
                    'Full audit log',
                  ],
                },
                'A real treasury for your org \u2014 a general fund plus separate accounts for every division and department, with payouts, balances, and an immutable audit trail.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'bot',
                  title: 'Station Bot',
                },
                'Manage the Station Discord bot from a dashboard \u2014 commands, permissions, and automations without touching a config file.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'message-square-share',
                  title: 'Discord integration',
                },
                'Roles, ranks, and notifications stay in lockstep with Discord in real time. Members never leave the server they already live in.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'package',
                  title: 'Inventory management',
                },
                'Track stock across hangars and personal holds, set thresholds, and know exactly what the org owns and where it sits.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'pickaxe',
                  title: 'Mining operations',
                },
                'Plan extraction runs, log yields, and split refined returns across the crew with transparent, rules-based distribution.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'scroll-text',
                  title: 'Contract system',
                },
                'Post, claim, and settle contracts for items and services \u2014 with escrow-style payouts and a record of who delivered what.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'users',
                  title: 'Members & HR',
                },
                'Onboarding, ranks, applications, and reviews. Manage your roster with proper HR tooling instead of pinned messages.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'arrow-left-right',
                  title: 'Internal trade board',
                },
                'A members-only marketplace to buy, sell, and barter inside the org at fair internal rates \u2014 no scams, no spam.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'badge-check',
                  title: 'Certification management',
                },
                'Define skill certifications, run sign-offs, and gate operations to qualified members so the right people fly the right roles.',
              ),
              /*#__PURE__*/ React.createElement(
                FeatureCard,
                {
                  icon: 'medal',
                  title: 'Rewards & commendations',
                },
                'Recognize contribution with commendations, medals, and reward payouts that keep your best members engaged and visible.',
              ),
            ),
          ),
        );
      }
      window.Features = Features;
      window.FeatureCard = FeatureCard;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/Features.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/Hero.jsx
  try {
    (() => {
      function Console() {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'console',
            role: 'img',
            'aria-label': 'Station org command dashboard preview',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'console-bar',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'console-dots',
              },
              /*#__PURE__*/ React.createElement('i', null),
              /*#__PURE__*/ React.createElement('i', null),
              /*#__PURE__*/ React.createElement('i', null),
            ),
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'console-title',
              },
              'station.app / atlas-vanguard / overview',
            ),
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'console-body',
            },
            /*#__PURE__*/ React.createElement(
              'aside',
              {
                className: 'console-side',
              },
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item active',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'layout-dashboard',
                }),
                ' Overview',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'rocket',
                }),
                ' Fleet',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'package',
                }),
                ' Inventory',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'pickaxe',
                }),
                ' Mining',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'scroll-text',
                }),
                ' Contracts',
              ),
              /*#__PURE__*/ React.createElement('div', {
                className: 'side-sep',
              }),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'users',
                }),
                ' Members',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'landmark',
                }),
                ' Treasury',
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'side-item',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'award',
                }),
                ' Certs',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'console-main',
              },
              /*#__PURE__*/ React.createElement(
                'h4',
                null,
                'Atlas Vanguard ',
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'live',
                  },
                  'Live',
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'stat-row',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'stat',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'label',
                    },
                    'Org Treasury',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'value',
                    },
                    '8.42M',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'delta',
                    },
                    '+4.1% this cycle',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'stat',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'label',
                    },
                    'Active Members',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'value',
                    },
                    '312',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'delta',
                    },
                    '+18 this week',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'stat',
                  },
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'label',
                    },
                    'Open Contracts',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'value',
                    },
                    '27',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'div',
                    {
                      className: 'delta warm',
                    },
                    '6 awaiting payout',
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                'div',
                {
                  className: 'console-list',
                },
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ship-ico',
                    },
                    /*#__PURE__*/ React.createElement('i', {
                      'data-lucide': 'rocket',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'name',
                    },
                    'Carrack \xB7 \u201CMeridian\u201D',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'meta',
                    },
                    'Exploration',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'pill-badge ready',
                    },
                    'Ready',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ship-ico',
                    },
                    /*#__PURE__*/ React.createElement('i', {
                      'data-lucide': 'pickaxe',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'name',
                    },
                    'Prospector Wing',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'meta',
                    },
                    'Mining \xB7 6 crew',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'pill-badge active',
                    },
                    'Deployed',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'div',
                  {
                    className: 'row',
                  },
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'ship-ico',
                    },
                    /*#__PURE__*/ React.createElement('i', {
                      'data-lucide': 'scroll-text',
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'name',
                    },
                    'Quantanium Haul \xB7 Lot 0912',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'meta',
                    },
                    'Contract',
                  ),
                  /*#__PURE__*/ React.createElement(
                    'span',
                    {
                      className: 'pill-badge warm',
                    },
                    'Payout due',
                  ),
                ),
              ),
            ),
          ),
        );
      }
      function Hero() {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'hero',
            id: 'top',
          },
          /*#__PURE__*/ React.createElement('div', {
            className: 'hero-bg',
          }),
          /*#__PURE__*/ React.createElement('div', {
            className: 'hero-grid',
          }),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'hero-inner wrap',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'hero-pill',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'tag',
                },
                'New',
              ),
              'Station Bot now syncs roles to Discord in real time',
            ),
            /*#__PURE__*/ React.createElement(
              'h1',
              null,
              'Run your org like a ',
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'accent',
                },
                'flagship',
              ),
              ', not a spreadsheet.',
            ),
            /*#__PURE__*/ React.createElement(
              'p',
              {
                className: 'hero-sub',
              },
              'Station is the full-stack command center for gaming guilds and orgs \u2014 fleets, inventory, mining, contracts, treasury, and HR, all wired straight into Discord.',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'hero-cta',
              },
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-primary btn-lg',
                  href: '#pricing',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'rocket',
                }),
                ' Launch your org',
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-ghost btn-lg',
                  href: '#features',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'play',
                }),
                ' See it in action',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'hero-trust',
              },
              /*#__PURE__*/ React.createElement('i', {
                'data-lucide': 'shield-check',
                style: {
                  width: 16,
                  height: 16,
                },
              }),
              'Free for squads up to 25 \xB7 No card required',
            ),
          ),
          /*#__PURE__*/ React.createElement(Console, null),
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
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'marquee',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'marquee-label',
              },
              'Trusted by orgs running thousands of members',
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'marquee-row',
              },
              items.map(([ic, name]) =>
                /*#__PURE__*/ React.createElement(
                  'span',
                  {
                    className: 'marquee-item',
                    key: name,
                  },
                  /*#__PURE__*/ React.createElement('i', {
                    'data-lucide': ic,
                  }),
                  ' ',
                  name,
                ),
              ),
            ),
          ),
        );
      }
      window.Hero = Hero;
      window.Console = Console;
      window.Marquee = Marquee;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/Hero.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/Nav.jsx
  try {
    (() => {
      function Logo() {
        return /*#__PURE__*/ React.createElement(
          'a',
          {
            className: 'logo',
            href: '#top',
            'aria-label': 'Station home',
          },
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'logo-mark',
            },
            /*#__PURE__*/ React.createElement('i', {
              'data-lucide': 'orbit',
            }),
          ),
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'logo-word',
            },
            'STATION',
          ),
        );
      }
      function Nav({ theme, onToggleTheme }) {
        const [scrolled, setScrolled] = React.useState(false);
        React.useEffect(() => {
          const onScroll = () => setScrolled(window.scrollY > 8);
          onScroll();
          window.addEventListener('scroll', onScroll, {
            passive: true,
          });
          return () => window.removeEventListener('scroll', onScroll);
        }, []);
        return /*#__PURE__*/ React.createElement(
          'header',
          {
            className: 'nav' + (scrolled ? ' scrolled' : ''),
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'nav-inner',
            },
            /*#__PURE__*/ React.createElement(Logo, null),
            /*#__PURE__*/ React.createElement(
              'nav',
              null,
              /*#__PURE__*/ React.createElement(
                'ul',
                {
                  className: 'nav-links',
                },
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#features',
                    },
                    'Features',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#pricing',
                    },
                    'Pricing',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#faq',
                    },
                    'FAQ',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  'li',
                  null,
                  /*#__PURE__*/ React.createElement(
                    'a',
                    {
                      href: '#',
                    },
                    'Docs',
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'nav-actions',
              },
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'theme-toggle',
                  onClick: onToggleTheme,
                  'aria-label': 'Toggle color theme',
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'sun',
                  className: 'ico-light',
                }),
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': 'moon',
                  className: 'ico-dark',
                }),
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-ghost btn-sm',
                  href: '#',
                },
                'Sign in',
              ),
              /*#__PURE__*/ React.createElement(
                'a',
                {
                  className: 'btn btn-primary btn-sm',
                  href: '#pricing',
                },
                'Launch Station',
              ),
            ),
          ),
        );
      }
      window.Nav = Nav;
      window.Logo = Logo;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/Nav.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/Pricing.jsx
  try {
    (() => {
      function PriceCard({
        tier,
        price,
        per,
        note,
        cta,
        featured,
        badge,
        features,
      }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'pcard' + (featured ? ' featured' : ''),
          },
          badge &&
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'badge-pop',
              },
              badge,
            ),
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'tier',
            },
            tier,
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'price',
            },
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'amt',
              },
              price,
            ),
            per &&
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'per',
                },
                per,
              ),
          ),
          /*#__PURE__*/ React.createElement(
            'p',
            {
              className: 'price-note',
            },
            note,
          ),
          /*#__PURE__*/ React.createElement(
            'a',
            {
              className: 'btn ' + (featured ? 'btn-primary' : 'btn-ghost'),
              href: '#',
            },
            cta,
          ),
          /*#__PURE__*/ React.createElement(
            'ul',
            null,
            features.map((f) =>
              /*#__PURE__*/ React.createElement(
                'li',
                {
                  className: f.muted ? 'muted' : '',
                  key: f.label,
                },
                /*#__PURE__*/ React.createElement('i', {
                  'data-lucide': f.muted ? 'minus' : 'check',
                }),
                ' ',
                f.label,
              ),
            ),
          ),
        );
      }
      function Pricing() {
        return /*#__PURE__*/ React.createElement(
          'section',
          {
            className: 'section',
            id: 'pricing',
            style: {
              background: 'var(--surface-sunken)',
            },
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'wrap',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'section-head center',
              },
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'eyebrow center',
                },
                'Pricing',
              ),
              /*#__PURE__*/ React.createElement(
                'h2',
                {
                  className: 'section-title',
                },
                'Scale from a squad to an armada.',
              ),
              /*#__PURE__*/ React.createElement(
                'p',
                {
                  className: 'section-sub',
                },
                'Start free, upgrade when your org grows. Every plan includes Discord sync and the Station Bot \u2014 no add-ons, no surprises.',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'price-grid',
              },
              /*#__PURE__*/ React.createElement(PriceCard, {
                tier: 'Squad',
                price: '$0',
                per: '/ forever',
                note: 'For small crews finding their feet.',
                cta: 'Start free',
                features: [
                  {
                    label: 'Up to 25 members',
                  },
                  {
                    label: 'Fleet & inventory tracking',
                  },
                  {
                    label: 'Discord role sync',
                  },
                  {
                    label: 'Basic Station Bot',
                  },
                  {
                    label: 'Org accounting',
                    muted: true,
                  },
                  {
                    label: 'Contracts & trade board',
                    muted: true,
                  },
                ],
              }),
              /*#__PURE__*/ React.createElement(PriceCard, {
                tier: 'Org',
                price: '$19',
                per: '/ month',
                note: 'For active orgs running real operations.',
                cta: 'Launch Station',
                featured: true,
                badge: 'Most popular',
                features: [
                  {
                    label: 'Up to 300 members',
                  },
                  {
                    label: 'Everything in Squad, plus:',
                  },
                  {
                    label: 'Org & division accounting',
                  },
                  {
                    label: 'Contracts & mining tools',
                  },
                  {
                    label: 'Internal trade board',
                  },
                  {
                    label: 'Certifications & HR tools',
                  },
                  {
                    label: 'Rewards & commendations',
                  },
                ],
              }),
              /*#__PURE__*/ React.createElement(PriceCard, {
                tier: 'Fleet',
                price: '$49',
                per: '/ month',
                note: 'For large orgs and multi-division empires.',
                cta: 'Talk to us',
                features: [
                  {
                    label: 'Unlimited members',
                  },
                  {
                    label: 'Everything in Org, plus:',
                  },
                  {
                    label: 'Unlimited divisions',
                  },
                  {
                    label: 'Advanced audit & exports',
                  },
                  {
                    label: 'SSO & priority support',
                  },
                  {
                    label: 'Custom bot automations',
                  },
                ],
              }),
            ),
          ),
        );
      }
      window.Pricing = Pricing;
      window.PriceCard = PriceCard;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/Pricing.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/StationApp.jsx
  try {
    (() => {
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
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'station',
            'data-theme': theme === 'dark' ? 'dark' : undefined,
          },
          /*#__PURE__*/ React.createElement(Nav, {
            theme: theme,
            onToggleTheme: toggleTheme,
          }),
          /*#__PURE__*/ React.createElement(
            'main',
            null,
            /*#__PURE__*/ React.createElement(Hero, null),
            /*#__PURE__*/ React.createElement(Marquee, null),
            /*#__PURE__*/ React.createElement(Features, null),
            /*#__PURE__*/ React.createElement(Pricing, null),
            /*#__PURE__*/ React.createElement(FAQ, null),
            /*#__PURE__*/ React.createElement(FinalCTA, null),
          ),
          /*#__PURE__*/ React.createElement(Footer, null),
          /*#__PURE__*/ React.createElement(
            TweaksPanel,
            {
              title: 'Tweaks',
            },
            /*#__PURE__*/ React.createElement(TweakSection, {
              label: 'Appearance',
            }),
            /*#__PURE__*/ React.createElement(TweakRadio, {
              label: 'Theme',
              value: theme === 'dark' ? 'Dark' : 'Light',
              options: ['Dark', 'Light'],
              onChange: (v) =>
                setTweak('theme', v === 'Dark' ? 'dark' : 'light'),
            }),
          ),
        );
      }
      window.StationApp = StationApp;
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/StationApp.jsx',
      error: String((e && e.message) || e),
    });
  }

  // ui_kits/station/tweaks-panel.jsx
  try {
    (() => {
      // @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

      /* BEGIN USAGE */
      // tweaks-panel.jsx
      // Reusable Tweaks shell + form-control helpers.
      // Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
      //   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
      //
      // Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
      // posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
      // individual prototypes don't re-roll it. Ships a consistent set of controls so you
      // don't hand-draw <input type="range">, segmented radios, steppers, etc.
      //
      // Usage (in an HTML file that loads React + Babel):
      //
      //   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      //     "primaryColor": "#D97757",
      //     "palette": ["#D97757", "#29261b", "#f6f4ef"],
      //     "fontSize": 16,
      //     "density": "regular",
      //     "dark": false
      //   }/*EDITMODE-END*/;
      //
      //   function App() {
      //     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
      //     return (
      //       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
      //         Hello
      //         <TweaksPanel>
      //           <TweakSection label="Typography" />
      //           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
      //                        onChange={(v) => setTweak('fontSize', v)} />
      //           <TweakRadio  label="Density" value={t.density}
      //                        options={['compact', 'regular', 'comfy']}
      //                        onChange={(v) => setTweak('density', v)} />
      //           <TweakSection label="Theme" />
      //           <TweakColor  label="Primary" value={t.primaryColor}
      //                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
      //                        onChange={(v) => setTweak('primaryColor', v)} />
      //           <TweakColor  label="Palette" value={t.palette}
      //                        options={[['#D97757', '#29261b', '#f6f4ef'],
      //                                  ['#475569', '#0f172a', '#f1f5f9']]}
      //                        onChange={(v) => setTweak('palette', v)} />
      //           <TweakToggle label="Dark mode" value={t.dark}
      //                        onChange={(v) => setTweak('dark', v)} />
      //         </TweaksPanel>
      //       </div>
      //     );
      //   }
      //
      // TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
      // TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
      // options are many or long. For color tweaks always curate 3-4 options rather than
      // a free picker; an option can also be a whole 2–5 color palette (the stored value
      // is the array). The Tweak* controls are a floor, not a ceiling — build custom
      // controls inside the panel if a tweak calls for UI they don't cover.
      /* END USAGE */
      // ─────────────────────────────────────────────────────────────────────────────

      const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

      // ── useTweaks ───────────────────────────────────────────────────────────────
      // Single source of truth for tweak values. setTweak persists via the host
      // (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
      function useTweaks(defaults) {
        const [values, setValues] = React.useState(defaults);
        // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
        // useState-style call doesn't write a "[object Object]" key into the persisted
        // JSON block.
        const setTweak = React.useCallback((keyOrEdits, val) => {
          const edits =
            typeof keyOrEdits === 'object' && keyOrEdits !== null
              ? keyOrEdits
              : {
                  [keyOrEdits]: val,
                };
          setValues((prev) => ({
            ...prev,
            ...edits,
          }));
          window.parent.postMessage(
            {
              type: '__edit_mode_set_keys',
              edits,
            },
            '*',
          );
          // Same-window signal so in-page listeners (deck-stage rail thumbnails)
          // can react — the parent message only reaches the host, not peers.
          window.dispatchEvent(
            new CustomEvent('tweakchange', {
              detail: edits,
            }),
          );
        }, []);
        return [values, setTweak];
      }

      // ── TweaksPanel ─────────────────────────────────────────────────────────────
      // Floating shell. Registers the protocol listener BEFORE announcing
      // availability — if the announce ran first, the host's activate could land
      // before our handler exists and the toolbar toggle would silently no-op.
      // The close button posts __edit_mode_dismissed so the host's toolbar toggle
      // flips off in lockstep; the host echoes __deactivate_edit_mode back which
      // is what actually hides the panel.
      function TweaksPanel({ title = 'Tweaks', children }) {
        const [open, setOpen] = React.useState(false);
        const dragRef = React.useRef(null);
        const offsetRef = React.useRef({
          x: 16,
          y: 16,
        });
        const PAD = 16;
        const clampToViewport = React.useCallback(() => {
          const panel = dragRef.current;
          if (!panel) return;
          const w = panel.offsetWidth,
            h = panel.offsetHeight;
          const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
          const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
          offsetRef.current = {
            x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
            y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
          };
          panel.style.right = offsetRef.current.x + 'px';
          panel.style.bottom = offsetRef.current.y + 'px';
        }, []);
        React.useEffect(() => {
          if (!open) return;
          clampToViewport();
          if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', clampToViewport);
            return () => window.removeEventListener('resize', clampToViewport);
          }
          const ro = new ResizeObserver(clampToViewport);
          ro.observe(document.documentElement);
          return () => ro.disconnect();
        }, [open, clampToViewport]);
        React.useEffect(() => {
          const onMsg = (e) => {
            const t = e?.data?.type;
            if (t === '__activate_edit_mode') setOpen(true);
            else if (t === '__deactivate_edit_mode') setOpen(false);
          };
          window.addEventListener('message', onMsg);
          window.parent.postMessage(
            {
              type: '__edit_mode_available',
            },
            '*',
          );
          return () => window.removeEventListener('message', onMsg);
        }, []);
        const dismiss = () => {
          setOpen(false);
          window.parent.postMessage(
            {
              type: '__edit_mode_dismissed',
            },
            '*',
          );
        };
        const onDragStart = (e) => {
          const panel = dragRef.current;
          if (!panel) return;
          const r = panel.getBoundingClientRect();
          const sx = e.clientX,
            sy = e.clientY;
          const startRight = window.innerWidth - r.right;
          const startBottom = window.innerHeight - r.bottom;
          const move = (ev) => {
            offsetRef.current = {
              x: startRight - (ev.clientX - sx),
              y: startBottom - (ev.clientY - sy),
            };
            clampToViewport();
          };
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        };
        if (!open) return null;
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement('style', null, __TWEAKS_STYLE),
          /*#__PURE__*/ React.createElement(
            'div',
            {
              ref: dragRef,
              className: 'twk-panel',
              'data-omelette-chrome': '',
              style: {
                right: offsetRef.current.x,
                bottom: offsetRef.current.y,
              },
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-hd',
                onMouseDown: onDragStart,
              },
              /*#__PURE__*/ React.createElement('b', null, title),
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  className: 'twk-x',
                  'aria-label': 'Close tweaks',
                  onMouseDown: (e) => e.stopPropagation(),
                  onClick: dismiss,
                },
                '\u2715',
              ),
            ),
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-body',
              },
              children,
            ),
          ),
        );
      }

      // ── Layout helpers ──────────────────────────────────────────────────────────

      function TweakSection({ label, children }) {
        return /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-sect',
            },
            label,
          ),
          children,
        );
      }
      function TweakRow({ label, value, children, inline = false }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: inline ? 'twk-row twk-row-h' : 'twk-row',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-lbl',
            },
            /*#__PURE__*/ React.createElement('span', null, label),
            value != null &&
              /*#__PURE__*/ React.createElement(
                'span',
                {
                  className: 'twk-val',
                },
                value,
              ),
          ),
          children,
        );
      }

      // ── Controls ────────────────────────────────────────────────────────────────

      function TweakSlider({
        label,
        value,
        min = 0,
        max = 100,
        step = 1,
        unit = '',
        onChange,
      }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
            value: `${value}${unit}`,
          },
          /*#__PURE__*/ React.createElement('input', {
            type: 'range',
            className: 'twk-slider',
            min: min,
            max: max,
            step: step,
            value: value,
            onChange: (e) => onChange(Number(e.target.value)),
          }),
        );
      }
      function TweakToggle({ label, value, onChange }) {
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'twk-row twk-row-h',
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-lbl',
            },
            /*#__PURE__*/ React.createElement('span', null, label),
          ),
          /*#__PURE__*/ React.createElement(
            'button',
            {
              type: 'button',
              className: 'twk-toggle',
              'data-on': value ? '1' : '0',
              role: 'switch',
              'aria-checked': !!value,
              onClick: () => onChange(!value),
            },
            /*#__PURE__*/ React.createElement('i', null),
          ),
        );
      }
      function TweakRadio({ label, value, options, onChange }) {
        const trackRef = React.useRef(null);
        const [dragging, setDragging] = React.useState(false);
        // The active value is read by pointer-move handlers attached for the lifetime
        // of a drag — ref it so a stale closure doesn't fire onChange for every move.
        const valueRef = React.useRef(value);
        valueRef.current = value;

        // Segments wrap mid-word once per-segment width runs out. The track is
        // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
        // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
        // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
        // back to a dropdown rather than wrap.
        const labelLen = (o) =>
          String(typeof o === 'object' ? o.label : o).length;
        const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
        const fitsAsSegments =
          maxLen <=
          ({
            2: 16,
            3: 10,
          }[options.length] ?? 0);
        if (!fitsAsSegments) {
          // <select> emits strings — map back to the original option value so the
          // fallback stays type-preserving (numbers, booleans) like the segment path.
          const resolve = (s) => {
            const m = options.find(
              (o) => String(typeof o === 'object' ? o.value : o) === s,
            );
            return m === undefined ? s : typeof m === 'object' ? m.value : m;
          };
          return /*#__PURE__*/ React.createElement(TweakSelect, {
            label: label,
            value: value,
            options: options,
            onChange: (s) => onChange(resolve(s)),
          });
        }
        const opts = options.map((o) =>
          typeof o === 'object'
            ? o
            : {
                value: o,
                label: o,
              },
        );
        const idx = Math.max(
          0,
          opts.findIndex((o) => o.value === value),
        );
        const n = opts.length;
        const segAt = (clientX) => {
          const r = trackRef.current.getBoundingClientRect();
          const inner = r.width - 4;
          const i = Math.floor(((clientX - r.left - 2) / inner) * n);
          return opts[Math.max(0, Math.min(n - 1, i))].value;
        };
        const onPointerDown = (e) => {
          setDragging(true);
          const v0 = segAt(e.clientX);
          if (v0 !== valueRef.current) onChange(v0);
          const move = (ev) => {
            if (!trackRef.current) return;
            const v = segAt(ev.clientX);
            if (v !== valueRef.current) onChange(v);
          };
          const up = () => {
            setDragging(false);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              ref: trackRef,
              role: 'radiogroup',
              onPointerDown: onPointerDown,
              className: dragging ? 'twk-seg dragging' : 'twk-seg',
            },
            /*#__PURE__*/ React.createElement('div', {
              className: 'twk-seg-thumb',
              style: {
                left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                width: `calc((100% - 4px) / ${n})`,
              },
            }),
            opts.map((o) =>
              /*#__PURE__*/ React.createElement(
                'button',
                {
                  key: o.value,
                  type: 'button',
                  role: 'radio',
                  'aria-checked': o.value === value,
                },
                o.label,
              ),
            ),
          ),
        );
      }
      function TweakSelect({ label, value, options, onChange }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'select',
            {
              className: 'twk-field',
              value: value,
              onChange: (e) => onChange(e.target.value),
            },
            options.map((o) => {
              const v = typeof o === 'object' ? o.value : o;
              const l = typeof o === 'object' ? o.label : o;
              return /*#__PURE__*/ React.createElement(
                'option',
                {
                  key: v,
                  value: v,
                },
                l,
              );
            }),
          ),
        );
      }
      function TweakText({ label, value, placeholder, onChange }) {
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement('input', {
            className: 'twk-field',
            type: 'text',
            value: value,
            placeholder: placeholder,
            onChange: (e) => onChange(e.target.value),
          }),
        );
      }
      function TweakNumber({
        label,
        value,
        min,
        max,
        step = 1,
        unit = '',
        onChange,
      }) {
        const clamp = (n) => {
          if (min != null && n < min) return min;
          if (max != null && n > max) return max;
          return n;
        };
        const startRef = React.useRef({
          x: 0,
          val: 0,
        });
        const onScrubStart = (e) => {
          e.preventDefault();
          startRef.current = {
            x: e.clientX,
            val: value,
          };
          const decimals = (String(step).split('.')[1] || '').length;
          const move = (ev) => {
            const dx = ev.clientX - startRef.current.x;
            const raw = startRef.current.val + dx * step;
            const snapped = Math.round(raw / step) * step;
            onChange(clamp(Number(snapped.toFixed(decimals))));
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return /*#__PURE__*/ React.createElement(
          'div',
          {
            className: 'twk-num',
          },
          /*#__PURE__*/ React.createElement(
            'span',
            {
              className: 'twk-num-lbl',
              onPointerDown: onScrubStart,
            },
            label,
          ),
          /*#__PURE__*/ React.createElement('input', {
            type: 'number',
            value: value,
            min: min,
            max: max,
            step: step,
            onChange: (e) => onChange(clamp(Number(e.target.value))),
          }),
          unit &&
            /*#__PURE__*/ React.createElement(
              'span',
              {
                className: 'twk-num-unit',
              },
              unit,
            ),
        );
      }

      // Relative-luminance contrast pick — checkmarks drawn over a swatch need to
      // read on both #111 and #fafafa without per-option configuration. Hex input
      // only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
      function __twkIsLight(hex) {
        const h = String(hex).replace('#', '');
        const x =
          h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
        const n = parseInt(x.slice(0, 6), 16);
        if (Number.isNaN(n)) return true;
        const r = (n >> 16) & 255,
          g = (n >> 8) & 255,
          b = n & 255;
        return r * 299 + g * 587 + b * 114 > 148000;
      }
      const __TwkCheck = ({ light }) =>
        /*#__PURE__*/ React.createElement(
          'svg',
          {
            viewBox: '0 0 14 14',
            'aria-hidden': 'true',
          },
          /*#__PURE__*/ React.createElement('path', {
            d: 'M3 7.2 5.8 10 11 4.2',
            fill: 'none',
            strokeWidth: '2.2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            stroke: light ? 'rgba(0,0,0,.78)' : '#fff',
          }),
        );

      // TweakColor — curated color/palette picker. Each option is either a single
      // hex string or an array of 1-5 hex strings; the card adapts — a lone color
      // renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
      // rest stacked in a sharp column on the right. onChange emits the
      // option in the shape it was passed (string stays string, array stays array).
      // Without options it falls back to the native color input for back-compat.
      function TweakColor({ label, value, options, onChange }) {
        if (!options || !options.length) {
          return /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-row twk-row-h',
            },
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: 'twk-lbl',
              },
              /*#__PURE__*/ React.createElement('span', null, label),
            ),
            /*#__PURE__*/ React.createElement('input', {
              type: 'color',
              className: 'twk-swatch',
              value: value,
              onChange: (e) => onChange(e.target.value),
            }),
          );
        }
        // Native <input type=color> emits lowercase hex per the HTML spec, so
        // compare case-insensitively. String() guards JSON.stringify(undefined),
        // which returns the primitive undefined (no .toLowerCase).
        const key = (o) => String(JSON.stringify(o)).toLowerCase();
        const cur = key(value);
        return /*#__PURE__*/ React.createElement(
          TweakRow,
          {
            label: label,
          },
          /*#__PURE__*/ React.createElement(
            'div',
            {
              className: 'twk-chips',
              role: 'radiogroup',
            },
            options.map((o, i) => {
              const colors = Array.isArray(o) ? o : [o];
              const [hero, ...rest] = colors;
              const sup = rest.slice(0, 4);
              const on = key(o) === cur;
              return /*#__PURE__*/ React.createElement(
                'button',
                {
                  key: i,
                  type: 'button',
                  className: 'twk-chip',
                  role: 'radio',
                  'aria-checked': on,
                  'data-on': on ? '1' : '0',
                  'aria-label': colors.join(', '),
                  title: colors.join(' · '),
                  style: {
                    background: hero,
                  },
                  onClick: () => onChange(o),
                },
                sup.length > 0 &&
                  /*#__PURE__*/ React.createElement(
                    'span',
                    null,
                    sup.map((c, j) =>
                      /*#__PURE__*/ React.createElement('i', {
                        key: j,
                        style: {
                          background: c,
                        },
                      }),
                    ),
                  ),
                on &&
                  /*#__PURE__*/ React.createElement(__TwkCheck, {
                    light: __twkIsLight(hero),
                  }),
              );
            }),
          ),
        );
      }
      function TweakButton({ label, onClick, secondary = false }) {
        return /*#__PURE__*/ React.createElement(
          'button',
          {
            type: 'button',
            className: secondary ? 'twk-btn secondary' : 'twk-btn',
            onClick: onClick,
          },
          label,
        );
      }
      Object.assign(window, {
        useTweaks,
        TweaksPanel,
        TweakSection,
        TweakRow,
        TweakSlider,
        TweakToggle,
        TweakRadio,
        TweakSelect,
        TweakText,
        TweakNumber,
        TweakColor,
        TweakButton,
      });
    })();
  } catch (e) {
    __ds_ns.__errors.push({
      path: 'ui_kits/station/tweaks-panel.jsx',
      error: String((e && e.message) || e),
    });
  }

  __ds_ns.Badge = __ds_scope.Badge;

  __ds_ns.Button = __ds_scope.Button;
})();
