# Station Normalized Schema Design

---

> **Query Convention:** All Station UI queries filter on `is_available_live = TRUE`. `is_available` (UEX platform flag) is stored for completeness but is **not** used as the primary UI visibility filter. This distinction must be preserved in all TypeORM entity definitions via JSDoc comments on both columns.

---

## 1. UEX API Field Analysis

### 1.1 `/categories` (pre-fetched, confirmed via API)

| Field           | Type       | Description                                                        |
| --------------- | ---------- | ------------------------------------------------------------------ |
| id              | int        | Unique identifier                                                  |
| type            | string     | Category type: `item`, `service`, or `contract`                    |
| section         | string     | Section grouping (e.g. "Combat", "Medical") — acts as parent level |
| name            | string     | Display name (e.g. "Armor", "Personal Weapons")                    |
| is_game_related | int (bool) | Exists in-game                                                     |
| is_mining       | int (bool) | Mining-related category                                            |
| date_added      | int        | Unix timestamp                                                     |
| date_modified   | int        | Unix timestamp                                                     |

### 1.2 `/categories_attributes` (fetched)

| Field           | Type       | Description                                              |
| --------------- | ---------- | -------------------------------------------------------- |
| id              | int        | Unique identifier                                        |
| id_category     | int        | FK to categories                                         |
| name            | string     | Attribute name (e.g. "Damage Resistance", "Fire Rate")   |
| category_name   | string     | Denormalised category name                               |
| description     | string     | Human-readable explanation                               |
| is_lower_better | int (bool) | Whether lower value is preferable; not applicable to all |
| date_added      | int        | Unix timestamp                                           |
| date_modified   | int        | Unix timestamp                                           |

**Note:** Only exists for `item`-type categories. Drives what attributes a category's items can have.

### 1.3 `/cities` (fetched)

| Field                | Type         | Description                                 |
| -------------------- | ------------ | ------------------------------------------- |
| id                   | int          | Unique identifier                           |
| id_star_system       | int          | FK to star_systems                          |
| id_planet            | int          | FK to planets                               |
| id_orbit             | int          | FK to orbits                                |
| id_moon              | int          | FK to moons                                 |
| id_faction           | int          | FK to factions                              |
| id_jurisdiction      | int          | FK to jurisdictions                         |
| name                 | string       | City name                                   |
| code                 | string       | Short code identifier                       |
| is_available         | int (bool)   | Available on UEX                            |
| is_available_live    | int (bool)   | Available on SC live server                 |
| is_visible           | int (bool)   | Public on UEX                               |
| is_default           | int (bool)   | Default designation                         |
| is_monitored         | int (bool)   | Monitored by UEE commlink                   |
| is_armistice         | int (bool)   | Armistice zone                              |
| is_landable          | int (bool)   | Can be landed at                            |
| is_decommissioned    | int (bool)   | No longer operational                       |
| has_quantum_marker   | int (bool)   | QT marker present                           |
| has_trade_terminal   | int (bool)   | Trade terminal present                      |
| has_habitation       | int (bool)   | Habitation available                        |
| has_refinery         | int (bool)   | Refinery present                            |
| has_cargo_center     | int (bool)   | Cargo center present                        |
| has_clinic           | int (bool)   | Medical clinic present                      |
| has_food             | int (bool)   | Food services present                       |
| has_shops            | int (bool)   | Retail shops present                        |
| has_refuel           | int (bool)   | Refuel capability                           |
| has_repair           | int (bool)   | Repair services                             |
| has_gravity          | int (bool)   | Artificial gravity                          |
| has_loading_dock     | int (bool)   | Loading dock present                        |
| has_docking_port     | int (bool)   | Docking port present                        |
| has_freight_elevator | int (bool)   | Freight elevator present                    |
| pad_types            | string\|null | Pipe-delimited pad sizes: `XS\|S\|M\|L\|XL` |
| wiki                 | string\|null | Wiki URL                                    |
| date_added           | int          | Unix timestamp                              |
| date_modified        | int          | Unix timestamp                              |
| star_system_name     | string\|null | Denormalised                                |
| planet_name          | string\|null | Denormalised                                |
| orbit_name           | string\|null | Denormalised                                |
| moon_name            | string\|null | Denormalised                                |
| faction_name         | string\|null | Denormalised                                |
| jurisdiction_name    | string\|null | Denormalised                                |

### 1.4 `/commodities` (pre-fetched, confirmed via API)

| Field             | Type         | Description                                      |
| ----------------- | ------------ | ------------------------------------------------ |
| id                | int          | Unique identifier                                |
| id_parent         | int\|null    | Parent commodity (e.g. refined derives from raw) |
| name              | string       | Commodity name                                   |
| code              | string       | UEX short code                                   |
| slug              | string       | URL slug                                         |
| kind              | string\|null | Classification (e.g. "Gas", "Metal")             |
| weight_scu        | int\|null    | Weight in tons per SCU                           |
| price_buy         | float        | Average buy price per SCU                        |
| price_sell        | float        | Average sell price per SCU                       |
| is_available      | int (bool)   | On UEX platform                                  |
| is_available_live | int (bool)   | On SC live                                       |
| is_visible        | int (bool)   | Public on UEX                                    |
| is_extractable    | int (bool)   | Can be mined/extracted                           |
| is_mineral        | int (bool)   | Mineral classification                           |
| is_raw            | int (bool)   | Raw material                                     |
| is_pure           | int (bool)   | Pure form                                        |
| is_refined        | int (bool)   | Refined form                                     |
| is_refinable      | int (bool)   | Can be refined                                   |
| is_harvestable    | int (bool)   | Can be harvested                                 |
| is_buyable        | int (bool)   | Available to buy                                 |
| is_sellable       | int (bool)   | Available to sell                                |
| is_temporary      | int (bool)   | Temporary availability                           |
| is_illegal        | int (bool)   | Illegal in some jurisdictions                    |
| is_volatile_qt    | int (bool)   | Volatile during quantum travel                   |
| is_volatile_time  | int (bool)   | Degrades over time                               |
| is_inert          | int (bool)   | Inert gas                                        |
| is_explosive      | int (bool)   | Risk of explosion                                |
| is_buggy          | int (bool)   | Known game bug                                   |
| is_fuel           | int (bool)   | Fuel classification                              |
| wiki              | string\|null | Wiki URL                                         |
| date_added        | int          | Unix timestamp                                   |
| date_modified     | int          | Unix timestamp                                   |

### 1.5 `/commodities_routes` (fetched — out of scope for this schema, documented for completeness)

This endpoint returns computed trade route data including pricing, SCU availability, volatility, and financial projections. It references `id_terminal_origin` / `id_terminal_destination` (terminal IDs not present in other endpoints), origin/destination locations, and commodity IDs. This is a future application-layer concern and is not represented in Station's normalized catalog tables. Fields are documented here for reference only.

Key fields: `id`, `id_commodity`, `id_star_system_origin`, `id_star_system_destination`, `id_planet_origin`, `id_planet_destination`, `id_orbit_origin`, `id_orbit_destination`, `id_terminal_origin`, `id_terminal_destination`, `id_faction_origin`, `id_faction_destination`, `distance` (GM), `score`, `price_origin`, `price_destination`, `price_margin`, `price_roi`, `scu_origin`, `scu_destination`, `investment`, `profit`, `volatility_origin`, `volatility_destination`, `status_origin`, `status_destination`, game infrastructure flags, `date_added`.

**Implication for schema:** `station_terminal` is now implemented. See §6.2 in the Decisions Log.

### 1.6 `/companies` (pre-fetched, confirmed via API)

| Field                   | Type         | Description            |
| ----------------------- | ------------ | ---------------------- |
| id                      | int          | Unique identifier      |
| id_faction              | int          | FK to factions         |
| name                    | string       | Company name           |
| nickname                | string       | Abbreviation           |
| wiki                    | string\|null | Wiki URL               |
| industry                | string\|null | Main business activity |
| is_item_manufacturer    | int (bool)   | Makes items            |
| is_vehicle_manufacturer | int (bool)   | Makes vehicles         |
| date_added              | int          | Unix timestamp         |
| date_modified           | int          | Unix timestamp         |

### 1.7 `/factions` (pre-fetched, confirmed via API)

| Field                 | Type                   | Description                       |
| --------------------- | ---------------------- | --------------------------------- |
| id                    | int                    | Unique identifier                 |
| ids_star_systems      | string (CSV int)       | Star systems the faction occupies |
| ids_factions_friendly | string\|null (CSV int) | Allied faction IDs                |
| ids_factions_hostile  | string\|null (CSV int) | Enemy faction IDs                 |
| name                  | string                 | Faction name                      |
| wiki                  | string\|null           | Wiki URL                          |
| is_piracy             | int (bool)             | Piracy faction                    |
| is_bounty_hunting     | int (bool)             | Bounty hunting faction            |
| date_added            | int                    | Unix timestamp                    |
| date_modified         | int                    | Unix timestamp                    |

### 1.8 `/items` (pre-fetched, confirmed via API)

| Field                   | Type         | Description                                         |
| ----------------------- | ------------ | --------------------------------------------------- |
| id                      | int          | Identifier (may change on website updates)          |
| id_parent               | int          | Parent item (variant/component hierarchy)           |
| id_category             | int          | FK to categories                                    |
| id_company              | int          | FK to companies                                     |
| id_vehicle              | int          | FK to vehicles (if mounted item)                    |
| name                    | string       | Item name                                           |
| section                 | string\|null | Denormalised section from categories                |
| category                | string\|null | Denormalised category name                          |
| company_name            | string\|null | Denormalised                                        |
| vehicle_name            | string\|null | Denormalised                                        |
| slug                    | string       | URL slug                                            |
| size                    | string\|null | Size designation (e.g. "1", "2", "S", "M")          |
| uuid                    | string\|null | Star Citizen UUID (stable cross-patch ID)           |
| color                   | string\|null | Primary colour                                      |
| color2                  | string\|null | Secondary colour                                    |
| url_store               | string\|null | Pledge store URL                                    |
| quality                 | int\|null    | Quality level                                       |
| is_exclusive_pledge     | int (bool)   | Pledge store exclusive                              |
| is_exclusive_subscriber | int (bool)   | Subscriber exclusive                                |
| is_exclusive_concierge  | int (bool)   | Concierge exclusive                                 |
| is_commodity            | int (bool)   | Also a commodity                                    |
| is_harvestable          | int (bool)   | Can be harvested                                    |
| screenshot              | string       | Image URL (currently suspended)                     |
| attributes              | json         | Deprecated; superseded by items_attributes endpoint |
| notification            | json         | Known-issue alerts                                  |
| game_version            | string       | Game version when added/updated                     |
| date_added              | int          | Unix timestamp                                      |
| date_modified           | int          | Unix timestamp                                      |

### 1.9 `/items_attributes` (fetched)

| Field                 | Type         | Description                                         |
| --------------------- | ------------ | --------------------------------------------------- |
| id                    | int          | Unique identifier                                   |
| id_item               | int          | FK to items                                         |
| id_category           | int          | FK to categories                                    |
| id_category_attribute | int          | FK to categories_attributes (defines the attribute) |
| category_name         | string\|null | Denormalised                                        |
| item_name             | string       | Denormalised                                        |
| item_uuid             | string\|null | Star Citizen UUID                                   |
| attribute_name        | string       | Denormalised attribute name                         |
| value                 | string\|null | Attribute value (stored as string; parse per unit)  |
| unit                  | string\|null | Measurement unit (e.g. "m/s", "%", "deg")           |
| date_added            | int          | Unix timestamp                                      |
| date_modified         | int          | Unix timestamp                                      |

### 1.10 `/jump_points` (fetched)

| Field                        | Type         | Description                            |
| ---------------------------- | ------------ | -------------------------------------- |
| id                           | int          | Unique identifier                      |
| id_star_system_origin        | int          | FK to star_systems                     |
| id_star_system_destination   | int          | FK to star_systems                     |
| id_orbit_origin              | int          | FK to orbits (location of entry point) |
| id_orbit_destination         | int          | FK to orbits (location of exit point)  |
| star_system_name_origin      | string       | Denormalised                           |
| star_system_name_destination | string       | Denormalised                           |
| orbit_name_origin            | string\|null | Denormalised                           |
| orbit_name_destination       | string\|null | Denormalised                           |
| date_added                   | int          | Unix timestamp                         |
| date_modified                | int          | Unix timestamp                         |

### 1.11 `/jurisdictions` (fetched)

| Field             | Type         | Description                                                                              |
| ----------------- | ------------ | ---------------------------------------------------------------------------------------- |
| id                | int          | Unique identifier                                                                        |
| id_faction        | int          | FK to factions (docs say "csv" but confirmed single value; ETL throws on CSV — see §6.3) |
| name              | string       | Jurisdiction name (e.g. "UEE", "Banu Protectorate")                                      |
| nickname          | string       | Short identifier                                                                         |
| is_available      | int (bool)   | Available on UEX                                                                         |
| is_available_live | int (bool)   | Available on SC live                                                                     |
| is_visible        | int (bool)   | Public on UEX                                                                            |
| is_default        | int (bool)   | Default indicator                                                                        |
| wiki              | string\|null | Wiki URL                                                                                 |
| date_added        | int          | Unix timestamp                                                                           |
| date_modified     | int          | Unix timestamp                                                                           |
| faction_name      | string\|null | Denormalised                                                                             |

### 1.12 `/moons` (fetched)

| Field             | Type         | Description             |
| ----------------- | ------------ | ----------------------- |
| id                | int          | Unique identifier       |
| id_star_system    | int          | FK to star_systems      |
| id_planet         | int          | FK to planets           |
| id_orbit          | int          | FK to orbits            |
| id_faction        | int          | FK to factions          |
| id_jurisdiction   | int          | FK to jurisdictions     |
| name              | string       | Moon name               |
| name_origin       | string       | Original/discovery name |
| code              | string       | UEX code                |
| is_available      | int (bool)   | Available on UEX        |
| is_available_live | int (bool)   | Available on SC live    |
| is_visible        | int (bool)   | Public on UEX           |
| is_default        | int (bool)   | Default indicator       |
| date_added        | int          | Unix timestamp          |
| date_modified     | int          | Unix timestamp          |
| star_system_name  | string\|null | Denormalised            |
| planet_name       | string\|null | Denormalised            |
| orbit_name        | string\|null | Denormalised            |
| faction_name      | string\|null | Denormalised            |
| jurisdiction_name | string\|null | Denormalised            |

