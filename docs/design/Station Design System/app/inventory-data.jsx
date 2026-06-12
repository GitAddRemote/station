// ============================================================
// Station — Inventory data & helpers
// Mock UEX catalog + personal/org inventory records, mirroring the
// real app's data model (uexItemId, categoryName, quantity, notes,
// sharedOrgId). Exposed on window for Inventory.jsx.
// ============================================================

// category families with tint colors (Star Citizen commodity/component types)
const INV_CATEGORIES = [
  { id: 1, name: 'Refined Ore', color: '#5BD6B0' },
  { id: 2, name: 'Raw Ore', color: '#C2724B' },
  { id: 3, name: 'Salvage', color: '#C879D8' },
  { id: 4, name: 'Components', color: '#7CBEF9' },
  { id: 5, name: 'Weapons', color: '#E06A52' },
  { id: 6, name: 'Ship Weapons', color: '#E0913A' },
  { id: 7, name: 'Consumables', color: '#5BD6B0' },
  { id: 8, name: 'Trade Goods', color: '#E0B23A' },
  { id: 9, name: 'Liveries', color: '#9AA7B2' },
  { id: 10, name: 'Vehicles', color: '#6E7BF2' },
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
  { uexId: 101, name: 'Quantanium', categoryId: 1 },
  { uexId: 102, name: 'Bexalite', categoryId: 1 },
  { uexId: 103, name: 'Taranite', categoryId: 1 },
  { uexId: 104, name: 'Laranite', categoryId: 1 },
  { uexId: 105, name: 'Agricium', categoryId: 1 },
  { uexId: 106, name: 'Gold (refined)', categoryId: 1 },
  { uexId: 107, name: 'Titanium', categoryId: 1 },
  { uexId: 108, name: 'Hephaestanite', categoryId: 1 },
  { uexId: 201, name: 'Quantanium (raw)', categoryId: 2 },
  { uexId: 202, name: 'Iron (raw)', categoryId: 2 },
  { uexId: 203, name: 'Tungsten (raw)', categoryId: 2 },
  { uexId: 301, name: 'Recycled Material Composite', categoryId: 3 },
  { uexId: 302, name: 'Construction Materials', categoryId: 3 },
  { uexId: 303, name: 'Ship Hull Plating', categoryId: 3 },
  { uexId: 401, name: 'C788 Sa Power Plant', categoryId: 4 },
  { uexId: 402, name: 'FR-76 Shield Generator', categoryId: 4 },
  { uexId: 403, name: 'Atlas Quantum Drive', categoryId: 4 },
  { uexId: 404, name: 'JS-300 Jump Module', categoryId: 4 },
  { uexId: 501, name: 'Demeco LMG', categoryId: 5 },
  { uexId: 502, name: 'P8-AR Assault Rifle', categoryId: 5 },
  { uexId: 503, name: 'Gemini S71 Rifle', categoryId: 5 },
  { uexId: 601, name: 'CF-337 Panther Repeater', categoryId: 6 },
  { uexId: 602, name: 'Attrition-3 Laser Cannon', categoryId: 6 },
  { uexId: 701, name: 'Medical Supplies', categoryId: 7 },
  { uexId: 702, name: 'Medical Pen (Hemozal)', categoryId: 7 },
  { uexId: 703, name: 'Oxygen Canister', categoryId: 7 },
  { uexId: 801, name: 'Stims', categoryId: 8 },
  { uexId: 802, name: 'Distilled Spirits', categoryId: 8 },
  { uexId: 803, name: 'Pressurized Ice', categoryId: 8 },
  { uexId: 901, name: '100i Frostbite Livery', categoryId: 9 },
  { uexId: 902, name: 'Cutlass Skull & Crossbones', categoryId: 9 },
  { uexId: 1001, name: 'Greycat ROC', categoryId: 10 },
  { uexId: 1002, name: 'Greycat PTV', categoryId: 10 },
];

// orgs the user belongs to + permission sets
const INV_ORGS = [
  {
    id: 1,
    name: 'Atlas Vanguard',
    badge: 'AV',
    perms: ['view', 'edit', 'admin'],
  },
  { id: 2, name: 'Crimson Fleet', badge: 'CF', perms: ['view'] },
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
  rec(101, 96, { location: 'ARC-L1 Storage', modified: '2h ago' }),
  rec(103, 31, {
    sharedOrgId: 1,
    location: 'CRU-L1 Storage',
    modified: '5h ago',
  }),
  rec(104, 23, { location: 'Lyria Outpost', modified: '1d ago' }),
  rec(301, 61, { sharedOrgId: 1, location: 'CRU-L1', modified: '3h ago' }),
  rec(403, 1, {
    notes: 'Spare — for the Prospector',
    location: 'New Babbage',
    modified: '4d ago',
  }),
  rec(501, 1, { location: 'Area18 · Hangar 4', modified: '1w ago' }),
  rec(502, 2, { sharedOrgId: 1, location: 'Port Olisar', modified: '6h ago' }),
  rec(701, 48, { location: 'Atlas Hangar', modified: '2d ago' }),
  rec(901, 3, { location: 'Everus Harbor', modified: '3w ago' }),
  rec(1001, 2, { location: 'New Babbage', modified: '5d ago' }),
  rec(102, 54, { location: 'Aaron Halo cache', modified: '8h ago' }),
  rec(202, 1240, {
    sharedOrgId: 1,
    location: 'CRU-L1 Storage',
    modified: '1h ago',
  }),
  rec(802, 18, { location: 'microTech', modified: '2w ago' }),
  rec(303, 12, { location: 'CRU-L1 Reclamation', modified: '7h ago' }),
];

// org inventory records (Atlas Vanguard)
const ORG_ITEMS = [
  rec(101, 420, { location: 'Org vault · ARC-L1', modified: '1h ago' }),
  rec(403, 6, { location: 'Fleet stores', modified: '3d ago' }),
  rec(402, 9, { location: 'Fleet stores', modified: '3d ago' }),
  rec(701, 240, { location: 'Atlas medbay', modified: '12h ago' }),
  rec(502, 14, { location: 'Armory', modified: '1d ago' }),
  rec(601, 8, { location: 'Armory', modified: '2d ago' }),
  rec(301, 880, { location: 'Org vault · CRU-L1', modified: '4h ago' }),
  rec(803, 320, { location: 'Refinery dock', modified: '6h ago' }),
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
