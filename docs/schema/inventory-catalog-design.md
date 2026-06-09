# Inventory & Catalog Design

The authoritative design decisions for the Station inventory and catalog domains are captured in the epic comments rather than duplicated here. This file exists as a stable pointer for any issue or document that references `docs/schema/inventory-catalog-design.md`.

## Canonical sources

| Domain | Source |
|---|---|
| Inventory schema, ownership model, UoM, location, category, quality | [Epic #10 — Inventory epic](https://github.com/GitAddRemote/station/issues/10) — see the pinned design snapshot comment |
| Blueprint semantics, visibility model, schema direction | [Epic #300 — Blueprints epic](https://github.com/GitAddRemote/station/issues/300) — see the pinned design snapshot comment |

## Key decisions (summary)

- **Ownership model**: polymorphic `owner_type` (`user` / `org`) + `owner_id` (UUID)
- **Catalog entry kinds**: `item`, `commodity`, `vehicle` via `catalog_kind`
- **Category structure**: single recursive table with materialized path
- **UoM**: first-class `station_unit_of_measure` reference table; commodities use SCU-family units, items/vehicles use `unit`
- **Location**: structured selection via `station_location`; free-text location is not supported
- **Quality**: instance-level field on inventory rows; commodity quality is allowed, discrete items default to null
- **Inventory model**: snapshot (not ledger); event ledger is a post-MVP concern
- **Blueprints**: separate domain from inventory — not modeled as inventory rows

## Implementation issues

- #276, #277, #278, #279, #280 — schema / ETL
- #184, #200, #203, #204, #205 — inventory backend and frontend
- #294, #295, #296 — blueprint domain and UI
- #297, #298 — closed (identity strategy, quality configuration)

See each issue for acceptance criteria and technical elaboration.
