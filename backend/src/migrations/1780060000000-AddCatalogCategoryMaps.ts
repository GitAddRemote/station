import { MigrationInterface, QueryRunner } from 'typeorm';

type StationUexCategorySeed = readonly [
  uexCategoryId: number,
  uexCategoryName: string,
  uexCategoryType: string | null,
  uexCategorySection: string | null,
  catalogCategoryPath: string,
  notes: string | null,
];

type UexCommodityCategorySeed = readonly [
  commodityUexId: number,
  commodityName: string,
  commodityKind: string | null,
  catalogCategoryPath: string,
];

const STATION_UEX_CATEGORY_SEEDS: StationUexCategorySeed[] = [
  [1, 'Arms', 'item', 'Armor', 'item.armor.arms', null],
  [2, 'Backpacks', 'item', 'Armor', 'item.armor.backpacks', null],
  [3, 'Helmets', 'item', 'Armor', 'item.armor.helmets', null],
  [4, 'Legs', 'item', 'Armor', 'item.armor.legs', null],
  [5, 'Torso', 'item', 'Armor', 'item.armor.torso', null],
  [7, 'Full Set', 'item', 'Armor', 'item.armor.armor-full-set', null],
  [8, 'Footwear', 'item', 'Clothing', 'item.clothing.footwear', null],
  [9, 'Gloves', 'item', 'Clothing', 'item.clothing.gloves', null],
  [10, 'Hats', 'item', 'Clothing', 'item.clothing.hats', null],
  [11, 'Jackets', 'item', 'Clothing', 'item.clothing.jackets', null],
  [12, 'Jumpsuits', 'item', 'Clothing', 'item.clothing', null],
  [13, 'Legwear', 'item', 'Clothing', 'item.clothing.legwear', null],
  [14, 'Shirts', 'item', 'Clothing', 'item.clothing.shirts', null],
  [15, 'Full Set', 'item', 'Clothing', 'item.clothing', null],
  [
    16,
    'Consumables',
    'item',
    'Miscellaneous',
    'item.miscellaneous.food-drink',
    null,
  ],
  [
    17,
    'Attachments',
    'item',
    'Personal Weapons',
    'item.miscellaneous.attachments',
    null,
  ],
  [
    18,
    'Personal Weapons',
    'item',
    'Personal Weapons',
    'item.personal-weapons',
    null,
  ],
  [19, 'Coolers', 'item', 'Systems', 'item.ship-components', null],
  [20, 'Liveries', 'item', 'Liveries', 'item.liveries', null],
  [21, 'Power Plants', 'item', 'Systems', 'item.ship-components', null],
  [22, 'Quantum Drives', 'item', 'Systems', 'item.propulsion', null],
  [23, 'Shield Generators', 'item', 'Systems', 'item.ship-components', null],
  [24, 'Undersuits', 'item', 'Undersuits', 'item.undersuits', null],
  [25, 'Docking Collars', 'item', 'Utility', 'item.utility', null],
  [26, 'External Fuel Tanks', 'item', 'Utility', 'item.utility', null],
  [27, 'Fuel Nozzle', 'item', 'Utility', 'item.utility', null],
  [28, 'Gadgets', 'item', 'Utility', 'item.utility', null],
  [29, 'Mining Laser Heads', 'item', 'Utility', 'item.utility', null],
  [30, 'Mining Modules', 'item', 'Utility', 'item.utility', null],
  [31, 'Scraper Beams', 'item', 'Utility', 'item.utility', null],
  [32, 'Guns', 'item', 'Vehicle Weapons', 'item.vehicle-weapons', null],
  [
    33,
    'Missile Racks',
    'item',
    'Vehicle Weapons',
    'item.vehicle-weapons',
    null,
  ],
  [34, 'Missiles', 'item', 'Vehicle Weapons', 'item.vehicle-weapons', null],
  [35, 'Turrets', 'item', 'Vehicle Weapons', 'item.vehicle-weapons', null],
  [36, 'Commodities', 'item', 'Commodities', 'item.miscellaneous', null],
  [37, 'Points of Interest', 'item', 'Data', 'item.technology', null],
  [38, 'Other', 'item', 'Other', 'item.other', null],
  [
    39,
    'Trading',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    40,
    'Hauling',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    41,
    'Mining',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    42,
    'Refining',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    43,
    'Salvaging',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    44,
    'Medical',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    45,
    'Refueling',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    46,
    'Repairing',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    47,
    'Scanning',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    48,
    'Exploration',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    49,
    'Construction',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    50,
    'Private Pilot',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    51,
    'Racing',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    52,
    'Towing',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    53,
    'Security',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    54,
    'Gunner',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    55,
    'Mercenary',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    56,
    'Datarunning',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    57,
    'Science',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    58,
    'Mass Transit',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    59,
    'Tourism',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    60,
    'Other',
    'service',
    'Other',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [61, 'Miscellaneous', 'item', 'Miscellaneous', 'item.miscellaneous', null],
  [
    62,
    'Drinks',
    'item',
    'Miscellaneous',
    'item.miscellaneous.food-drink',
    null,
  ],
  [63, 'Foods', 'item', 'Miscellaneous', 'item.miscellaneous.food-drink', null],
  [64, 'Container', 'item', 'Utility', 'item.utility', null],
  [65, 'Container', 'item', 'Miscellaneous', 'item.miscellaneous', null],
  [67, 'Tractor Beams', 'item', 'Utility', 'item.utility.tractor-beams', null],
  [68, 'Eyeware', 'item', 'Clothing', 'item.clothing.eyewear', null],
  [
    69,
    'Consumable',
    'item',
    'Consumable',
    'item.miscellaneous.food-drink',
    null,
  ],
  [70, 'Bombs', 'item', 'Vehicle Weapons', 'item.vehicle-weapons', null],
  [
    71,
    'Engineering',
    'service',
    'General',
    'item.other',
    'UEX service category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [72, 'Dresses', 'item', 'Clothing', 'item.clothing', null],
  [73, 'Mobiglas', 'item', 'Technology', 'item.technology', null],
  [74, 'Module', 'item', 'Module', 'vehicle.addon-module', null],
  [75, 'Decorations', 'item', 'Decorations', 'item.decorations', null],
  [
    79,
    'Point Defense Cannon',
    'item',
    'Vehicle Weapons',
    'item.vehicle-weapons',
    null,
  ],
  [
    80,
    'Torpedo Tubes',
    'item',
    'Vehicle Weapons',
    'item.vehicle-weapons',
    null,
  ],
  [81, 'Batteries', 'item', 'Systems', 'item.ship-components', null],
  [82, 'Flight Blade', 'item', 'Avionics', 'item.avionics', null],
  [83, 'Radar', 'item', 'Avionics', 'item.avionics', null],
  [84, 'Gravity Generator', 'item', 'Systems', 'item.ship-components', null],
  [86, 'Jump Modules', 'item', 'Propulsion', 'item.propulsion', null],
  [87, 'Harvestables', 'item', 'Commodities', 'item.miscellaneous', null],
  [90, 'Bomb Racks', 'item', 'Vehicle Weapons', 'item.vehicle-weapons', null],
  [
    91,
    'Bounty Hunter',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    92,
    'ECN',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    93,
    'Delivery',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    94,
    'Hauling',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    95,
    'Service Beacon',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    96,
    'Maintenance',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    97,
    'Mercenary',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    98,
    'Racing',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    99,
    'Salvage',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    100,
    'Mining',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [
    101,
    'Other',
    'contract',
    'General',
    'item.other',
    'UEX contract category placeholder until non-inventory catalog kinds are modeled.',
  ],
  [102, 'Vehicles', 'item', 'Vehicles', 'vehicle.ship', null],
  [
    103,
    'Life Support Generator',
    'item',
    'Systems',
    'item.ship-components',
    null,
  ],
  [107, 'Surface', 'item', 'Flair', 'item.flair', null],
  [109, 'Fabricator', 'item', 'Utility', 'item.utility', null],
  [110, 'Salvage Beams', 'item', 'Utility', 'item.utility', null],
  [111, 'Cards', 'item', 'Data', 'item.technology', null],
  [112, 'Storage', 'item', 'Data', 'item.technology', null],
];

const UEX_COMMODITY_CATEGORY_SEEDS: UexCommodityCategorySeed[] = [
  [1, 'Agricium', 'Metal', 'commodity.metals'],
  [2, 'Agricium (Ore)', 'Metal', 'commodity.metals'],
  [3, 'Agricultural Supplies', 'Agricultural', 'commodity.agricultural'],
  [4, 'Altruciatoxin', 'Drug', 'commodity.contraband'],
  [5, 'Aluminum', 'Metal', 'commodity.metals'],
  [6, 'Aluminum (Ore)', 'Metal', 'commodity.metals'],
  [7, 'Amioshi Plague', 'Natural', 'commodity.agricultural'],
  [8, 'Aphorite', 'Mineral', 'commodity.minerals'],
  [9, 'Astatine', 'Halogen', 'commodity.minerals'],
  [10, 'Audio-Visual Equipment', 'Temporary', 'commodity.consumer-goods'],
  [11, 'Beryl', 'Mineral', 'commodity.minerals'],
  [12, 'Beryl (Raw)', 'Mineral', 'commodity.minerals'],
  [13, 'Bexalite', 'Mineral', 'commodity.minerals'],
  [14, 'Bexalite (Raw)', 'Mineral', 'commodity.minerals'],
  [15, 'Borase', 'Metal', 'commodity.metals'],
  [16, 'Borase (Ore)', 'Metal', 'commodity.metals'],
  [17, 'Chlorine', 'Halogen', 'commodity.minerals'],
  [18, 'Compboard', 'Scrap', 'commodity.industrial-materials'],
  [19, 'Construction Materials', 'Scrap', 'commodity.industrial-materials'],
  [20, 'Copper', 'Metal', 'commodity.metals'],
  [21, 'Copper (Ore)', 'Metal', 'commodity.metals'],
  [22, 'Corundum', 'Mineral', 'commodity.minerals'],
  [23, 'Corundum (Raw)', 'Mineral', 'commodity.minerals'],
  [24, 'Degnous Root', 'Natural', 'commodity.agricultural'],
  [25, 'Diamond', 'Metal', 'commodity.metals'],
  [26, 'Diamond (Raw)', 'Metal', 'commodity.metals'],
  [27, 'Distilled Spirits', 'Vice', 'commodity.contraband'],
  [28, 'Dolivine', 'Mineral', 'commodity.minerals'],
  [29, "E'tam", 'Drug', 'commodity.contraband'],
  [30, 'Fireworks', 'Temporary', 'commodity.consumer-goods'],
  [31, 'Fluorine', 'Halogen', 'commodity.minerals'],
  [32, 'Gasping Weevil Eggs', 'Natural', 'commodity.agricultural'],
  [33, 'Gold', 'Metal', 'commodity.metals'],
  [34, 'Gold (Ore)', 'Metal', 'commodity.metals'],
  [35, 'Golden Medmon', 'Natural', 'commodity.agricultural'],
  [36, 'Hadanite', 'Mineral', 'commodity.minerals'],
  [37, 'Heart of the Woods', 'Natural', 'commodity.agricultural'],
  [38, 'Helium', 'Gas', 'commodity.gases'],
  [39, 'Hephaestanite', 'Mineral', 'commodity.minerals'],
  [40, 'Hephaestanite (Raw)', 'Mineral', 'commodity.minerals'],
  [41, 'Hydrogen', 'Gas', 'commodity.gases'],
  [42, 'Inert Materials', 'Other', 'commodity.waste'],
  [43, 'Iodine', 'Halogen', 'commodity.minerals'],
  [44, 'Iron', 'Metal', 'commodity.metals'],
  [45, 'Iron (Ore)', 'Metal', 'commodity.metals'],
  [46, 'Janalite', 'Mineral', 'commodity.minerals'],
  [47, 'Laranite', 'Metal', 'commodity.metals'],
  [48, 'Laranite (Raw)', 'Metal', 'commodity.metals'],
  [49, 'Luminalia Gift', 'Temporary', 'commodity.consumer-goods'],
  [50, 'Maze', 'Drug', 'commodity.contraband'],
  [51, 'Medical Supplies', 'Medical', 'commodity.commodity-medical'],
  [52, 'Neon', 'Drug', 'commodity.contraband'],
  [53, 'Osoian Hides', 'Vice', 'commodity.contraband'],
  [54, 'Party Favors', 'Temporary', 'commodity.consumer-goods'],
  [55, 'Pitambu', 'Food', 'commodity.processed-food'],
  [56, 'Processed Food', 'Food', 'commodity.processed-food'],
  [57, 'Prota', 'Natural', 'commodity.agricultural'],
  [58, 'Quantainium', 'Mineral', 'commodity.minerals'],
  [59, 'Quantainium (Raw)', 'Mineral', 'commodity.minerals'],
  [60, 'Quartz', 'Metal', 'commodity.metals'],
  [61, 'Quartz (Raw)', 'Metal', 'commodity.metals'],
  [62, 'Ranta Dung', 'Agricultural', 'commodity.agricultural'],
  [
    63,
    'Recycled Material Composite',
    'Scrap',
    'commodity.industrial-materials',
  ],
  [64, 'Year of the Monkey Envelope', 'Temporary', 'commodity.consumer-goods'],
  [65, 'Revenant Pod', 'Natural', 'commodity.agricultural'],
  [66, 'Revenant Tree Pollen', 'Vice', 'commodity.contraband'],
  [67, 'Scrap', 'Scrap', 'commodity.waste'],
  [68, 'SLAM', 'Drug', 'commodity.contraband'],
  [69, 'Souvenirs', 'Temporary', 'commodity.consumer-goods'],
  [70, 'Stims', 'Vice', 'commodity.contraband'],
  [71, 'Stone Bug Shell', 'Natural', 'commodity.agricultural'],
  [72, 'Sunset Berries', 'Natural', 'commodity.agricultural'],
  [73, 'Taranite', 'Mineral', 'commodity.minerals'],
  [74, 'Taranite (Raw)', 'Mineral', 'commodity.minerals'],
  [75, 'Titanium', 'Metal', 'commodity.metals'],
  [76, 'Titanium (Ore)', 'Metal', 'commodity.metals'],
  [77, 'Tungsten', 'Metal', 'commodity.metals'],
  [78, 'Tungsten (Ore)', 'Metal', 'commodity.metals'],
  [79, 'Waste', 'Waste', 'commodity.waste'],
  [80, 'WiDoW', 'Drug', 'commodity.contraband'],
  [81, 'Year of the Rooster Envelope', 'Temporary', 'commodity.consumer-goods'],
  [82, 'AcryliPlex Composite', 'Man-made', 'commodity.industrial-materials'],
  [83, 'Diluthermex', 'Man-made', 'commodity.industrial-materials'],
  [84, 'Zeta-Prolanide', 'Man-made', 'commodity.industrial-materials'],
  [85, 'Ammonia', 'Raw Materials', 'commodity.chemicals'],
  [87, 'Quantum Fuel', 'Fuel', 'commodity.fuel'],
  [88, 'Year of the Dog Envelope', 'Temporary', 'commodity.consumer-goods'],
  [91, 'Marok Gem', 'Animal', 'commodity.agricultural'],
  [92, 'Kopion Horn', 'Medical', 'commodity.commodity-medical'],
  [93, 'DynaFlex', 'Man-Made', 'commodity.industrial-materials'],
  [
    95,
    'Redfin Energy Modulators',
    'Electronics',
    'commodity.industrial-materials',
  ],
  [96, 'LifeCure Medsticks', 'Medical', 'commodity.commodity-medical'],
  [97, 'Human Food Bars', 'Commodity', 'commodity.processed-food'],
  [98, 'DCSR2', 'Agricultural', 'commodity.agricultural'],
  [100, 'Silicon', 'Raw Materials', 'commodity.minerals'],
  [101, 'Pressurized Ice', 'Raw Materials', 'commodity.industrial-materials'],
  [102, 'Carbon', 'Raw Materials', 'commodity.industrial-materials'],
  [103, 'Tin', 'Metal', 'commodity.metals'],
  [104, 'Hydrogen Fuel', 'Fuel', 'commodity.fuel'],
  [105, 'Decari Pod', 'Natural', 'commodity.agricultural'],
  [106, 'Nitrogen', 'Gas', 'commodity.gases'],
  [108, 'Apoxygenite', 'Chemical', 'commodity.chemicals'],
  [109, 'Steel', 'Alloy', 'commodity.metals'],
  [110, 'Cobalt', 'Mineral', 'commodity.minerals'],
  [111, 'Argon', 'Gas', 'commodity.gases'],
  [112, 'Bioplastic', 'Man-made', 'commodity.industrial-materials'],
  [113, 'Carbon-Silk', 'Natural', 'commodity.agricultural'],
  [114, 'Methane', 'Gas', 'commodity.gases'],
  [115, 'Omnapoxy', 'Man-made', 'commodity.industrial-materials'],
  [116, 'Potassium', 'Mineral', 'commodity.minerals'],
  [118, "Xa'Pyen", 'Alloy', 'commodity.metals'],
  [119, 'Diamond Laminate', 'Man-made', 'commodity.industrial-materials'],
  [120, 'Fresh Food', 'Food', 'commodity.processed-food'],
  [121, 'Partillium', 'Gas', 'commodity.gases'],
  [122, 'Stileron', 'Mineral', 'commodity.minerals'],
  [123, 'Mercury', 'Metal', 'commodity.metals'],
  [124, 'Riccite', 'Metal', 'commodity.metals'],
  [125, 'Ice (Raw)', 'Liquid', 'commodity.minerals'],
  [126, 'CK13-GID Seed Blend', 'Seed', 'commodity.agricultural'],
  [127, 'Dymantium', 'Explosive', 'commodity.industrial-materials'],
  [128, 'Ship Ammunition', 'Ammunition', 'commodity.industrial-materials'],
  [129, 'HexaPolyMesh Coating', 'Crafting', 'commodity.industrial-materials'],
  [130, 'Atlasium', 'Metal', 'commodity.metals'],
  [132, 'ThermalFoam', 'Man-made', 'commodity.industrial-materials'],
  [133, 'Neograph', 'Man-made', 'commodity.industrial-materials'],
  [134, 'Sarilus', 'Man-made', 'commodity.industrial-materials'],
  [135, 'Silnex', 'Man-made', 'commodity.industrial-materials'],
  [136, 'Lycara', 'Man-made', 'commodity.industrial-materials'],
  [137, 'Lastaphrene', 'Man-made', 'commodity.industrial-materials'],
  [138, 'Elespo', 'Man-made', 'commodity.industrial-materials'],
  [139, 'Cadmium Allinide', 'Man-made', 'commodity.industrial-materials'],
  [140, 'Krypton', 'Gas', 'commodity.gases'],
  [141, 'Anti-Hydrogen', 'Gas', 'commodity.gases'],
  [142, 'Jahlium', 'Metal', 'commodity.metals'],
  [143, 'Magnesium', 'Metal', 'commodity.metals'],
  [144, 'Jumping Limes', 'Food', 'commodity.processed-food'],
  [145, 'Lunes', 'Food', 'commodity.processed-food'],
  [146, 'Arsenic', 'Non-Metal', 'commodity.minerals'],
  [147, 'Boron', 'Non-Metal', 'commodity.minerals'],
  [148, 'Coal', 'Non-Metal', 'commodity.minerals'],
  [149, 'Crude Oil', 'Non-Metal', 'commodity.minerals'],
  [150, 'Phosphorus', 'Non-Metal', 'commodity.minerals'],
  [151, 'Selenium', 'Non-Metal', 'commodity.minerals'],
  [152, 'Tellurium', 'Non-Metal', 'commodity.minerals'],
  [153, 'Tritium', 'Gas', 'commodity.gases'],
  [154, 'Xenon', 'Gas', 'commodity.gases'],
  [155, 'Dopple', 'Vice', 'commodity.contraband'],
  [156, 'Freeze', 'Vice', 'commodity.contraband'],
  [157, 'Glow', 'Vice', 'commodity.contraband'],
  [158, 'Mala', 'Vice', 'commodity.contraband'],
  [159, 'Thrust', 'Vice', 'commodity.contraband'],
  [160, 'Zip', 'Vice', 'commodity.contraband'],
  [161, 'Silicon (Raw)', 'Raw Materials', 'commodity.minerals'],
  [162, 'Stileron (Raw)', 'Man-made', 'commodity.industrial-materials'],
  [163, 'Riccite (Ore)', 'Metal', 'commodity.metals'],
  [164, 'Year of the Pig Envelope', 'Temporary', 'commodity.consumer-goods'],
  [165, 'Cobalt (Raw)', 'Mineral', 'commodity.minerals'],
  [166, 'Detatrine', 'Explosive', 'commodity.industrial-materials'],
  [167, 'Beradom', 'Mineral', 'commodity.minerals'],
  [168, 'Glacosite', 'Mineral', 'commodity.minerals'],
  [169, 'Feynmaline', 'Mineral', 'commodity.minerals'],
  [170, 'Carinite', 'Mineral', 'commodity.minerals'],
  [171, 'Jaclium', 'Mineral', 'commodity.minerals'],
  [172, 'Saldynium (Ore)', 'Mineral', 'commodity.minerals'],
  [173, 'Jaclium (Ore)', 'Mineral', 'commodity.minerals'],
  [174, 'Cave Kopion Horn', 'Medical', 'commodity.commodity-medical'],
  [175, 'Tundra Kopion Horn', 'Medical', 'commodity.commodity-medical'],
  [176, 'Tin (Ore)', 'Metal', 'commodity.metals'],
  [178, 'Carinite (Pure)', 'Mineral', 'commodity.minerals'],
  [179, 'Atacamite', 'Mineral', 'commodity.minerals'],
  [180, 'Irradiated Kopion Horn', 'Natural', 'commodity.commodity-medical'],
  [
    181,
    'Construction Material Rubble',
    'Scrap',
    'commodity.industrial-materials',
  ],
  [
    182,
    'Construction Material Pebbles',
    'Scrap',
    'commodity.industrial-materials',
  ],
  [
    183,
    'Construction Material Salvage',
    'Scrap',
    'commodity.industrial-materials',
  ],
  [184, 'Lindinium', 'Metal', 'commodity.metals'],
  [185, 'Lindinium (Ore)', 'Metal', 'commodity.metals'],
  [186, 'Organics', 'Organics', 'commodity.agricultural'],
  [187, 'Savrilium (Ore)', 'Metal', 'commodity.metals'],
  [188, 'Savrilium', 'Metal', 'commodity.metals'],
  [189, 'Torite (Ore)', 'Metal', 'commodity.metals'],
  [190, 'Torite', 'Metal', 'commodity.metals'],
  [191, 'CryoPod', 'Medical', 'commodity.commodity-medical'],
  [192, 'Year of the Rat Envelope', 'Temporary', 'commodity.consumer-goods'],
  [193, 'Aslarite', 'Mineral', 'commodity.minerals'],
  [194, 'Ouratite', 'Mineral', 'commodity.minerals'],
  [195, 'Molina Mold Treatment', 'Medicine', 'commodity.commodity-medical'],
  [
    196,
    'Molina Ventilation Filters',
    'Medicine',
    'commodity.commodity-medical',
  ],
  [197, 'Molina Mold Samples', 'Medicine', 'commodity.commodity-medical'],
  [198, 'Wuotan Seed', 'Organic', 'commodity.agricultural'],
  [199, 'Aslarite (Raw)', 'Mineral', 'commodity.minerals'],
  [200, 'Sadaryx', 'Mineral', 'commodity.minerals'],
  [
    201,
    'Ship Ammunition - Size 1',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    202,
    'Ship Ammunition - Size 2',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    203,
    'Ship Ammunition - Size 3',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    204,
    'Ship Ammunition - Size 4',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    205,
    'Ship Ammunition - Size 5',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    206,
    'Ship Ammunition - Size 6',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    207,
    'Ship Ammunition - Size 7',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    208,
    'Ship Decoy Countermeasures',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [
    209,
    'Ship Noise Countermeasures',
    'Ammunition',
    'commodity.industrial-materials',
  ],
  [210, 'Ouratite (Raw)', 'Mineral', 'commodity.minerals'],
  [212, 'Sadaryx (Raw)', 'Mineral', 'commodity.minerals'],
  [213, 'Caranite (Raw)', 'Mineral', 'commodity.minerals'],
  [214, 'Caranite', 'Mineral', 'commodity.minerals'],
  [215, 'Blue Bilva', 'Food', 'commodity.processed-food'],
];

export class AddCatalogCategoryMaps1780060000000 implements MigrationInterface {
  name = 'AddCatalogCategoryMaps1780060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);
    await queryRunner.query(`
      CREATE TABLE "station_uex_category_map" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "uex_category_id" INTEGER NOT NULL,
        "uex_category_name" VARCHAR(255) NOT NULL,
        "uex_category_type" VARCHAR(50) NULL,
        "uex_category_section" VARCHAR(100) NULL,
        "catalog_category_id" UUID NOT NULL,
        "notes" TEXT NULL,
        "is_locally_managed" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_station_uex_category_map_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_station_uex_category_map_uex_category_id" UNIQUE ("uex_category_id"),
        CONSTRAINT "fk_station_uex_category_map_catalog_category_id"
          FOREIGN KEY ("catalog_category_id")
          REFERENCES "station_catalog_category"("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_uex_category_map_catalog_category_id"
      ON "station_uex_category_map" ("catalog_category_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "uex_commodity_category_map" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "commodity_uex_id" INTEGER NOT NULL,
        "commodity_name" VARCHAR(255) NOT NULL,
        "commodity_kind" VARCHAR(100) NULL,
        "catalog_category_id" UUID NOT NULL,
        "notes" TEXT NULL,
        "is_locally_managed" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_uex_commodity_category_map_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_uex_commodity_category_map_commodity_uex_id" UNIQUE ("commodity_uex_id"),
        CONSTRAINT "fk_uex_commodity_category_map_catalog_category_id"
          FOREIGN KEY ("catalog_category_id")
          REFERENCES "station_catalog_category"("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodity_category_map_catalog_category_id"
      ON "uex_commodity_category_map" ("catalog_category_id")
    `);

    const categoryIdByPathRows = (await queryRunner.query(`
      SELECT id, path
      FROM "station_catalog_category"
    `)) as { id: string; path: string }[];
    const categoryIdByPath = new Map(
      categoryIdByPathRows.map((row) => [row.path, row.id]),
    );

    for (const [
      uexCategoryId,
      uexCategoryName,
      uexCategoryType,
      uexCategorySection,
      catalogCategoryPath,
      notes,
    ] of STATION_UEX_CATEGORY_SEEDS) {
      const catalogCategoryId = categoryIdByPath.get(catalogCategoryPath);
      if (!catalogCategoryId) {
        throw new Error(
          `Missing station_catalog_category path "${catalogCategoryPath}" for UEX category ${uexCategoryId}`,
        );
      }

      await queryRunner.query(
        `
          INSERT INTO "station_uex_category_map" (
            "id",
            "uex_category_id",
            "uex_category_name",
            "uex_category_type",
            "uex_category_section",
            "catalog_category_id",
            "notes",
            "is_locally_managed",
            "created_at",
            "updated_at"
          )
          VALUES (
            uuid_generate_v7(),
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            TRUE,
            NOW(),
            NOW()
          )
        `,
        [
          uexCategoryId,
          uexCategoryName,
          uexCategoryType,
          uexCategorySection,
          catalogCategoryId,
          notes,
        ],
      );
    }

    for (const [
      commodityUexId,
      commodityName,
      commodityKind,
      catalogCategoryPath,
    ] of UEX_COMMODITY_CATEGORY_SEEDS) {
      const catalogCategoryId = categoryIdByPath.get(catalogCategoryPath);
      if (!catalogCategoryId) {
        throw new Error(
          `Missing station_catalog_category path "${catalogCategoryPath}" for commodity ${commodityUexId}`,
        );
      }

      await queryRunner.query(
        `
          INSERT INTO "uex_commodity_category_map" (
            "id",
            "commodity_uex_id",
            "commodity_name",
            "commodity_kind",
            "catalog_category_id",
            "notes",
            "is_locally_managed",
            "created_at",
            "updated_at"
          )
          VALUES (
            uuid_generate_v7(),
            $1,
            $2,
            $3,
            $4,
            NULL,
            TRUE,
            NOW(),
            NOW()
          )
        `,
        [commodityUexId, commodityName, commodityKind, catalogCategoryId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS "uex_commodity_category_map" CASCADE',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "station_uex_category_map" CASCADE',
    );
  }

  private async ensureUuidV7Function(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "uuid_generate_v7"()
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        ts_hex TEXT;
        rand_hex TEXT;
        variant_nibble TEXT;
      BEGIN
        ts_hex := lpad(
          to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint),
          12,
          '0'
        );
        rand_hex := encode(gen_random_bytes(10), 'hex');
        variant_nibble := substr(
          '89ab',
          (get_byte(gen_random_bytes(1), 0) % 4) + 1,
          1
        );
        RETURN (
          substr(ts_hex, 1, 8) || '-' ||
          substr(ts_hex, 9, 4) || '-' ||
          '7' || substr(rand_hex, 1, 3) || '-' ||
          variant_nibble || substr(rand_hex, 4, 3) || '-' ||
          substr(rand_hex, 7, 12)
        )::uuid;
      END;
      $$
    `);
  }
}
