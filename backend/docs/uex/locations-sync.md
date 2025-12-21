# UEX Locations Sync Relationships

## Overview

UEX location data includes multiple parent references that are not always
planets or moons. Station persists those relationships so sync and location
population can resolve a valid star system and hierarchy path.

## Relationships Captured

- Orbits are stored in `uex_orbits` and linked to star systems.
- Space stations can reference a planet, moon, or orbit.
- POIs can reference a star system, planet, moon, orbit, space station, city,
  or outpost.
- Moons can reference either a planet or a star system directly (when
  `id_planet` is missing but `id_star_system` is present).

## Sync and Population Notes

- The locations sync order includes `orbits` before planets/moons, so orbit
  references can resolve immediately.
- Space stations and POIs resolve their star system from orbit or related
  entities when a direct star system ID is missing.
- Location population prefers the most specific parent (station/city/outpost,
  then planet/moon, then orbit, then star system) when building hierarchy paths.