### 1.13 `/orbits` (fetched)

| Field             | Type         | Description             |
| ----------------- | ------------ | ----------------------- |
| id                | int          | Unique identifier       |
| id_star_system    | int          | FK to star_systems      |
| id_faction        | int          | FK to factions          |
| id_jurisdiction   | int          | FK to jurisdictions     |
| name              | string       | Orbit/body name         |
| name_origin       | string       | Discovery/original name |
| code              | string (10)  | UEX internal code       |
| is_available      | int (bool)   | Available on UEX        |
| is_available_live | int (bool)   | Available on SC live    |
| is_visible        | int (bool)   | Public on UEX           |
| is_default        | int (bool)   | Default indicator       |
| is_lagrange       | int (bool)   | Lagrange point          |
| is_man_made       | int (bool)   | Man-made structure      |
| is_asteroid       | int (bool)   | Asteroid classification |
| is_planet         | int (bool)   | Planet classification   |
| is_star           | int (bool)   | Star classification     |
| is_jump_point     | int (bool)   | Jump point              |
| date_added        | int          | Unix timestamp          |
| date_modified     | int          | Unix timestamp          |
| star_system_name  | string\|null | Denormalised            |
| faction_name      | string\|null | Denormalised            |
| jurisdiction_name | string\|null | Denormalised            |

**Note:** Orbits is UEX's universal positional layer. Every named celestial body or man-made structure has an orbit entry. Planets, moons, space stations, and jump points each cross-reference back to an orbit ID.

### 1.14 `/orbits_distances` (fetched)

| Field                      | Type         | Description                 |
| -------------------------- | ------------ | --------------------------- |
| id                         | int          | Unique identifier           |
| id_star_system             | int          | Deprecated                  |
| id_star_system_origin      | int          | FK to star_systems          |
| id_star_system_destination | int          | FK to star_systems          |
| id_orbit_origin            | int          | FK to orbits                |
| id_orbit_destination       | int          | FK to orbits                |
| distance                   | float        | Distance in Gigameters (Gm) |
| game_version               | string       | Game version when measured  |
| date_added                 | int          | Unix timestamp              |
| date_modified              | int          | Unix timestamp              |
| star_system_name           | string\|null | Denormalised                |
| orbit_origin_name          | string\|null | Denormalised                |
| orbit_destination_name     | string\|null | Denormalised                |

**Note:** Populated by Datarunners; distances change every patch cycle.

### 1.15 `/outposts` (fetched)

| Field                | Type         | Description                       |
| -------------------- | ------------ | --------------------------------- |
| id                   | int          | Unique identifier                 |
| id_star_system       | int          | FK to star_systems                |
| id_planet            | int          | FK to planets                     |
| id_orbit             | int          | FK to orbits                      |
| id_moon              | int          | FK to moons                       |
| id_faction           | int          | FK to factions                    |
| id_jurisdiction      | int          | FK to jurisdictions               |
| name                 | string       | Outpost name                      |
| nickname             | string       | Outpost nickname                  |
| is_available         | int (bool)   | Available on UEX                  |
| is_available_live    | int (bool)   | Available on SC live              |
| is_visible           | int (bool)   | Public on UEX                     |
| is_default           | int (bool)   | Default indicator                 |
| is_monitored         | int (bool)   | UEE commlink monitored            |
| is_armistice         | int (bool)   | Armistice zone                    |
| is_landable          | int (bool)   | Landable                          |
| is_decommissioned    | int (bool)   | Decommissioned                    |
| has_quantum_marker   | int (bool)   | QT marker                         |
| has_trade_terminal   | int (bool)   | Trade terminal                    |
| has_habitation       | int (bool)   | Habitation                        |
| has_refinery         | int (bool)   | Refinery                          |
| has_cargo_center     | int (bool)   | Cargo center                      |
| has_clinic           | int (bool)   | Clinic                            |
| has_food             | int (bool)   | Food services                     |
| has_shops            | int (bool)   | Shops                             |
| has_refuel           | int (bool)   | Refuel                            |
| has_repair           | int (bool)   | Repair                            |
| has_gravity          | int (bool)   | Gravity                           |
| has_loading_dock     | int (bool)   | Loading dock                      |
| has_docking_port     | int (bool)   | Docking port                      |
| has_freight_elevator | int (bool)   | Freight elevator                  |
| pad_types            | string\|null | Pipe-delimited: `XS\|S\|M\|L\|XL` |
| date_added           | int          | Unix timestamp                    |
| date_modified        | int          | Unix timestamp                    |
| star_system_name     | string\|null | Denormalised                      |
| planet_name          | string\|null | Denormalised                      |
| orbit_name           | string\|null | Denormalised                      |
| moon_name            | string\|null | Denormalised                      |
| faction_name         | string\|null | Denormalised                      |
| jurisdiction_name    | string\|null | Denormalised                      |

### 1.16 `/planets` (pre-fetched, confirmed via API)

| Field             | Type         | Description             |
| ----------------- | ------------ | ----------------------- |
| id                | int          | Unique identifier       |
| id_star_system    | int          | FK to star_systems      |
| id_faction        | int          | FK to factions          |
| id_jurisdiction   | int          | FK to jurisdictions     |
| name              | string       | Planet name             |
| name_origin       | string       | Discovery/original name |
| code              | string       | UEX code                |
| is_available      | int (bool)   | Available on UEX        |
| is_available_live | int (bool)   | Available on SC live    |
| is_visible        | int (bool)   | Public on UEX           |
| is_default        | int (bool)   | Default indicator       |
| is_lagrange       | int (bool)   | Lagrange point object   |
| date_added        | int          | Unix timestamp          |
| date_modified     | int          | Unix timestamp          |
| star_system_name  | string\|null | Denormalised            |
| faction_name      | string\|null | Denormalised            |
| jurisdiction_name | string\|null | Denormalised            |

### 1.17 `/poi` (fetched)

| Field                | Type         | Description                       |
| -------------------- | ------------ | --------------------------------- |
| id                   | int          | Unique identifier                 |
| id_star_system       | int          | FK to star_systems                |
| id_planet            | int          | FK to planets                     |
| id_orbit             | int          | FK to orbits                      |
| id_moon              | int          | FK to moons                       |
| id_space_station     | int          | FK to space_stations              |
| id_city              | int          | FK to cities                      |
| id_outpost           | int          | FK to outposts                    |
| id_faction           | int          | FK to factions                    |
| id_jurisdiction      | int          | FK to jurisdictions               |
| name                 | string       | POI name                          |
| nickname             | string       | Abbreviation                      |
| is_available         | int (bool)   | Available on UEX                  |
| is_available_live    | int (bool)   | Available on SC live              |
| is_visible           | int (bool)   | Public on UEX                     |
| is_default           | int (bool)   | Default indicator                 |
| is_monitored         | int (bool)   | Monitored                         |
| is_armistice         | int (bool)   | Armistice zone                    |
| is_landable          | int (bool)   | Landable                          |
| is_decommissioned    | int (bool)   | Decommissioned                    |
| has_quantum_marker   | int (bool)   | QT marker                         |
| has_trade_terminal   | int (bool)   | Trade terminal                    |
| has_habitation       | int (bool)   | Habitation                        |
| has_refinery         | int (bool)   | Refinery                          |
| has_cargo_center     | int (bool)   | Cargo center                      |
| has_clinic           | int (bool)   | Clinic                            |
| has_food             | int (bool)   | Food                              |
| has_shops            | int (bool)   | Shops                             |
| has_refuel           | int (bool)   | Refuel                            |
| has_repair           | int (bool)   | Repair                            |
| has_gravity          | int (bool)   | Gravity                           |
| has_loading_dock     | int (bool)   | Loading dock                      |
| has_docking_port     | int (bool)   | Docking port                      |
| has_freight_elevator | int (bool)   | Freight elevator                  |
| pad_types            | string\|null | Pipe-delimited: `XS\|S\|M\|L\|XL` |
| date_added           | int          | Unix timestamp                    |
| date_modified        | int          | Unix timestamp                    |
| star_system_name     | string\|null | Denormalised                      |
| planet_name          | string\|null | Denormalised                      |
| orbit_name           | string\|null | Denormalised                      |
| moon_name            | string\|null | Denormalised                      |
| space_station_name   | string\|null | Denormalised                      |
| outpost_name         | string\|null | Denormalised                      |
| city_name            | string\|null | Denormalised                      |
| faction_name         | string\|null | Denormalised                      |
| jurisdiction_name    | string\|null | Denormalised                      |

### 1.18 `/space_stations` (pre-fetched, confirmed via API)

| Field                | Type         | Description                       |
| -------------------- | ------------ | --------------------------------- |
| id                   | int          | Unique identifier                 |
| id_star_system       | int          | FK to star_systems                |
| id_planet            | int          | FK to planets                     |
| id_orbit             | int          | FK to orbits                      |
| id_moon              | int          | FK to moons                       |
| id_city              | int          | Adjacent city reference           |
| id_faction           | int          | FK to factions                    |
| id_jurisdiction      | int          | FK to jurisdictions               |
| name                 | string       | Station name                      |
| nickname             | string       | UEX nickname                      |
| is_available         | int (bool)   | Available on UEX                  |
| is_available_live    | int (bool)   | Available on SC live              |
| is_visible           | int (bool)   | Public on UEX                     |
| is_default           | int (bool)   | Default indicator                 |
| is_monitored         | int (bool)   | UEE commlink monitored            |
| is_armistice         | int (bool)   | Armistice zone                    |
| is_landable          | int (bool)   | Landable                          |
| is_decommissioned    | int (bool)   | Decommissioned                    |
| is_lagrange          | int (bool)   | At a Lagrange point               |
| is_jump_point        | int (bool)   | Jump point station                |
| has_quantum_marker   | int (bool)   | QT marker                         |
| has_trade_terminal   | int (bool)   | Trade terminal                    |
| has_habitation       | int (bool)   | Habitation                        |
| has_refinery         | int (bool)   | Refinery                          |
| has_cargo_center     | int (bool)   | Cargo center                      |
| has_clinic           | int (bool)   | Clinic                            |
| has_food             | int (bool)   | Food                              |
| has_shops            | int (bool)   | Shops                             |
| has_refuel           | int (bool)   | Refuel                            |
| has_repair           | int (bool)   | Repair                            |
| has_gravity          | int (bool)   | Gravity                           |
| has_loading_dock     | int (bool)   | Loading dock                      |
| has_docking_port     | int (bool)   | Docking port                      |
| has_freight_elevator | int (bool)   | Freight elevator                  |
| pad_types            | string\|null | Pipe-delimited: `XS\|S\|M\|L\|XL` |
| date_added           | int          | Unix timestamp                    |
| date_modified        | int          | Unix timestamp                    |
| star_system_name     | string\|null | Denormalised                      |
| planet_name          | string\|null | Denormalised                      |
| orbit_name           | string\|null | Denormalised                      |
| city_name            | string\|null | Denormalised                      |
| faction_name         | string\|null | Denormalised                      |
| jurisdiction_name    | string\|null | Denormalised                      |

### 1.19 `/star_systems` (pre-fetched, confirmed via API)

| Field             | Type         | Description          |
| ----------------- | ------------ | -------------------- |
| id                | int          | Unique identifier    |
| id_faction        | int          | FK to factions       |
| id_jurisdiction   | int          | FK to jurisdictions  |
| name              | string       | System name          |
| code              | string       | UEX code             |
| is_available      | int (bool)   | Available on UEX     |
| is_available_live | int (bool)   | Available on SC live |
| is_visible        | int (bool)   | Public on UEX        |
| is_default        | int (bool)   | Default indicator    |
| wiki              | string\|null | Wiki URL             |
| date_added        | int          | Unix timestamp       |
| date_modified     | int          | Unix timestamp       |
| faction_name      | string\|null | Denormalised         |
| jurisdiction_name | string\|null | Denormalised         |

### 1.20 `/terminals` (fetched)

| Field                     | Type         | Description                                                                                         |
| ------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| id                        | int          | Unique identifier                                                                                   |
| id_star_system            | int          | FK to star_systems                                                                                  |
| id_planet                 | int          | FK to planets                                                                                       |
| id_orbit                  | int          | FK to orbits                                                                                        |
| id_moon                   | int          | FK to moons                                                                                         |
| id_space_station          | int          | FK to space_stations                                                                                |
| id_outpost                | int          | FK to outposts                                                                                      |
| id_poi                    | int          | FK to poi                                                                                           |
| id_city                   | int          | FK to cities                                                                                        |
| id_faction                | int          | FK to factions                                                                                      |
| id_company                | int          | FK to companies                                                                                     |
| name                      | string       | Terminal name                                                                                       |
| fullname                  | string       | Full display name                                                                                   |
| nickname                  | string       | Short nickname                                                                                      |
| displayname               | string       | UI display name                                                                                     |
| code                      | string       | Unique terminal code                                                                                |
| type                      | string       | Enum: `commodity`, `item`, `commodity_raw`, `vehicle_buy`, `vehicle_rent`, `fuel`, `refinery_audit` |
| contact_url               | string\|null | Player terminal contact URL                                                                         |
| screenshot                | string       | Screenshot URL                                                                                      |
| screenshot_full           | string       | Full screenshot URL                                                                                 |
| screenshot_author         | string       | Screenshot contributor                                                                              |
| mcs                       | int          | DEPRECATED — replaced by `max_container_size`                                                       |
| max_container_size        | int          | Maximum SCU container size accepted                                                                 |
| is_available              | int (bool)   | Available on UEX platform                                                                           |
| is_available_live         | int (bool)   | Available on SC live server                                                                         |
| is_visible                | int (bool)   | Public on UEX                                                                                       |
| is_default_system         | int (bool)   | Default system indicator                                                                            |
| is_affinity_influenceable | int (bool)   | Reputation affects pricing                                                                          |
| is_habitation             | int (bool)   | Habitation services                                                                                 |
| is_refinery               | int (bool)   | Refinery terminal                                                                                   |
| is_cargo_center           | int (bool)   | Cargo center                                                                                        |
| is_medical                | int (bool)   | Medical services                                                                                    |
| is_food                   | int (bool)   | Food services                                                                                       |
| is_shop_fps               | int (bool)   | FPS item shop                                                                                       |
| is_shop_vehicle           | int (bool)   | Vehicle shop                                                                                        |
| is_refuel                 | int (bool)   | Refueling                                                                                           |
| is_repair                 | int (bool)   | Repair services                                                                                     |
| is_nqa                    | int (bool)   | No questions asked                                                                                  |
| is_jump_point             | int (bool)   | Jump point terminal                                                                                 |
| is_player_owned           | int (bool)   | Player-owned terminal                                                                               |
| is_auto_load              | int (bool)   | Auto-load cargo                                                                                     |
| has_loading_dock          | int (bool)   | Loading dock                                                                                        |
| has_docking_port          | int (bool)   | Docking port                                                                                        |
| has_freight_elevator      | int (bool)   | Freight elevator                                                                                    |
| game_version              | string\|null | Game version when added/updated                                                                     |
| date_added                | int          | Unix timestamp                                                                                      |
| date_modified             | int          | Unix timestamp                                                                                      |
| star_system_name          | string\|null | Denormalised — not stored                                                                           |
| planet_name               | string\|null | Denormalised — not stored                                                                           |
| orbit_name                | string\|null | Denormalised — not stored                                                                           |
| moon_name                 | string\|null | Denormalised — not stored                                                                           |
| space_station_name        | string\|null | Denormalised — not stored                                                                           |
| outpost_name              | string\|null | Denormalised — not stored                                                                           |
| city_name                 | string\|null | Denormalised — not stored                                                                           |
| faction_name              | string\|null | Denormalised — not stored                                                                           |
| company_name              | string\|null | Denormalised — not stored                                                                           |

