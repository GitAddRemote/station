# Station Design System — project notes

## Product direction

**Station** is an organization-management platform for competitive gaming guilds (primary game: Star Citizen). Built by Presstronic. Dark-dominant "mission control" aesthetic on the Presstronic tokens (aqua primary, coral reserved as a warm accent).

## Dashboard architecture — IMPORTANT

The dashboard is intended to become **user-customizable**: users will drag portlets to rearrange them so the dashboard reflects their playstyle (a miner puts the Mining portlet top-left + Inventory top-middle; a salvager/PvP/hauler arranges differently).

Implications for all dashboard work:

- Build every portlet as a **self-contained, uniform card** that snaps into a grid — never hard-couple a portlet to a fixed page position.
- Portlets should share a common header pattern (icon + title + optional action) so a **drag handle** can be added uniformly.
- Keep portlet **sizes consistent** (e.g. half-width and full-width spans) so they tile predictably in a grid.
- Persist user layout (localStorage) so a rearranged dashboard survives reload.
- Planned portlets beyond today's set: **Mining, Salvage, PvP/Combat, Hauling/Trade**, plus existing Profile / Organizations / Invitations / Inventory.

## Files

- `landing/` — pre-login marketing landing page (Station Landing.html)
- `dashboard/` — post-login dashboard (Station Dashboard.html)
- `reference/station/` — read-only `.txt` copies of the real app source (do NOT rename to .tsx; the DS compiler would try to bundle them)
- Reuse `styles.css` + `ui_kits/station/station.css`; add screen-specific CSS per folder.
