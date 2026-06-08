# Inventory Quality Policy

This document defines the global validation policy for inventory-instance
quality values in Station.

## Decision

- Quality belongs to the owned inventory instance, not to catalog definitions.
- Quality is currently treated as an integer-based value.
- The currently observed Star Citizen / UEX representation appears to be
  roughly `0..1000`.
- Station does not hardcode that observed upper bound into the database schema.
- The authoritative application-policy upper bound is global and environment
  configurable through `INVENTORY_QUALITY_MAX`.
- The documented default policy value is `1000` until upstream semantics are
  clearer.

## Validation Boundary

- Database constraints enforce only structural invariants:
  - `quality` may be `NULL`
  - non-`NULL` quality values must be non-negative integers
- Application/service validation enforces policy:
  - request validation should reject values above the configured global
    `INVENTORY_QUALITY_MAX`
  - service-layer warnings/errors can evolve if CIG changes the meaning or
    range of quality later
- No database triggers are required for quality policy behavior.

## Why This Split Exists

- A hardcoded database ceiling like `CHECK (quality <= 1000)` would encode a
  potentially temporary Star Citizen assumption into the schema.
- A global app-level max keeps behavior consistent across org and user
  inventory flows while still allowing the ceiling to move without a schema
  migration.
- Keeping the database limited to structural rules avoids silent divergence
  between old rows and new policy values if the ceiling changes later.

## Implementation Notes

- `station_inventory_item.quality` remains an `INTEGER NULL` column.
- `station_inventory_item` now enforces `quality >= 0` when present.
- The shared policy default lives in
  `backend/src/config/inventory-quality.config.ts`.
- `backend/src/config/env.validation.ts` validates `INVENTORY_QUALITY_MAX` as a
  non-negative integer and supplies the default.
- Legacy inventory CRUD DTOs still contain older hardcoded bounds today; they
  should be updated in the inventory CRUD follow-up tracked by issue `#300` so
  request validation matches this policy.

## Tests Needed

- Config parsing tests for valid, missing, and invalid `INVENTORY_QUALITY_MAX`
  values.
- Inventory CRUD request-validation tests proving values above the configured
  max are rejected once issue `#300` lands.
- Migration tests or migration smoke checks confirming
  `station_inventory_item.quality` accepts `NULL` and non-negative integers,
  while rejecting negative values.