### 1.21 `/terminals_distances` (fetched — hourly)

| Field                         | Type         | Description                                      |
| ----------------------------- | ------------ | ------------------------------------------------ |
| orbit_name_origin             | string\|null | Origin orbit name (denormalised)                 |
| terminal_name_origin          | string       | Origin terminal name                             |
| terminal_nickname_origin      | string       | Origin terminal nickname                         |
| terminal_code_origin          | string       | Origin terminal code — used as natural key       |
| orbit_name_destination        | string\|null | Destination orbit name (denormalised)            |
| terminal_name_destination     | string       | Destination terminal name                        |
| terminal_nickname_destination | string       | Destination terminal nickname                    |
| terminal_code_destination     | string       | Destination terminal code — used as natural key  |
| distance                      | float        | Distance in Gigameters between the two terminals |

**Note:** No terminal IDs are present in this response. The table is fully denormalised by name/code. ETL resolves `terminal_code_origin` and `terminal_code_destination` to `station_terminal.id` values during load. Update frequency is **hourly**, not daily.

### 1.22 `/vehicles` (pre-fetched, confirmed via API)

| Field                | Type             | Description                                                 |
| -------------------- | ---------------- | ----------------------------------------------------------- |
| id                   | int              | Unique identifier                                           |
| id_company           | int              | FK to companies                                             |
| id_parent            | int              | Parent ship series (variant grouping)                       |
| ids_vehicles_loaners | string (CSV int) | Loaner vehicle IDs                                          |
| name                 | string           | Short name                                                  |
| name_full            | string           | Full name                                                   |
| slug                 | string           | URL slug                                                    |
| uuid                 | string\|null     | Star Citizen UUID                                           |
| scu                  | float            | Cargo capacity in SCU                                       |
| crew                 | string (CSV)     | Crew positions min/max — raw string preserved as `crew_raw` |
| mass                 | float            | Mass                                                        |
| width                | float            | Width (m)                                                   |
| height               | float            | Height (m)                                                  |
| length               | float            | Length (m)                                                  |
| fuel_quantum         | float            | Quantum fuel (SCU)                                          |
| fuel_hydrogen        | float            | Hydrogen fuel (SCU)                                         |
| container_sizes      | string (CSV int) | Supported SCU container sizes                               |
| is_addon             | int (bool)       | Add-on module (not standalone)                              |
| is_boarding          | int (bool)       | Boarding capability                                         |
| is_bomber            | int (bool)       | Bomber                                                      |
| is_cargo             | int (bool)       | Cargo transport                                             |
| is_carrier           | int (bool)       | Carrier                                                     |
| is_civilian          | int (bool)       | Civilian class                                              |
| is_concept           | int (bool)       | Concept/unreleased                                          |
| is_construction      | int (bool)       | Construction                                                |
| is_datarunner        | int (bool)       | Data running                                                |
| is_docking           | int (bool)       | Has docking port                                            |
| is_emp               | int (bool)       | EMP capable                                                 |
| is_exploration       | int (bool)       | Exploration                                                 |
| is_ground_vehicle    | int (bool)       | Ground vehicle                                              |
| is_hangar            | int (bool)       | Has hangar bay                                              |
| is_industrial        | int (bool)       | Industrial                                                  |
| is_interdiction      | int (bool)       | Interdiction capable                                        |
| is_loading_dock      | int (bool)       | Operated in loading docks                                   |
| is_medical           | int (bool)       | Medical                                                     |
| is_military          | int (bool)       | Military class                                              |
| is_mining            | int (bool)       | Mining capable                                              |
| is_passenger         | int (bool)       | Passenger transport                                         |
| is_qed               | int (bool)       | QED system                                                  |
| is_racing            | int (bool)       | Racing class                                                |
| is_refinery          | int (bool)       | Refinery capable                                            |
| is_refuel            | int (bool)       | Refueling capable                                           |
| is_repair            | int (bool)       | Repair capable                                              |
| is_research          | int (bool)       | Research                                                    |
| is_salvage           | int (bool)       | Salvage capable                                             |
| is_scanning          | int (bool)       | Scanning capable                                            |
| is_science           | int (bool)       | Science                                                     |
| is_showdown_winner   | int (bool)       | Showdown contest winner                                     |
| is_spaceship         | int (bool)       | Space-capable ship                                          |
| is_starter           | int (bool)       | Starter vehicle                                             |
| is_stealth           | int (bool)       | Stealth capable                                             |
| is_tractor_beam      | int (bool)       | Tractor beam                                                |
| is_quantum_capable   | int (bool)       | Quantum drive capable                                       |
| url_photo            | string\|null     | Photo URL                                                   |
| url_store            | string\|null     | Store page URL                                              |
| url_brochure         | string\|null     | Brochure URL                                                |
| url_hotsite          | string\|null     | Hot site URL                                                |
| url_video            | string\|null     | Video URL                                                   |
| url_photos           | array            | Deprecated — RSI sourced, not updated                       |
| pad_type             | string\|null     | Required landing pad size: `XS\|S\|M\|L\|XL`                |
| game_version         | string           | Version announced/updated                                   |
| date_added           | int              | Unix timestamp                                              |
| date_modified        | int              | Unix timestamp                                              |
| company_name         | string\|null     | Denormalised                                                |

---

## 2. Key Design Decisions

- **Section field materialised as parent category row.** The UEX `categories` endpoint includes a `section` string that groups categories (e.g. section "Combat" contains categories "Personal Weapons", "Armor"). Rather than a flat list, `station_category` uses a self-referencing `parent_id` where section values are materialised as synthetic parent rows (`is_section = TRUE`). This allows filtering "Combat > Armor" with a single FK walk and a standard tree query. No hierarchy beyond two levels is implied by the data.

- **CSV faction relations expanded to junction tables.** `factions.ids_star_systems`, `ids_factions_friendly`, and `ids_factions_hostile` are CSV integers in the UEX API. These are split into three separate junction tables: `station_faction_star_system`, `station_faction_friendly`, and `station_faction_hostile`. This enables proper FK constraints, indexed lookups ("all systems controlled by faction X"), and bidirectional relationship queries.

- **`jurisdictions.id_faction` treated as single FK; ETL hard-errors on CSV.** The docs describe it as `int (csv)`. In practice it is a single FK — all known jurisdictions map to one faction. The Station schema stores it as `faction_uex_id INTEGER`. If `id_faction` contains a comma the ETL throws an exception and halts — it does not silently skip or use only the first value. This forces immediate schema review if UEX ever changes this field. See §6.3 in the Decisions Log.

- **`items_attributes` modelled as EAV table with JSONB summary on `station_item`.** The UEX `items_attributes` endpoint is a full EAV structure. Station stores individual rows in `station_item_attribute` for attribute-based filtering (leveraging `is_lower_better` and unit-aware range queries). A companion `attributes_summary JSONB` column on `station_item` holds a denormalized snapshot (`{"Shield HP": "2500 HP", "Power Draw": "12 pwr"}`) for fast UI display. ETL populates both. See §6.5.

- **Orbits as the universal spatial layer.** Every named position in the game (planet, moon, space station, jump point entry, Lagrange point) has a corresponding orbit record. All location tables carry `orbit_uex_id` as their canonical positional identity, enabling distance lookups via `station_orbit_distance` without joining across multiple location type tables.

- **Location types as separate tables, not a polymorphic table.** Space stations, cities, outposts, and POIs differ structurally. A single polymorphic table with 50+ nullable columns would be unmaintainable.

- **Facility flags as boolean columns, not a junction table.** There are 14 `has_*` boolean flags that appear identically across space stations, cities, outposts, and POIs. These are stored as boolean columns on each table. Extracting them to a junction table would add join complexity without query benefit — the count is fixed and low.

- **`pad_types` stored as `TEXT[]` array with GIN index.** The pipe-delimited `pad_types` string (e.g. `XS|S|M`) is converted to a PostgreSQL array on all location tables (space_stations, cities, outposts, pois) and on `station_terminal`. GIN-indexed containment queries: `WHERE 'XL' = ANY(pad_types)`.

- **`vehicle.crew` CSV expanded to two integer columns plus raw string.** `crew_min` and `crew_max` are more useful for filtering. `crew_raw VARCHAR(40)` is also stored as-loaded before parsing, providing an audit fallback if the parsing logic is incorrect. See §6.7.

- **`vehicle.container_sizes` CSV stored as `INTEGER[]`.** Supports GIN-indexed containment queries: `WHERE 32 = ANY(container_sizes)`.

- **`vehicle.ids_vehicles_loaners` CSV expanded to junction table.** `station_vehicle_loaner` enables proper FK constraints and bidirectional queries ("which vehicles can loan this ship").

- **UEX IDs stored as `uex_id INTEGER`, not as the Station PK.** All normalized tables carry the source UEX integer ID as `uex_id` with a UNIQUE constraint for upsert correlation. The Station PK is always a `BIGSERIAL`. This decouples Station's internal identity from UEX's, which the docs note "may change during website updates" for items.

- **`items.uuid` indexed as a supplemental stable key.** UEX warns that item `id` may change. The Star Citizen `uuid` is stable across patches. Station indexes `uuid` on `station_item` and uses it to detect changed `uex_id` values for the same item.

- **`orbits_distances` kept as a separate table.** Distances change per patch (Datarunner reported). Keeping them separate from orbit definitions avoids dirtying stable reference data with frequently-updated measurements.

- **Denormalised `*_name` columns from UEX are not stored.** Station's schema has proper FK references; name lookups use JOINs or application-level caching.

- **Unix timestamps converted to `TIMESTAMPTZ`.** All `date_added` / `date_modified` integer fields are converted via `TO_TIMESTAMP(value)::TIMESTAMPTZ` during ETL.

- **Integer booleans converted to `BOOLEAN`.** All `is_*` / `has_*` fields are cast `1 → TRUE`, `0 → FALSE`.

- **`game_version` stored as `VARCHAR(20)`.** Version strings like `"3.24"` or `"4.0"` are plain text; no semantic version parsing is needed for catalog data.

- **Deprecated fields not stored.** `items.attributes` (JSON, deprecated), `vehicles.url_photos` (array, deprecated), and `terminals.mcs` (replaced by `max_container_size`) are dropped during ETL.

- **`station_terminal` stores all FKs as resolved BIGINT references.** The UEX terminals endpoint returns `id_*` integer IDs for star system, planet, orbit, moon, space station, outpost, poi, city, faction, and company. Each is resolved to the corresponding Station `id` (BIGINT) via uex_id lookup during ETL. Denormalized name fields from the API are not stored.

- **`station_terminal_distance` keyed by resolved terminal IDs.** The `/terminals_distances` response has no terminal IDs — only codes and names. ETL resolves `terminal_code_origin` and `terminal_code_destination` to `station_terminal.id` values. Updated hourly since this data changes independently of patch cycles.

- **`station_jump_point` synthetic mirror rows for directionality.** UEX may store only one direction per jump point connection. After loading all real rows, the ETL inserts synthetic mirror rows (`is_synthetic = TRUE`) for any connection where the reverse direction does not exist. Synthetic rows use `uex_id = -1 * original_uex_id` to satisfy the unique constraint and store the original row's `uex_id` in `source_uex_id`. See §6.6.

- **`station_etl_warning` table for queryable mismatch tracking.** Planet/moon orbit name mismatches, and other ETL anomalies that do not halt the run, are written as rows to `station_etl_warning` so they are queryable via SQL rather than requiring log file access.

- **`is_available_live` is the canonical UI filter.** All Station UI queries filter on `is_available_live = TRUE`. `is_available` is stored for UEX-platform completeness but is not the primary visibility filter. Both columns carry JSDoc comments on all TypeORM entity definitions.

---

## 3. Entity Relationship Overview

```
station_jurisdiction
    |
    | faction_uex_id
    v
station_faction <-------- station_faction_friendly (faction_uex_id, friendly_faction_uex_id)
    |                  \-- station_faction_hostile  (faction_uex_id, hostile_faction_uex_id)
    |                  \-- station_faction_star_system (faction_uex_id, star_system_uex_id)
    |
    | (faction_uex_id on all location & catalog tables)
    v
station_star_system
    |
    |-- station_orbit (star_system_uex_id)
    |       |
    |       +-- station_orbit_distance (orbit_origin_uex_id, orbit_dest_uex_id)
    |
    |-- station_planet (star_system_uex_id, orbit_uex_id)
    |       |
    |       |-- station_moon (planet_uex_id, orbit_uex_id)
    |
    |-- station_city (star_system_uex_id, planet_uex_id, orbit_uex_id, moon_uex_id)
    |
    |-- station_space_station
    |       (star_system_uex_id, planet_uex_id, orbit_uex_id, moon_uex_id, city_uex_id)
    |
    |-- station_outpost
    |       (star_system_uex_id, planet_uex_id, orbit_uex_id, moon_uex_id)
    |
    |-- station_poi
    |       (star_system_uex_id, planet_uex_id, orbit_uex_id, moon_uex_id,
    |        space_station_uex_id, city_uex_id, outpost_uex_id)
    |
    |-- station_terminal
    |       (star_system_id, planet_id, orbit_id, moon_id,
    |        space_station_id, outpost_id, poi_id, city_id,
    |        faction_id, company_id)  [all BIGINT refs to Station PKs]
    |       |
    |       +-- station_terminal_distance
    |               (terminal_origin_id, terminal_destination_id)
    |
    \-- station_jump_point
            (star_system_origin_uex_id, star_system_dest_uex_id,
             orbit_origin_uex_id, orbit_dest_uex_id,
             is_synthetic, source_uex_id)

----------------------------------------------------------------------

station_category (self-ref: parent_id for section -> category hierarchy)
    |
    \-- station_category_attribute (category_uex_id)

station_company (faction_uex_id)
    |
    |-- station_vehicle (company_uex_id, parent_uex_id self-ref)
    |       |
    |       \-- station_vehicle_loaner (vehicle_uex_id, loaner_uex_id)
    |
    \-- station_item
            (category_uex_id, company_uex_id, vehicle_uex_id, parent_uex_id self-ref)
            attributes_summary JSONB (denormalized snapshot for UI display)
            |
            \-- station_item_attribute
                    (item_uex_id, category_uex_id, category_attribute_uex_id)

station_commodity (parent_uex_id self-ref for raw -> refined hierarchy)

----------------------------------------------------------------------

station_etl_warning  (written during ETL runs — not a sync target)
```

---

## 4. Complete Schema DDL

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- required for gin_trgm_ops indexes on terminal name

-- ============================================================
-- station_faction
-- Source: GET /factions
-- Load first — no dependencies.
-- ============================================================
CREATE TABLE station_faction (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    name                VARCHAR(120)        NOT NULL,
    wiki                VARCHAR(500),
    is_piracy           BOOLEAN             NOT NULL DEFAULT FALSE,
    is_bounty_hunting   BOOLEAN             NOT NULL DEFAULT FALSE,
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_factions_uex_id       ON station_faction (uex_id);
CREATE INDEX idx_factions_is_piracy    ON station_faction (is_piracy) WHERE is_piracy = TRUE;
CREATE INDEX idx_factions_is_bounty    ON station_faction (is_bounty_hunting) WHERE is_bounty_hunting = TRUE;

-- ============================================================
-- station_faction_friendly
-- Junction: faction <-> allied faction.
-- Derived from factions.ids_factions_friendly CSV.
-- ============================================================
CREATE TABLE station_faction_friendly (
    faction_uex_id          INTEGER         NOT NULL REFERENCES station_faction (uex_id) ON DELETE CASCADE,
    friendly_faction_uex_id INTEGER         NOT NULL REFERENCES station_faction (uex_id) ON DELETE CASCADE,
    PRIMARY KEY (faction_uex_id, friendly_faction_uex_id)
);

CREATE INDEX idx_ff_faction   ON station_faction_friendly (faction_uex_id);
CREATE INDEX idx_ff_friendly  ON station_faction_friendly (friendly_faction_uex_id);

-- ============================================================
-- station_faction_hostile
-- Junction: faction <-> hostile faction.
-- Derived from factions.ids_factions_hostile CSV.
-- ============================================================
CREATE TABLE station_faction_hostile (
    faction_uex_id          INTEGER         NOT NULL REFERENCES station_faction (uex_id) ON DELETE CASCADE,
    hostile_faction_uex_id  INTEGER         NOT NULL REFERENCES station_faction (uex_id) ON DELETE CASCADE,
    PRIMARY KEY (faction_uex_id, hostile_faction_uex_id)
);

CREATE INDEX idx_fh_faction   ON station_faction_hostile (faction_uex_id);
CREATE INDEX idx_fh_hostile   ON station_faction_hostile (hostile_faction_uex_id);

-- ============================================================
-- station_jurisdiction
-- Source: GET /jurisdictions
-- ETL CONSTRAINT: if id_faction contains a comma, ETL throws an
-- exception and halts — does NOT silently skip or use first value.
-- ============================================================
CREATE TABLE station_jurisdiction (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    faction_uex_id      INTEGER             REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    name                VARCHAR(120)        NOT NULL,
    nickname            VARCHAR(40),
    -- is_available: UEX platform flag — stored for completeness, NOT the UI filter.
    -- is_available_live: SC live flag — USE THIS for all UI visibility queries.
    is_available        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_available_live   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_visible          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_default          BOOLEAN             NOT NULL DEFAULT FALSE,
    wiki                VARCHAR(500),
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jurisdictions_uex_id       ON station_jurisdiction (uex_id);
CREATE INDEX idx_jurisdictions_faction      ON station_jurisdiction (faction_uex_id);
CREATE INDEX idx_jurisdictions_is_available ON station_jurisdiction (is_available) WHERE is_available = TRUE;

-- ============================================================
-- station_star_system
-- Source: GET /star_systems
-- ============================================================
CREATE TABLE station_star_system (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    faction_uex_id      INTEGER             REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id INTEGER             REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                VARCHAR(120)        NOT NULL,
    code                VARCHAR(20),
    is_available        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_available_live   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_visible          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_default          BOOLEAN             NOT NULL DEFAULT FALSE,
    wiki                VARCHAR(500),
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_star_systems_uex_id        ON station_star_system (uex_id);
CREATE INDEX idx_star_systems_faction       ON station_star_system (faction_uex_id);
CREATE INDEX idx_star_systems_jurisdiction  ON station_star_system (jurisdiction_uex_id);
CREATE INDEX idx_star_systems_code          ON station_star_system (code);
CREATE INDEX idx_star_systems_is_available  ON station_star_system (is_available) WHERE is_available = TRUE;

-- ============================================================
-- station_faction_star_system
-- Junction: faction <-> star_system.
-- Derived from factions.ids_star_systems CSV.
-- ============================================================
CREATE TABLE station_faction_star_system (
    faction_uex_id      INTEGER             NOT NULL REFERENCES station_faction (uex_id) ON DELETE CASCADE,
    star_system_uex_id  INTEGER             NOT NULL REFERENCES station_star_system (uex_id) ON DELETE CASCADE,
    PRIMARY KEY (faction_uex_id, star_system_uex_id)
);

CREATE INDEX idx_fss_faction      ON station_faction_star_system (faction_uex_id);
CREATE INDEX idx_fss_star_system  ON station_faction_star_system (star_system_uex_id);

-- ============================================================
-- station_orbit
-- Source: GET /orbits
-- UEX's universal spatial layer — every named celestial or man-made
-- position has an orbit record. Classification flags identify type.
-- ============================================================
CREATE TABLE station_orbit (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    star_system_uex_id  INTEGER             REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    faction_uex_id      INTEGER             REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id INTEGER             REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                VARCHAR(120)        NOT NULL,
    name_origin         VARCHAR(120),
    code                VARCHAR(10),
    is_available        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_available_live   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_visible          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_default          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_lagrange         BOOLEAN             NOT NULL DEFAULT FALSE,
    is_man_made         BOOLEAN             NOT NULL DEFAULT FALSE,
    is_asteroid         BOOLEAN             NOT NULL DEFAULT FALSE,
    is_planet           BOOLEAN             NOT NULL DEFAULT FALSE,
    is_star             BOOLEAN             NOT NULL DEFAULT FALSE,
    is_jump_point       BOOLEAN             NOT NULL DEFAULT FALSE,
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orbits_uex_id        ON station_orbit (uex_id);
CREATE INDEX idx_orbits_star_system   ON station_orbit (star_system_uex_id);
CREATE INDEX idx_orbits_faction       ON station_orbit (faction_uex_id);
CREATE INDEX idx_orbits_jurisdiction  ON station_orbit (jurisdiction_uex_id);
CREATE INDEX idx_orbits_is_lagrange   ON station_orbit (is_lagrange) WHERE is_lagrange = TRUE;
CREATE INDEX idx_orbits_is_jump_point ON station_orbit (is_jump_point) WHERE is_jump_point = TRUE;
CREATE INDEX idx_orbits_is_planet     ON station_orbit (is_planet) WHERE is_planet = TRUE;

-- ============================================================
-- station_orbit_distance
-- Source: GET /orbits_distances
-- Datarunner-reported distances; changes every patch cycle.
-- ============================================================
CREATE TABLE station_orbit_distance (
    id                        BIGSERIAL       PRIMARY KEY,
    uex_id                    INTEGER         NOT NULL UNIQUE,
    star_system_origin_uex_id INTEGER         REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    star_system_dest_uex_id   INTEGER         REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    orbit_origin_uex_id       INTEGER         NOT NULL REFERENCES station_orbit (uex_id) ON DELETE CASCADE,
    orbit_dest_uex_id         INTEGER         NOT NULL REFERENCES station_orbit (uex_id) ON DELETE CASCADE,
    distance_gm               DECIMAL(12, 4)  NOT NULL,
    game_version              VARCHAR(20),
    uex_date_added            TIMESTAMPTZ,
    uex_date_modified         TIMESTAMPTZ,
    synced_at                 TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_orbit_distance_pair UNIQUE (orbit_origin_uex_id, orbit_dest_uex_id)
);

CREATE INDEX idx_orbit_dist_origin     ON station_orbit_distance (orbit_origin_uex_id);
CREATE INDEX idx_orbit_dist_dest       ON station_orbit_distance (orbit_dest_uex_id);
CREATE INDEX idx_orbit_dist_sys_origin ON station_orbit_distance (star_system_origin_uex_id);

-- ============================================================
-- station_planet
-- Source: GET /planets
-- orbit_uex_id resolved via name-match ETL (see ETL Step 8).
-- Unresolved matches logged to station_etl_warning.
-- ============================================================
CREATE TABLE station_planet (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    star_system_uex_id  INTEGER             NOT NULL REFERENCES station_star_system (uex_id) ON DELETE CASCADE,
    orbit_uex_id        INTEGER             REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    faction_uex_id      INTEGER             REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id INTEGER             REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                VARCHAR(120)        NOT NULL,
    name_origin         VARCHAR(120),
    code                VARCHAR(20),
    is_available        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_available_live   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_visible          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_default          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_lagrange         BOOLEAN             NOT NULL DEFAULT FALSE,
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_planets_uex_id        ON station_planet (uex_id);
CREATE INDEX idx_planets_star_system   ON station_planet (star_system_uex_id);
CREATE INDEX idx_planets_orbit         ON station_planet (orbit_uex_id);
CREATE INDEX idx_planets_faction       ON station_planet (faction_uex_id);
CREATE INDEX idx_planets_jurisdiction  ON station_planet (jurisdiction_uex_id);
CREATE INDEX idx_planets_is_available  ON station_planet (is_available) WHERE is_available = TRUE;

-- ============================================================
-- station_moon
-- Source: GET /moons
-- orbit_uex_id resolved via name-match ETL (see ETL Step 9).
-- Unresolved matches logged to station_etl_warning.
-- ============================================================
CREATE TABLE station_moon (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    star_system_uex_id  INTEGER             NOT NULL REFERENCES station_star_system (uex_id) ON DELETE CASCADE,
    planet_uex_id       INTEGER             NOT NULL REFERENCES station_planet (uex_id) ON DELETE CASCADE,
    orbit_uex_id        INTEGER             REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    faction_uex_id      INTEGER             REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id INTEGER             REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                VARCHAR(120)        NOT NULL,
    name_origin         VARCHAR(120),
    code                VARCHAR(20),
    is_available        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_available_live   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_visible          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_default          BOOLEAN             NOT NULL DEFAULT FALSE,
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moons_uex_id        ON station_moon (uex_id);
CREATE INDEX idx_moons_star_system   ON station_moon (star_system_uex_id);
CREATE INDEX idx_moons_planet        ON station_moon (planet_uex_id);
CREATE INDEX idx_moons_orbit         ON station_moon (orbit_uex_id);
CREATE INDEX idx_moons_faction       ON station_moon (faction_uex_id);
CREATE INDEX idx_moons_jurisdiction  ON station_moon (jurisdiction_uex_id);

-- ============================================================
-- station_city
-- Source: GET /cities
-- pad_types: pipe-delimited string split to TEXT[].
-- Query pattern: WHERE 'XL' = ANY(pad_types)
-- ============================================================
CREATE TABLE station_city (
    id                   BIGSERIAL          PRIMARY KEY,
    uex_id               INTEGER            NOT NULL UNIQUE,
    star_system_uex_id   INTEGER            REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    planet_uex_id        INTEGER            REFERENCES station_planet (uex_id) ON DELETE SET NULL,
    orbit_uex_id         INTEGER            REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    moon_uex_id          INTEGER            REFERENCES station_moon (uex_id) ON DELETE SET NULL,
    faction_uex_id       INTEGER            REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id  INTEGER            REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                 VARCHAR(120)       NOT NULL,
    code                 VARCHAR(20),
    is_available         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_available_live    BOOLEAN            NOT NULL DEFAULT FALSE,
    is_visible           BOOLEAN            NOT NULL DEFAULT FALSE,
    is_default           BOOLEAN            NOT NULL DEFAULT FALSE,
    is_monitored         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_armistice         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_landable          BOOLEAN            NOT NULL DEFAULT FALSE,
    is_decommissioned    BOOLEAN            NOT NULL DEFAULT FALSE,
    has_quantum_marker   BOOLEAN            NOT NULL DEFAULT FALSE,
    has_trade_terminal   BOOLEAN            NOT NULL DEFAULT FALSE,
    has_habitation       BOOLEAN            NOT NULL DEFAULT FALSE,
    has_refinery         BOOLEAN            NOT NULL DEFAULT FALSE,
    has_cargo_center     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_clinic           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_food             BOOLEAN            NOT NULL DEFAULT FALSE,
    has_shops            BOOLEAN            NOT NULL DEFAULT FALSE,
    has_refuel           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_repair           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_gravity          BOOLEAN            NOT NULL DEFAULT FALSE,
    has_loading_dock     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_docking_port     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_freight_elevator BOOLEAN            NOT NULL DEFAULT FALSE,
    pad_types            TEXT[],
    wiki                 VARCHAR(500),
    uex_date_added       TIMESTAMPTZ,
    uex_date_modified    TIMESTAMPTZ,
    synced_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_uex_id         ON station_city (uex_id);
CREATE INDEX idx_cities_star_system    ON station_city (star_system_uex_id);
CREATE INDEX idx_cities_planet         ON station_city (planet_uex_id);
CREATE INDEX idx_cities_orbit          ON station_city (orbit_uex_id);
CREATE INDEX idx_cities_moon           ON station_city (moon_uex_id);
CREATE INDEX idx_cities_faction        ON station_city (faction_uex_id);
CREATE INDEX idx_cities_jurisdiction   ON station_city (jurisdiction_uex_id);
CREATE INDEX idx_cities_is_available   ON station_city (is_available) WHERE is_available = TRUE;
CREATE INDEX idx_cities_is_landable    ON station_city (is_landable) WHERE is_landable = TRUE;
CREATE INDEX idx_cities_has_trade      ON station_city (has_trade_terminal) WHERE has_trade_terminal = TRUE;
CREATE INDEX idx_cities_pad_types      ON station_city USING GIN (pad_types);

-- ============================================================
-- station_space_station
-- Source: GET /space_stations
-- pad_types: TEXT[] — query with WHERE 'XL' = ANY(pad_types)
-- ============================================================
CREATE TABLE station_space_station (
    id                   BIGSERIAL          PRIMARY KEY,
    uex_id               INTEGER            NOT NULL UNIQUE,
    star_system_uex_id   INTEGER            REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    planet_uex_id        INTEGER            REFERENCES station_planet (uex_id) ON DELETE SET NULL,
    orbit_uex_id         INTEGER            REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    moon_uex_id          INTEGER            REFERENCES station_moon (uex_id) ON DELETE SET NULL,
    city_uex_id          INTEGER            REFERENCES station_city (uex_id) ON DELETE SET NULL,
    faction_uex_id       INTEGER            REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id  INTEGER            REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                 VARCHAR(120)       NOT NULL,
    nickname             VARCHAR(80),
    is_available         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_available_live    BOOLEAN            NOT NULL DEFAULT FALSE,
    is_visible           BOOLEAN            NOT NULL DEFAULT FALSE,
    is_default           BOOLEAN            NOT NULL DEFAULT FALSE,
    is_monitored         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_armistice         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_landable          BOOLEAN            NOT NULL DEFAULT FALSE,
    is_decommissioned    BOOLEAN            NOT NULL DEFAULT FALSE,
    is_lagrange          BOOLEAN            NOT NULL DEFAULT FALSE,
    is_jump_point        BOOLEAN            NOT NULL DEFAULT FALSE,
    has_quantum_marker   BOOLEAN            NOT NULL DEFAULT FALSE,
    has_trade_terminal   BOOLEAN            NOT NULL DEFAULT FALSE,
    has_habitation       BOOLEAN            NOT NULL DEFAULT FALSE,
    has_refinery         BOOLEAN            NOT NULL DEFAULT FALSE,
    has_cargo_center     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_clinic           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_food             BOOLEAN            NOT NULL DEFAULT FALSE,
    has_shops            BOOLEAN            NOT NULL DEFAULT FALSE,
    has_refuel           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_repair           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_gravity          BOOLEAN            NOT NULL DEFAULT FALSE,
    has_loading_dock     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_docking_port     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_freight_elevator BOOLEAN            NOT NULL DEFAULT FALSE,
    pad_types            TEXT[],
    uex_date_added       TIMESTAMPTZ,
    uex_date_modified    TIMESTAMPTZ,
    synced_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_space_stations_uex_id       ON station_space_station (uex_id);
CREATE INDEX idx_space_stations_star_system  ON station_space_station (star_system_uex_id);
CREATE INDEX idx_space_stations_planet       ON station_space_station (planet_uex_id);
CREATE INDEX idx_space_stations_orbit        ON station_space_station (orbit_uex_id);
CREATE INDEX idx_space_stations_moon         ON station_space_station (moon_uex_id);
CREATE INDEX idx_space_stations_city         ON station_space_station (city_uex_id);
CREATE INDEX idx_space_stations_faction      ON station_space_station (faction_uex_id);
CREATE INDEX idx_space_stations_jurisdiction ON station_space_station (jurisdiction_uex_id);
CREATE INDEX idx_space_stations_is_available ON station_space_station (is_available) WHERE is_available = TRUE;
CREATE INDEX idx_space_stations_is_landable  ON station_space_station (is_landable) WHERE is_landable = TRUE;
CREATE INDEX idx_space_stations_is_lagrange  ON station_space_station (is_lagrange) WHERE is_lagrange = TRUE;
CREATE INDEX idx_space_stations_has_trade    ON station_space_station (has_trade_terminal) WHERE has_trade_terminal = TRUE;
CREATE INDEX idx_space_stations_pad_types    ON station_space_station USING GIN (pad_types);

-- ============================================================
-- station_outpost
-- Source: GET /outposts
-- pad_types: TEXT[] — query with WHERE 'XL' = ANY(pad_types)
-- ============================================================
CREATE TABLE station_outpost (
    id                   BIGSERIAL          PRIMARY KEY,
    uex_id               INTEGER            NOT NULL UNIQUE,
    star_system_uex_id   INTEGER            REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    planet_uex_id        INTEGER            REFERENCES station_planet (uex_id) ON DELETE SET NULL,
    orbit_uex_id         INTEGER            REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    moon_uex_id          INTEGER            REFERENCES station_moon (uex_id) ON DELETE SET NULL,
    faction_uex_id       INTEGER            REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id  INTEGER            REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                 VARCHAR(120)       NOT NULL,
    nickname             VARCHAR(80),
    is_available         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_available_live    BOOLEAN            NOT NULL DEFAULT FALSE,
    is_visible           BOOLEAN            NOT NULL DEFAULT FALSE,
    is_default           BOOLEAN            NOT NULL DEFAULT FALSE,
    is_monitored         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_armistice         BOOLEAN            NOT NULL DEFAULT FALSE,
    is_landable          BOOLEAN            NOT NULL DEFAULT FALSE,
    is_decommissioned    BOOLEAN            NOT NULL DEFAULT FALSE,
    has_quantum_marker   BOOLEAN            NOT NULL DEFAULT FALSE,
    has_trade_terminal   BOOLEAN            NOT NULL DEFAULT FALSE,
    has_habitation       BOOLEAN            NOT NULL DEFAULT FALSE,
    has_refinery         BOOLEAN            NOT NULL DEFAULT FALSE,
    has_cargo_center     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_clinic           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_food             BOOLEAN            NOT NULL DEFAULT FALSE,
    has_shops            BOOLEAN            NOT NULL DEFAULT FALSE,
    has_refuel           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_repair           BOOLEAN            NOT NULL DEFAULT FALSE,
    has_gravity          BOOLEAN            NOT NULL DEFAULT FALSE,
    has_loading_dock     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_docking_port     BOOLEAN            NOT NULL DEFAULT FALSE,
    has_freight_elevator BOOLEAN            NOT NULL DEFAULT FALSE,
    pad_types            TEXT[],
    uex_date_added       TIMESTAMPTZ,
    uex_date_modified    TIMESTAMPTZ,
    synced_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outposts_uex_id        ON station_outpost (uex_id);
CREATE INDEX idx_outposts_star_system   ON station_outpost (star_system_uex_id);
CREATE INDEX idx_outposts_planet        ON station_outpost (planet_uex_id);
CREATE INDEX idx_outposts_orbit         ON station_outpost (orbit_uex_id);
CREATE INDEX idx_outposts_moon          ON station_outpost (moon_uex_id);
CREATE INDEX idx_outposts_faction       ON station_outpost (faction_uex_id);
CREATE INDEX idx_outposts_jurisdiction  ON station_outpost (jurisdiction_uex_id);
CREATE INDEX idx_outposts_is_available  ON station_outpost (is_available) WHERE is_available = TRUE;
CREATE INDEX idx_outposts_is_landable   ON station_outpost (is_landable) WHERE is_landable = TRUE;
CREATE INDEX idx_outposts_has_trade     ON station_outpost (has_trade_terminal) WHERE has_trade_terminal = TRUE;
CREATE INDEX idx_outposts_pad_types     ON station_outpost USING GIN (pad_types);

-- ============================================================
-- station_poi (Points of Interest)
-- Source: GET /poi
-- Most deeply nested location type — can attach to any parent.
-- pad_types: TEXT[] — query with WHERE 'XL' = ANY(pad_types)
-- ============================================================
CREATE TABLE station_poi (
    id                      BIGSERIAL       PRIMARY KEY,
    uex_id                  INTEGER         NOT NULL UNIQUE,
    star_system_uex_id      INTEGER         REFERENCES station_star_system (uex_id) ON DELETE SET NULL,
    planet_uex_id           INTEGER         REFERENCES station_planet (uex_id) ON DELETE SET NULL,
    orbit_uex_id            INTEGER         REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    moon_uex_id             INTEGER         REFERENCES station_moon (uex_id) ON DELETE SET NULL,
    space_station_uex_id    INTEGER         REFERENCES station_space_station (uex_id) ON DELETE SET NULL,
    city_uex_id             INTEGER         REFERENCES station_city (uex_id) ON DELETE SET NULL,
    outpost_uex_id          INTEGER         REFERENCES station_outpost (uex_id) ON DELETE SET NULL,
    faction_uex_id          INTEGER         REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    jurisdiction_uex_id     INTEGER         REFERENCES station_jurisdiction (uex_id) ON DELETE SET NULL,
    name                    VARCHAR(120)    NOT NULL,
    nickname                VARCHAR(80),
    is_available            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_available_live       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_visible              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_default              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_monitored            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_armistice            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_landable             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_decommissioned       BOOLEAN         NOT NULL DEFAULT FALSE,
    has_quantum_marker      BOOLEAN         NOT NULL DEFAULT FALSE,
    has_trade_terminal      BOOLEAN         NOT NULL DEFAULT FALSE,
    has_habitation          BOOLEAN         NOT NULL DEFAULT FALSE,
    has_refinery            BOOLEAN         NOT NULL DEFAULT FALSE,
    has_cargo_center        BOOLEAN         NOT NULL DEFAULT FALSE,
    has_clinic              BOOLEAN         NOT NULL DEFAULT FALSE,
    has_food                BOOLEAN         NOT NULL DEFAULT FALSE,
    has_shops               BOOLEAN         NOT NULL DEFAULT FALSE,
    has_refuel              BOOLEAN         NOT NULL DEFAULT FALSE,
    has_repair              BOOLEAN         NOT NULL DEFAULT FALSE,
    has_gravity             BOOLEAN         NOT NULL DEFAULT FALSE,
    has_loading_dock        BOOLEAN         NOT NULL DEFAULT FALSE,
    has_docking_port        BOOLEAN         NOT NULL DEFAULT FALSE,
    has_freight_elevator    BOOLEAN         NOT NULL DEFAULT FALSE,
    pad_types               TEXT[],
    uex_date_added          TIMESTAMPTZ,
    uex_date_modified       TIMESTAMPTZ,
    synced_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pois_uex_id          ON station_poi (uex_id);
CREATE INDEX idx_pois_star_system     ON station_poi (star_system_uex_id);
CREATE INDEX idx_pois_planet          ON station_poi (planet_uex_id);
CREATE INDEX idx_pois_orbit           ON station_poi (orbit_uex_id);
CREATE INDEX idx_pois_moon            ON station_poi (moon_uex_id);
CREATE INDEX idx_pois_space_station   ON station_poi (space_station_uex_id);
CREATE INDEX idx_pois_city            ON station_poi (city_uex_id);
CREATE INDEX idx_pois_outpost         ON station_poi (outpost_uex_id);
CREATE INDEX idx_pois_faction         ON station_poi (faction_uex_id);
CREATE INDEX idx_pois_jurisdiction    ON station_poi (jurisdiction_uex_id);
CREATE INDEX idx_pois_is_landable     ON station_poi (is_landable) WHERE is_landable = TRUE;
CREATE INDEX idx_pois_has_trade       ON station_poi (has_trade_terminal) WHERE has_trade_terminal = TRUE;
CREATE INDEX idx_pois_pad_types       ON station_poi USING GIN (pad_types);

-- ============================================================
-- station_terminal
-- Source: GET /terminals  (Tier 7 — after all location tables)
-- All id_* fields resolved from UEX integers to Station BIGINT PKs.
-- Denormalized *_name fields from the API are NOT stored.
-- is_available: UEX platform flag — stored for completeness only.
-- is_available_live: SC live flag — USE THIS for all UI queries.
-- mcs is deprecated upstream; max_container_size supersedes it.
-- ============================================================
CREATE TABLE station_terminal (
    id                      BIGSERIAL PRIMARY KEY,
    uex_id                  INTEGER NOT NULL,
    star_system_id          BIGINT REFERENCES station_star_system(id) ON DELETE SET NULL,
    planet_id               BIGINT REFERENCES station_planet(id) ON DELETE SET NULL,
    orbit_id                BIGINT REFERENCES station_orbit(id) ON DELETE SET NULL,
    moon_id                 BIGINT REFERENCES station_moon(id) ON DELETE SET NULL,
    space_station_id        BIGINT REFERENCES station_space_station(id) ON DELETE SET NULL,
    outpost_id              BIGINT REFERENCES station_outpost(id) ON DELETE SET NULL,
    poi_id                  BIGINT REFERENCES station_poi(id) ON DELETE SET NULL,
    city_id                 BIGINT REFERENCES station_city(id) ON DELETE SET NULL,
    faction_id              BIGINT REFERENCES station_faction(id) ON DELETE SET NULL,
    company_id              BIGINT REFERENCES station_company(id) ON DELETE SET NULL,
    name                    VARCHAR(255) NOT NULL,
    fullname                VARCHAR(500),
    nickname                VARCHAR(100),
    displayname             VARCHAR(255),
    code                    VARCHAR(50) NOT NULL,
    type                    VARCHAR(30) NOT NULL,
    contact_url             VARCHAR(500),
    screenshot              VARCHAR(500),
    max_container_size      INTEGER,
    -- availability
    is_available            BOOLEAN NOT NULL DEFAULT TRUE,
    is_available_live       BOOLEAN NOT NULL DEFAULT TRUE,
    is_visible              BOOLEAN NOT NULL DEFAULT TRUE,
    is_default_system       BOOLEAN NOT NULL DEFAULT FALSE,
    -- services
    is_affinity_influenceable BOOLEAN NOT NULL DEFAULT FALSE,
    is_habitation           BOOLEAN NOT NULL DEFAULT FALSE,
    is_refinery             BOOLEAN NOT NULL DEFAULT FALSE,
    is_cargo_center         BOOLEAN NOT NULL DEFAULT FALSE,
    is_medical              BOOLEAN NOT NULL DEFAULT FALSE,
    is_food                 BOOLEAN NOT NULL DEFAULT FALSE,
    is_shop_fps             BOOLEAN NOT NULL DEFAULT FALSE,
    is_shop_vehicle         BOOLEAN NOT NULL DEFAULT FALSE,
    is_refuel               BOOLEAN NOT NULL DEFAULT FALSE,
    is_repair               BOOLEAN NOT NULL DEFAULT FALSE,
    is_nqa                  BOOLEAN NOT NULL DEFAULT FALSE,
    is_jump_point           BOOLEAN NOT NULL DEFAULT FALSE,
    is_player_owned         BOOLEAN NOT NULL DEFAULT FALSE,
    is_auto_load            BOOLEAN NOT NULL DEFAULT FALSE,
    has_loading_dock        BOOLEAN NOT NULL DEFAULT FALSE,
    has_docking_port        BOOLEAN NOT NULL DEFAULT FALSE,
    has_freight_elevator    BOOLEAN NOT NULL DEFAULT FALSE,
    game_version            VARCHAR(20),
    uex_date_added          BIGINT,
    uex_date_modified       BIGINT,
    synced_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT station_terminals_uex_id_key UNIQUE (uex_id),
    CONSTRAINT station_terminals_code_key UNIQUE (code),
    CONSTRAINT station_terminals_type_check CHECK (type IN (
        'commodity','item','commodity_raw','vehicle_buy',
        'vehicle_rent','fuel','refinery_audit'
    ))
);

CREATE INDEX idx_station_terminals_star_system   ON station_terminal(star_system_id);
CREATE INDEX idx_station_terminals_planet        ON station_terminal(planet_id);
CREATE INDEX idx_station_terminals_orbit         ON station_terminal(orbit_id);
CREATE INDEX idx_station_terminals_moon          ON station_terminal(moon_id);
CREATE INDEX idx_station_terminals_space_station ON station_terminal(space_station_id);
CREATE INDEX idx_station_terminals_outpost       ON station_terminal(outpost_id);
CREATE INDEX idx_station_terminals_city          ON station_terminal(city_id);
CREATE INDEX idx_station_terminals_faction       ON station_terminal(faction_id);
CREATE INDEX idx_station_terminals_company       ON station_terminal(company_id);
CREATE INDEX idx_station_terminals_type          ON station_terminal(type);
CREATE INDEX idx_station_terminals_live          ON station_terminal(is_available_live) WHERE is_available_live = TRUE;
CREATE INDEX idx_station_terminals_player_owned  ON station_terminal(is_player_owned) WHERE is_player_owned = TRUE;
CREATE INDEX idx_station_terminals_trade         ON station_terminal(is_shop_fps, is_shop_vehicle);
CREATE INDEX idx_station_terminals_name_trgm     ON station_terminal USING GIN(name gin_trgm_ops);

-- ============================================================
-- station_terminal_distance
-- Source: GET /terminals_distances  (Tier 8 — depends on terminals)
-- Updated HOURLY — independent of patch cycles.
-- ETL resolves terminal_code_origin / terminal_code_destination
-- to station_terminal.id values during load.
-- ============================================================
CREATE TABLE station_terminal_distance (
    id                      BIGSERIAL PRIMARY KEY,
    terminal_origin_id      BIGINT NOT NULL REFERENCES station_terminal(id) ON DELETE CASCADE,
    terminal_destination_id BIGINT NOT NULL REFERENCES station_terminal(id) ON DELETE CASCADE,
    distance_gm             NUMERIC(12,4) NOT NULL,
    synced_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT station_terminal_distances_uq UNIQUE (terminal_origin_id, terminal_destination_id),
    CONSTRAINT station_terminal_distances_positive CHECK (distance_gm >= 0)
);

CREATE INDEX idx_station_terminal_distances_origin ON station_terminal_distance(terminal_origin_id);
CREATE INDEX idx_station_terminal_distances_dest   ON station_terminal_distance(terminal_destination_id);

-- ============================================================
-- station_jump_point
-- Source: GET /jump_points
-- Each UEX row represents a directed A->B connection. After loading
-- all real rows, ETL inserts synthetic mirror rows for any connection
-- where the reverse direction does not exist:
--   is_synthetic = TRUE
--   uex_id = -1 * original_uex_id  (satisfies unique constraint)
--   source_uex_id = original uex_id
-- ============================================================
CREATE TABLE station_jump_point (
    id                        BIGSERIAL       PRIMARY KEY,
    uex_id                    INTEGER         NOT NULL UNIQUE,
    star_system_origin_uex_id INTEGER         NOT NULL REFERENCES station_star_system (uex_id) ON DELETE CASCADE,
    star_system_dest_uex_id   INTEGER         NOT NULL REFERENCES station_star_system (uex_id) ON DELETE CASCADE,
    orbit_origin_uex_id       INTEGER         REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    orbit_dest_uex_id         INTEGER         REFERENCES station_orbit (uex_id) ON DELETE SET NULL,
    is_synthetic              BOOLEAN         NOT NULL DEFAULT FALSE,
    source_uex_id             INTEGER,        -- non-NULL for synthetic rows; stores original row's uex_id
    uex_date_added            TIMESTAMPTZ,
    uex_date_modified         TIMESTAMPTZ,
    synced_at                 TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jp_uex_id        ON station_jump_point (uex_id);
CREATE INDEX idx_jp_sys_origin    ON station_jump_point (star_system_origin_uex_id);
CREATE INDEX idx_jp_sys_dest      ON station_jump_point (star_system_dest_uex_id);
CREATE INDEX idx_jp_orbit_origin  ON station_jump_point (orbit_origin_uex_id);
CREATE INDEX idx_jp_orbit_dest    ON station_jump_point (orbit_dest_uex_id);
-- Partial index for real rows only
CREATE INDEX idx_station_jump_points_real ON station_jump_point(star_system_origin_uex_id, star_system_dest_uex_id)
    WHERE is_synthetic = FALSE;

-- ============================================================
-- station_category
-- Source: GET /categories
-- Self-referencing two-level hierarchy:
--   Level 1 (is_section = TRUE): synthetic section rows, uex_id IS NULL.
--   Level 2 (is_section = FALSE): actual UEX category rows with uex_id.
-- ============================================================
CREATE TABLE station_category (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER,
    parent_id           BIGINT              REFERENCES station_category (id) ON DELETE SET NULL,
    type                VARCHAR(20)         CHECK (type IN ('item', 'service', 'contract')),
    section             VARCHAR(80),
    name                VARCHAR(120)        NOT NULL,
    is_section          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_game_related     BOOLEAN             NOT NULL DEFAULT FALSE,
    is_mining           BOOLEAN             NOT NULL DEFAULT FALSE,
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_categories_uex_id       ON station_category (uex_id) WHERE uex_id IS NOT NULL;
CREATE UNIQUE INDEX uq_categories_section_type ON station_category (type, name) WHERE is_section = TRUE;
CREATE INDEX idx_categories_parent             ON station_category (parent_id);
CREATE INDEX idx_categories_type               ON station_category (type);
CREATE INDEX idx_categories_section            ON station_category (section);
CREATE INDEX idx_categories_is_mining          ON station_category (is_mining) WHERE is_mining = TRUE;

-- ============================================================
-- station_category_attribute
-- Source: GET /categories_attributes
-- Attribute definitions per item-type category.
-- ============================================================
CREATE TABLE station_category_attribute (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    category_uex_id     INTEGER             NOT NULL,
    name                VARCHAR(120)        NOT NULL,
    description         TEXT,
    is_lower_better     BOOLEAN,            -- NULL = "does not apply to this attribute"
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_attrs_uex_id   ON station_category_attribute (uex_id);
CREATE INDEX idx_cat_attrs_category ON station_category_attribute (category_uex_id);

-- ============================================================
-- station_company
-- Source: GET /companies
-- ============================================================
CREATE TABLE station_company (
    id                      BIGSERIAL       PRIMARY KEY,
    uex_id                  INTEGER         NOT NULL UNIQUE,
    faction_uex_id          INTEGER         REFERENCES station_faction (uex_id) ON DELETE SET NULL,
    name                    VARCHAR(120)    NOT NULL,
    nickname                VARCHAR(40),
    wiki                    VARCHAR(500),
    industry                VARCHAR(120),
    is_item_manufacturer    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_vehicle_manufacturer BOOLEAN         NOT NULL DEFAULT FALSE,
    uex_date_added          TIMESTAMPTZ,
    uex_date_modified       TIMESTAMPTZ,
    synced_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_uex_id           ON station_company (uex_id);
CREATE INDEX idx_companies_faction          ON station_company (faction_uex_id);
CREATE INDEX idx_companies_is_item_mfr      ON station_company (is_item_manufacturer) WHERE is_item_manufacturer = TRUE;
CREATE INDEX idx_companies_is_vehicle_mfr   ON station_company (is_vehicle_manufacturer) WHERE is_vehicle_manufacturer = TRUE;

-- ============================================================
-- station_vehicle
-- Source: GET /vehicles
-- crew_raw: raw crew CSV string stored before parsing.
-- crew_min / crew_max: parsed from crew_raw.
-- url_photos (deprecated array) is not stored.
-- ============================================================
CREATE TABLE station_vehicle (
    id                      BIGSERIAL       PRIMARY KEY,
    uex_id                  INTEGER         NOT NULL UNIQUE,
    company_uex_id          INTEGER         REFERENCES station_company (uex_id) ON DELETE SET NULL,
    parent_uex_id           INTEGER         REFERENCES station_vehicle (uex_id) ON DELETE SET NULL,
    name                    VARCHAR(120)    NOT NULL,
    name_full               VARCHAR(200),
    slug                    VARCHAR(200),
    uuid                    VARCHAR(64),
    scu                     DECIMAL(10, 2),
    crew_raw                VARCHAR(40),    -- raw string before parsing, e.g. "1,2" or "4"
    crew_min                SMALLINT,
    crew_max                SMALLINT,
    mass                    DECIMAL(14, 2),
    width                   DECIMAL(10, 2),
    height                  DECIMAL(10, 2),
    length                  DECIMAL(10, 2),
    fuel_quantum            DECIMAL(10, 2),
    fuel_hydrogen           DECIMAL(10, 2),
    container_sizes         INTEGER[],
    pad_type                VARCHAR(5)      CHECK (pad_type IN ('XS', 'S', 'M', 'L', 'XL')),
    is_addon                BOOLEAN         NOT NULL DEFAULT FALSE,
    is_boarding             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_bomber               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_cargo                BOOLEAN         NOT NULL DEFAULT FALSE,
    is_carrier              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_civilian             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_concept              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_construction         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_datarunner           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_docking              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_emp                  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_exploration          BOOLEAN         NOT NULL DEFAULT FALSE,
    is_ground_vehicle       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_hangar               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_industrial           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_interdiction         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_loading_dock         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_medical              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_military             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_mining               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_passenger            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_qed                  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_racing               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_refinery             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_refuel               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_repair               BOOLEAN         NOT NULL DEFAULT FALSE,
    is_research             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_salvage              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_scanning             BOOLEAN         NOT NULL DEFAULT FALSE,
    is_science              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_showdown_winner      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_spaceship            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_starter              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_stealth              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_tractor_beam         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_quantum_capable      BOOLEAN         NOT NULL DEFAULT FALSE,
    url_photo               VARCHAR(500),
    url_store               VARCHAR(500),
    url_brochure            VARCHAR(500),
    url_hotsite             VARCHAR(500),
    url_video               VARCHAR(500),
    game_version            VARCHAR(20),
    uex_date_added          TIMESTAMPTZ,
    uex_date_modified       TIMESTAMPTZ,
    synced_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_uex_id          ON station_vehicle (uex_id);
CREATE INDEX idx_vehicles_company         ON station_vehicle (company_uex_id);
CREATE INDEX idx_vehicles_parent          ON station_vehicle (parent_uex_id);
CREATE INDEX idx_vehicles_uuid            ON station_vehicle (uuid);
CREATE INDEX idx_vehicles_is_spaceship    ON station_vehicle (is_spaceship) WHERE is_spaceship = TRUE;
CREATE INDEX idx_vehicles_is_ground       ON station_vehicle (is_ground_vehicle) WHERE is_ground_vehicle = TRUE;
CREATE INDEX idx_vehicles_is_cargo        ON station_vehicle (is_cargo) WHERE is_cargo = TRUE;
CREATE INDEX idx_vehicles_is_mining       ON station_vehicle (is_mining) WHERE is_mining = TRUE;
CREATE INDEX idx_vehicles_is_concept      ON station_vehicle (is_concept) WHERE is_concept = TRUE;
CREATE INDEX idx_vehicles_is_quantum      ON station_vehicle (is_quantum_capable) WHERE is_quantum_capable = TRUE;
CREATE INDEX idx_vehicles_container_sizes ON station_vehicle USING GIN (container_sizes);

-- ============================================================
-- station_vehicle_loaner
-- Junction: vehicle <-> loaner substitute vehicle.
-- Derived from vehicles.ids_vehicles_loaners CSV.
-- ============================================================
CREATE TABLE station_vehicle_loaner (
    vehicle_uex_id  INTEGER     NOT NULL REFERENCES station_vehicle (uex_id) ON DELETE CASCADE,
    loaner_uex_id   INTEGER     NOT NULL REFERENCES station_vehicle (uex_id) ON DELETE CASCADE,
    PRIMARY KEY (vehicle_uex_id, loaner_uex_id)
);

CREATE INDEX idx_vl_vehicle ON station_vehicle_loaner (vehicle_uex_id);
CREATE INDEX idx_vl_loaner  ON station_vehicle_loaner (loaner_uex_id);

-- ============================================================
-- station_item
-- Source: GET /items
-- attributes_summary: JSONB snapshot of EAV data for UI display.
--   Format: {"Shield HP": "2500 HP", "Power Draw": "12 pwr"}
--   Populated by ETL after station_item_attribute is loaded.
--   Use this column for display. Use station_item_attribute for
--   attribute-based filtering and range queries.
-- ============================================================
CREATE TABLE station_item (
    id                      BIGSERIAL       PRIMARY KEY,
    uex_id                  INTEGER         NOT NULL UNIQUE,
    parent_uex_id           INTEGER         REFERENCES station_item (uex_id) ON DELETE SET NULL,
    category_uex_id         INTEGER,
    company_uex_id          INTEGER         REFERENCES station_company (uex_id) ON DELETE SET NULL,
    vehicle_uex_id          INTEGER         REFERENCES station_vehicle (uex_id) ON DELETE SET NULL,
    name                    VARCHAR(200)    NOT NULL,
    slug                    VARCHAR(200),
    uuid                    VARCHAR(64),
    size                    VARCHAR(10),
    color                   VARCHAR(20),
    color2                  VARCHAR(20),
    quality                 SMALLINT,
    url_store               VARCHAR(500),
    is_exclusive_pledge     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_exclusive_subscriber BOOLEAN         NOT NULL DEFAULT FALSE,
    is_exclusive_concierge  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_commodity            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_harvestable          BOOLEAN         NOT NULL DEFAULT FALSE,
    screenshot              VARCHAR(500),
    notification            JSONB,
    attributes_summary      JSONB,
    game_version            VARCHAR(20),
    uex_date_added          TIMESTAMPTZ,
    uex_date_modified       TIMESTAMPTZ,
    synced_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_uex_id              ON station_item (uex_id);
CREATE INDEX idx_items_parent              ON station_item (parent_uex_id);
CREATE INDEX idx_items_category            ON station_item (category_uex_id);
CREATE INDEX idx_items_company             ON station_item (company_uex_id);
CREATE INDEX idx_items_vehicle             ON station_item (vehicle_uex_id);
CREATE INDEX idx_items_uuid                ON station_item (uuid);
CREATE INDEX idx_items_slug                ON station_item (slug);
CREATE INDEX idx_items_name_fts            ON station_item USING GIN (to_tsvector('english', name));
CREATE INDEX idx_items_is_commodity        ON station_item (is_commodity) WHERE is_commodity = TRUE;
CREATE INDEX idx_items_is_harvestable      ON station_item (is_harvestable) WHERE is_harvestable = TRUE;
CREATE INDEX idx_items_attributes_summary  ON station_item USING GIN (attributes_summary);

-- ============================================================
-- station_item_attribute
-- Source: GET /items_attributes
-- EAV: one row per (item, category_attribute) pair.
-- Values stored as text; parse to numeric using the unit column.
-- Use for attribute-based filtering (range, is_lower_better).
-- Use station_item.attributes_summary for display-only patterns.
-- ============================================================
CREATE TABLE station_item_attribute (
    id                        BIGSERIAL   PRIMARY KEY,
    uex_id                    INTEGER     NOT NULL UNIQUE,
    item_uex_id               INTEGER     NOT NULL REFERENCES station_item (uex_id) ON DELETE CASCADE,
    category_uex_id           INTEGER,
    category_attribute_uex_id INTEGER     NOT NULL REFERENCES station_category_attribute (uex_id) ON DELETE CASCADE,
    value                     VARCHAR(200),
    unit                      VARCHAR(40),
    uex_date_added            TIMESTAMPTZ,
    uex_date_modified         TIMESTAMPTZ,
    synced_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_attrs_uex_id       ON station_item_attribute (uex_id);
CREATE INDEX idx_item_attrs_item         ON station_item_attribute (item_uex_id);
CREATE INDEX idx_item_attrs_category     ON station_item_attribute (category_uex_id);
CREATE INDEX idx_item_attrs_cat_attr     ON station_item_attribute (category_attribute_uex_id);
CREATE INDEX idx_item_attrs_item_catattr ON station_item_attribute (item_uex_id, category_attribute_uex_id);

-- ============================================================
-- station_commodity
-- Source: GET /commodities
-- ============================================================
CREATE TABLE station_commodity (
    id                  BIGSERIAL           PRIMARY KEY,
    uex_id              INTEGER             NOT NULL UNIQUE,
    parent_uex_id       INTEGER             REFERENCES station_commodity (uex_id) ON DELETE SET NULL,
    name                VARCHAR(120)        NOT NULL,
    code                VARCHAR(20)         NOT NULL,
    slug                VARCHAR(120),
    kind                VARCHAR(60),
    weight_scu          SMALLINT,
    price_buy           DECIMAL(12, 4),
    price_sell          DECIMAL(12, 4),
    is_available        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_available_live   BOOLEAN             NOT NULL DEFAULT FALSE,
    is_visible          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_extractable      BOOLEAN             NOT NULL DEFAULT FALSE,
    is_mineral          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_raw              BOOLEAN             NOT NULL DEFAULT FALSE,
    is_pure             BOOLEAN             NOT NULL DEFAULT FALSE,
    is_refined          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_refinable        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_harvestable      BOOLEAN             NOT NULL DEFAULT FALSE,
    is_buyable          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_sellable         BOOLEAN             NOT NULL DEFAULT FALSE,
    is_temporary        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_illegal          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_volatile_qt      BOOLEAN             NOT NULL DEFAULT FALSE,
    is_volatile_time    BOOLEAN             NOT NULL DEFAULT FALSE,
    is_inert            BOOLEAN             NOT NULL DEFAULT FALSE,
    is_explosive        BOOLEAN             NOT NULL DEFAULT FALSE,
    is_buggy            BOOLEAN             NOT NULL DEFAULT FALSE,
    is_fuel             BOOLEAN             NOT NULL DEFAULT FALSE,
    wiki                VARCHAR(500),
    uex_date_added      TIMESTAMPTZ,
    uex_date_modified   TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commodities_uex_id       ON station_commodity (uex_id);
CREATE INDEX idx_commodities_parent       ON station_commodity (parent_uex_id);
CREATE INDEX idx_commodities_code         ON station_commodity (code);
CREATE INDEX idx_commodities_slug         ON station_commodity (slug);
CREATE INDEX idx_commodities_kind         ON station_commodity (kind);
CREATE INDEX idx_commodities_name_fts     ON station_commodity USING GIN (to_tsvector('english', name));
CREATE INDEX idx_commodities_is_illegal   ON station_commodity (is_illegal) WHERE is_illegal = TRUE;
CREATE INDEX idx_commodities_is_buyable   ON station_commodity (is_buyable) WHERE is_buyable = TRUE;
CREATE INDEX idx_commodities_is_sellable  ON station_commodity (is_sellable) WHERE is_sellable = TRUE;
CREATE INDEX idx_commodities_is_fuel      ON station_commodity (is_fuel) WHERE is_fuel = TRUE;
CREATE INDEX idx_commodities_is_available ON station_commodity (is_available) WHERE is_available = TRUE;

-- ============================================================
-- station_etl_warning
-- Written during ETL runs for recoverable anomalies that do not
-- halt the pipeline. This table is NOT a sync target — the ETL
-- process writes to it directly.
--
-- Use cases:
--   entity_type='planet', field='orbit_uex_id':
--     planet name did not match any orbit row; orbit_uex_id left NULL.
--   entity_type='moon', field='orbit_uex_id':
--     same for moons.
--   uex_id: the affected source row's UEX id.
--   message: includes mismatched name strings for debugging.
-- ============================================================
CREATE TABLE station_etl_warning (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,
    uex_id          INTEGER,
    field           VARCHAR(100),
    message         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_station_etl_warnings_entity ON station_etl_warning (entity_type, created_at DESC);
```

---

## 5. ETL Load Order & Strategy

ETL must respect FK dependencies. All tables use `INSERT ... ON CONFLICT (uex_id) DO UPDATE` (upsert) unless noted otherwise. After each successful sync, record `MAX(uex_date_modified)` per table and pass it as `?date_modified_min=<epoch>` on the next run where the API supports it.

---

### Step 1 — `station_faction`

- **Source:** `GET /factions`
- **Upsert key:** `uex_id`
- **Dependencies:** None — load first
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `is_piracy`, `is_bounty_hunting`: cast `1/0 → BOOLEAN`
  - `date_added` / `date_modified`: `TO_TIMESTAMP(value)::TIMESTAMPTZ`
  - `ids_star_systems`, `ids_factions_friendly`, `ids_factions_hostile`: parse CSV; defer junction inserts to Steps 2 and 5

---

### Step 2 — `station_faction_friendly`, `station_faction_hostile`

- **Source:** Same `/factions` payload from Step 1 (no re-fetch)
- **Upsert key:** Composite PK `(faction_uex_id, friendly/hostile_faction_uex_id)`
- **Dependencies:** Step 1
- **Delta sync:** Derived from Step 1 delta; re-process only changed faction rows
- **Transforms:**
  - For each changed faction: `DELETE FROM station_faction_friendly WHERE faction_uex_id = $1`, then re-insert all current friendly IDs from the CSV. Repeat for hostile.

---

### Step 3 — `station_jurisdiction`

- **Source:** `GET /jurisdictions`
- **Upsert key:** `uex_id`
- **Dependencies:** Step 1
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `id_faction → faction_uex_id`; boolean and timestamp casts
  - **Hard error:** if `id_faction` contains a comma (CSV), ETL throws an exception and halts — does NOT silently skip or use the first value. This forces immediate schema review.

---

### Step 4 — `station_star_system`

- **Source:** `GET /star_systems`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** `id_faction → faction_uex_id`, `id_jurisdiction → jurisdiction_uex_id`; boolean and timestamp casts

---

### Step 5 — `station_faction_star_system`

- **Source:** Same `/factions` payload from Step 1 (no re-fetch)
- **Upsert key:** Composite PK `(faction_uex_id, star_system_uex_id)`
- **Dependencies:** Steps 1, 4
- **Delta sync:** Derived from Step 1 delta
- **Transforms:** For each changed faction: delete-then-insert all star system relations

---

### Step 6 — `station_orbit`

- **Source:** `GET /orbits`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** All `is_*` flags cast to `BOOLEAN`; FK references stored as `*_uex_id`

---

### Step 7 — `station_orbit_distance`

- **Source:** `GET /orbits_distances`
- **Upsert key:** `uex_id`; secondary unique constraint on `(orbit_origin_uex_id, orbit_dest_uex_id)` for conflict detection
- **Dependencies:** Steps 4, 6
- **Delta sync:** Yes — `date_modified` available; full table refresh is also acceptable on patch day since all distances change
- **Transforms:** Ignore deprecated `id_star_system` field; `distance → distance_gm DECIMAL(12,4)`

---

### Step 8 — `station_planet`

- **Source:** `GET /planets`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4, 6
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `orbit_uex_id`: `/planets` does not return `id_orbit`; resolve by matching `station_orbit` where `is_planet = TRUE AND star_system_uex_id = planet.id_star_system AND name = planet.name`.
  - On mismatch (no orbit found): set `orbit_uex_id = NULL` and insert a row into `station_etl_warning` with `entity_type = 'planet'`, `uex_id = planet.id`, `field = 'orbit_uex_id'`, and the mismatched names in `message`.

---

### Step 9 — `station_moon`

- **Source:** `GET /moons`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4, 6, 8
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `id_star_system, id_planet, id_orbit, id_faction, id_jurisdiction → *_uex_id`
  - `orbit_uex_id`: resolved from `id_orbit` directly (moons do supply `id_orbit`). If `id_orbit` is absent or does not match any orbit row, log to `station_etl_warning` with `entity_type = 'moon'`, `field = 'orbit_uex_id'`.

---

### Step 10 — `station_city`

- **Source:** `GET /cities`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4, 6, 8, 9
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `pad_types` pipe-delimited string → `TEXT[]`: `string_to_array(pad_types, '|')`; null input → NULL array
  - All `is_*` / `has_*` → `BOOLEAN`

---

### Step 11 — `station_space_station`

- **Source:** `GET /space_stations`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4, 6, 8, 9, 10 (city_uex_id)
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** `pad_types → TEXT[]`; `id_city → city_uex_id`; boolean casts

---

### Step 12 — `station_outpost`

- **Source:** `GET /outposts`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4, 6, 8, 9
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** `pad_types → TEXT[]`; boolean casts

---

### Step 13 — `station_poi`

- **Source:** `GET /poi`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 1, 3, 4, 6, 8, 9, 10, 11, 12
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** `pad_types → TEXT[]`; all parent location IDs → `*_uex_id`; boolean casts

---

### Step 14 — `station_jump_point` (real rows)

- **Source:** `GET /jump_points`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 4, 6
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `id_star_system_origin/destination → star_system_*_uex_id`; `id_orbit_origin/destination → orbit_*_uex_id`
  - `is_synthetic = FALSE`, `source_uex_id = NULL` for all real rows

### Step 14b — `station_jump_point` (synthetic mirror rows)

- **Source:** Derived from the real rows loaded in Step 14
- **Trigger:** Run after all real rows are loaded in the same ETL pass
- **Logic:** Query for any `(A→B)` pair where the reverse `(B→A)` does not exist. For each missing reverse, insert with `is_synthetic = TRUE`, `uex_id = -1 * original_uex_id`, `source_uex_id = original_uex_id`, swapping `star_system_origin/dest` and `orbit_origin/dest`.
- **Upsert key:** `uex_id` (negative values for synthetic rows guarantee no collision)

---

### Step 15 — `station_category`

- **Source:** `GET /categories`
- **Upsert key:** `uex_id` (real rows); `(type, name)` where `is_section = TRUE` (synthetic section rows)
- **Dependencies:** None
- **Delta sync:** Yes — `date_modified` available on real rows; section rows only change when new sections appear
- **Transforms:**
  1. Collect all distinct `(type, section)` pairs from API response
  2. Upsert synthetic section rows using the `uq_categories_section_type` partial unique index
  3. Upsert real category rows; resolve `parent_id` by querying the section row for `(type, section_value)`

---

### Step 16 — `station_category_attribute`

- **Source:** `GET /categories_attributes`
- **Upsert key:** `uex_id`
- **Dependencies:** Step 15
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `is_lower_better`: store as `BOOLEAN NULL` — `0 → FALSE`, `1 → TRUE`, absent/not-applicable → `NULL`
  - `id_category → category_uex_id`

---

### Step 17 — `station_company`

- **Source:** `GET /companies`
- **Upsert key:** `uex_id`
- **Dependencies:** Step 1
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** Boolean casts on `is_item_manufacturer`, `is_vehicle_manufacturer`

---

### Step 18 — `station_vehicle`

- **Source:** `GET /vehicles`
- **Upsert key:** `uex_id`
- **Dependencies:** Step 17
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `crew` CSV → store raw in `crew_raw`; then parse: single value → `crew_min = crew_max = value`; two values → `crew_min = values[0], crew_max = values[1]`; empty → both `NULL`
  - `container_sizes` CSV → `INTEGER[]`
  - `pad_type` → store as-is (validated against CHECK constraint)
  - `url_photos` (deprecated) — not stored
  - `ids_vehicles_loaners` CSV — defer to Step 19

---

### Step 19 — `station_vehicle_loaner`

- **Source:** Same `/vehicles` payload from Step 18 (no re-fetch)
- **Upsert key:** Composite PK `(vehicle_uex_id, loaner_uex_id)`
- **Dependencies:** Step 18
- **Delta sync:** Derived from Step 18 delta; delete-then-insert per changed vehicle

---

### Step 20 — `station_item`

- **Source:** `GET /items`
- **Upsert key:** `uex_id` primary; use `uuid` as supplemental stable key
- **Dependencies:** Steps 15, 17, 18
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `attributes` (deprecated JSON) — not stored
  - `notification` JSON → `JSONB`
  - `id_parent, id_category, id_company, id_vehicle → *_uex_id`
  - All `is_*` → `BOOLEAN`
  - UUID conflict resolution: first attempt upsert by `uex_id`; if no match, attempt by `uuid` and update `uex_id` if found; otherwise insert new row.
  - `attributes_summary` is populated in Step 21b after item attributes are loaded.

---

### Step 21 — `station_item_attribute`

- **Source:** `GET /items_attributes`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 16, 20
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - `id_item → item_uex_id`; `id_category → category_uex_id`; `id_category_attribute → category_attribute_uex_id`
  - `value` stored as `VARCHAR` — no casting; callers interpret per `unit`

### Step 21b — `station_item.attributes_summary` (JSONB backfill)

- **Source:** Derived from `station_item_attribute` rows loaded in Step 21
- **Trigger:** Run after Step 21 completes in the same ETL pass
- **Logic:** For each item, aggregate all attribute rows into a JSONB object keyed by attribute name with `"value unit"` as the string value. Execute as a single bulk `UPDATE station_item SET attributes_summary = agg.summary FROM (...) agg WHERE station_item.uex_id = agg.item_uex_id`.

---

### Step 22 — `station_commodity`

- **Source:** `GET /commodities`
- **Upsert key:** `uex_id`
- **Dependencies:** None (self-referencing `parent_uex_id` uses raw UEX IDs; no cross-table FK)
- **Delta sync:** Yes — `date_modified` available
- **Transforms:** `id_parent → parent_uex_id`; all `is_*` → `BOOLEAN`; `price_buy/sell → DECIMAL(12,4)`

---

### Step 23 — `station_terminal` (Tier 7)

- **Source:** `GET /terminals`
- **Upsert key:** `uex_id`
- **Dependencies:** Steps 4, 6, 8, 9, 10, 11, 12, 13, 17 (all location tables + companies)
- **Delta sync:** Yes — `date_modified` available
- **Transforms:**
  - For each `id_*` field: look up the corresponding Station table by `uex_id` and store the Station `id` (BIGINT)
  - `is_*` / `has_*` → `BOOLEAN`
  - `mcs` — not stored; use `max_container_size`
  - Denormalized `*_name` fields — not stored
  - `date_added` / `date_modified` stored as raw BIGINT (`uex_date_added`, `uex_date_modified`) — not converted to TIMESTAMPTZ since the source type is inconsistent
  - `code` must be unique; upsert conflict on `uex_id`

---

### Step 24 — `station_terminal_distance` (Tier 8, **hourly**)

- **Source:** `GET /terminals_distances`
- **Upsert key:** `(terminal_origin_id, terminal_destination_id)`
- **Dependencies:** Step 23
- **Frequency:** **Hourly** — this endpoint updates independently of patch cycles
- **Delta sync:** Full replace preferred — the payload is compact and the update frequency is high
- **Transforms:**
  - Resolve `terminal_code_origin` → `station_terminal.id` via `WHERE code = $1`
  - Resolve `terminal_code_destination` → `station_terminal.id` via `WHERE code = $1`
  - If either code cannot be resolved, skip the row and log to `station_etl_warning` with `entity_type = 'terminal_distance'`, `field = 'terminal_origin_id'` or `'terminal_destination_id'`, and the unresolved code in `message`
  - `distance → distance_gm NUMERIC(12,4)`

---

### ETL Scheduling Summary

| Group                 | Tables                                                                                                                       | Frequency                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Patch-cycle reference | factions, faction relations, jurisdictions, star_systems, orbits, planets, moons, categories, category_attributes, companies | Daily + on patch day                       |
| Location data         | cities, space_stations, outposts, pois, jump_points (+ synthetic mirrors), orbit_distances                                   | Daily + on patch day                       |
| Catalog               | vehicles, vehicle_loaners, items, item_attributes (+ attributes_summary backfill), commodities                               | Daily + on patch day                       |
| Terminals             | station_terminal                                                                                                             | Daily + on patch day                       |
| Terminal distances    | station_terminal_distance                                                                                                    | **Hourly**                                 |
| ETL diagnostics       | station_etl_warning                                                                                                          | Written during any run — not a sync target |

---

## 6. Decisions Log

All questions from the original design review are resolved. This section documents what was decided and why.

### 6.1 — Planet/Moon to Orbit ID Mapping

**Decision:** Option A — name-based join in the ETL, with mismatch rows written to `station_etl_warning`.

**Rationale:** The `/planets` and `/moons` endpoints do not return `id_orbit`. The ETL resolves `orbit_uex_id` by matching `station_orbit` where `is_planet = TRUE`, `star_system_uex_id` matches, and `name` matches. For moons, `id_orbit` is present in the API response and used directly; if it fails to resolve, it is treated as a mismatch. Any unresolved match results in `orbit_uex_id = NULL` on the affected row and a row in `station_etl_warning` (`entity_type = 'planet'` or `'moon'`, `field = 'orbit_uex_id'`, mismatched names in `message`). This makes mismatches queryable via SQL during every patch cycle rather than requiring log file access.

### 6.2 — `station_terminal` Table

**Decision:** Implement `station_terminal` and `station_terminal_distance` now from the live `/terminals` and `/terminals_distances` endpoints.

**Rationale:** A live `/terminals` endpoint was confirmed. The schema is fully specified. Terminal distances are updated hourly and keyed by terminal codes, which the ETL resolves to Station BIGINT PKs during load. The `station_terminal_distance` table is a Tier 8 dependency, updated on an independent hourly schedule separate from the daily patch-cycle sync.

### 6.3 — `jurisdictions.id_faction` Multi-Value Risk

**Decision:** Accept single-FK approach. ETL hard-errors (throws exception, halts) if `id_faction` contains a comma — no silent skip, no first-value fallback.

**Rationale:** Current data has one faction per jurisdiction. A hard error ensures the case is caught immediately if UEX ever changes this field, forcing a schema review before corrupt data is written. The schema carries a SQL comment on `station_jurisdiction` documenting this constraint.

### 6.4 — Item `uex_id` Instability and UUID Conflict Resolution

**Decision:** Treat `uuid` as canonical where non-null. Two-pass upsert: first by `uex_id`; if no match, by `uuid` (update `uex_id` on the existing row if found); otherwise insert.

**Rationale:** UEX warns that item `id` may change between website updates. The Star Citizen `uuid` is stable across patches. The two-pass upsert prevents duplicate rows when `uex_id` changes for an item that already exists under its `uuid`.

### 6.5 — EAV + JSONB Dual Approach for Item Attributes

**Decision:** Keep `station_item_attribute` as the primary EAV table. Add `attributes_summary JSONB` column to `station_item` as a denormalized display snapshot. ETL populates `attributes_summary` as a bulk update after Step 21. GIN index added on `attributes_summary`.

**Rationale:** The EAV table supports unit-aware range queries and leverages `is_lower_better` from `station_category_attribute`. The JSONB summary eliminates the need for a JOIN on every item detail page render. Both structures serve different access patterns; keeping both is the right tradeoff at this data scale.

### 6.6 — Jump Point Directionality

**Decision:** After loading all real jump point rows, the ETL inserts synthetic mirror rows for any `(A→B)` connection where `(B→A)` does not exist. Synthetic rows: `is_synthetic = TRUE`, `uex_id = -1 * original_uex_id`, `source_uex_id = original_uex_id`.

**Rationale:** "What systems can I reach from Stanton" queries require both directions to be present regardless of which direction UEX chose to store. The negative `uex_id` scheme is deterministic, collision-free with real rows, and reversible if UEX later adds the reverse direction natively. A partial index on `(star_system_origin_uex_id, star_system_dest_uex_id) WHERE is_synthetic = FALSE` supports deduplication checks during ETL.

### 6.7 — `vehicle.crew` Raw String Preservation

**Decision:** Add `crew_raw VARCHAR(40)` alongside `crew_min` / `crew_max`.

**Rationale:** The `crew` CSV field may have edge cases beyond the standard `"min,max"` pattern. Storing the raw string before parsing costs nothing and eliminates any need to re-fetch vehicles if the parsing logic is later found to be incorrect.

### 6.8 — `is_available` vs `is_available_live` Query Convention

**Decision:** `is_available_live = TRUE` is the canonical filter for all Station UI queries. `is_available` (UEX platform flag) is stored for completeness but is not used as the primary visibility filter.

**Rationale:** `is_available_live` reflects what is actually accessible in the live Star Citizen game, which is the correct filter for the Station application. `is_available` reflects UEX platform state, which may include items not yet in game. Both columns must carry JSDoc comments on all TypeORM entity definitions making this distinction explicit. The query convention is stated at the top of this document and enforced as a SQL comment on the first table where both columns appear (`station_jurisdiction`).

---

## 7. Table Summary

| Table                       | Type           | Row estimate                    | Sync frequency          | Source endpoint              |
| --------------------------- | -------------- | ------------------------------- | ----------------------- | ---------------------------- |
| station_faction             | Reference      | ~50                             | Daily + patch           | `GET /factions`              |
| station_faction_friendly    | Junction       | ~100                            | Daily + patch           | Derived from `/factions`     |
| station_faction_hostile     | Junction       | ~100                            | Daily + patch           | Derived from `/factions`     |
| station_faction_star_system | Junction       | ~150                            | Daily + patch           | Derived from `/factions`     |
| station_jurisdiction        | Reference      | ~20                             | Daily + patch           | `GET /jurisdictions`         |
| station_star_system         | Reference      | ~50                             | Daily + patch           | `GET /star_systems`          |
| station_orbit               | Reference      | ~500                            | Daily + patch           | `GET /orbits`                |
| station_orbit_distance      | Patch-variable | ~5,000                          | Daily + patch           | `GET /orbits_distances`      |
| station_planet              | Reference      | ~50                             | Daily + patch           | `GET /planets`               |
| station_moon                | Reference      | ~100                            | Daily + patch           | `GET /moons`                 |
| station_city                | Location       | ~50                             | Daily + patch           | `GET /cities`                |
| station_space_station       | Location       | ~200                            | Daily + patch           | `GET /space_stations`        |
| station_outpost             | Location       | ~500                            | Daily + patch           | `GET /outposts`              |
| station_poi                 | Location       | ~1,000                          | Daily + patch           | `GET /poi`                   |
| station_jump_point          | Location       | ~100 (real) + ~50 synthetic     | Daily + patch           | `GET /jump_points`           |
| station_terminal            | Operational    | ~2,000–5,000                    | Daily + patch           | `GET /terminals`             |
| station_terminal_distance   | Operational    | ~500,000+                       | **Hourly**              | `GET /terminals_distances`   |
| station_category            | Reference      | ~200 (incl. synthetic sections) | Daily + patch           | `GET /categories`            |
| station_category_attribute  | Reference      | ~500                            | Daily + patch           | `GET /categories_attributes` |
| station_company             | Reference      | ~100                            | Daily + patch           | `GET /companies`             |
| station_vehicle             | Catalog        | ~500                            | Daily + patch           | `GET /vehicles`              |
| station_vehicle_loaner      | Junction       | ~200                            | Daily + patch           | Derived from `/vehicles`     |
| station_item                | Catalog        | ~10,000–50,000                  | Daily + patch           | `GET /items`                 |
| station_item_attribute      | EAV            | ~500,000+                       | Daily + patch           | `GET /items_attributes`      |
| station_commodity           | Catalog        | ~200                            | Daily + patch           | `GET /commodities`           |
| station_etl_warning         | Diagnostics    | grows over time                 | Written during ETL runs | n/a — ETL-internal           |
