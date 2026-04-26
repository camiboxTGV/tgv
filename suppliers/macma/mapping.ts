import type { Personalization } from "../../lib/content/catalog.ts"

/**
 * Macma `chapter` string → TGV leaf slug path.
 *
 * Maintained by hand from the user-supplied TGV-leaf → Macma-chapter map,
 * inverted and resolved to full slug paths that exist in
 * `lib/content/categories.ts`.
 *
 * When Macma emits a pipe-path chapter ("T-Shirt|Sportswear"), the adapter
 * walks progressively shorter prefixes until one matches this table. That's
 * how `T-Shirt|Sportswear|Children's clothing` collapses to `T-Shirt`.
 */
export const categoryMap: Record<string, string | null> = {
  // --- Bags ---
  "Backpacks and shoulder bags": "bags/backpacks/standard-backpacks",
  "Belt bags": "bags/specialty-bags/fanny-packs-and-waist-bags",
  "Gym bags": "bags/specialty-bags/gym-and-sports-bags",
  "Cooler bags": "bags/specialty-bags/cooler-bags",
  "Document bags, laptop bags": "bags/specialty-bags/document-and-laptop-bags",
  "Waterproof bags": "bags/specialty-bags/waterproof-bags",
  "Shopping bags, canvas bags": "bags/shopping-bags/cotton-and-canvas",
  "Eco-friendly bags": "bags/shopping-bags/rpet-and-recycled-bags",
  "Gift bags": "bags/gift-bags",

  // --- Accommodation & Travel ---
  "Travel and sports bags": "accommodation-and-travel/travel-bags-and-luggage",
  "Travel accessories": "accommodation-and-travel/travel-accessories",
  "Cosmetic accessories": "accommodation-and-travel/toiletry-bags",

  // --- Car accessories ---
  "Car accessories": "tools-and-keyrings/car-accessories/car-air-fresheners",
  "Ice scrapers": "tools-and-keyrings/car-accessories/ice-scrapers",

  // --- Drinkware ---
  "Bottles": "drinkware/bottles/water-bottles",
  "Mugs, cups, jugs": "drinkware/mugs-and-cups/ceramic-mugs",
  "Drinking straws": "drinkware/bar-and-wine-accessories/reusable-straws",
  "Hip flasks": "drinkware/bottles/hip-flasks",
  "Thermoses and thermos mugs": "drinkware/bottles/thermal-and-vacuum-flasks",
  "Sets and drinking accessories": "drinkware/bar-and-wine-accessories/cocktail-sets",
  "Bottle opener, glass opener": "drinkware/bar-and-wine-accessories/bottle-openers-and-stoppers",
  "Wine, bar": "drinkware/bar-and-wine-accessories/wine-sets",
  "Snack and lunch boxes, food containers": "home-and-living/kitchen-and-dining/lunch-boxes-and-food-containers",

  // --- Electronics ---
  "Earphones and headphones": "electronics/audio-devices/earphones-and-headphones",
  "Mobile accessories": "electronics/computer-and-mobile-accessories/phone-holders-and-stands",
  "Powerbanks": "electronics/power-and-charging/power-banks",
  "Speakers": "electronics/audio-devices/bluetooth-speakers",
  "Pendrives": "electronics/usb-flash-drives",
  "Wireless chargers": "electronics/power-and-charging/wireless-chargers",

  // --- Tools & Keyrings ---
  "Keychains": "tools-and-keyrings/keyrings/basic-keyrings",
  "Security accessories": "apparel-and-wearables/workwear-and-safety",
  "Flashlights": "tools-and-keyrings/tools/flashlights-and-torches",
  "Measuring tapes and foldig rules": "tools-and-keyrings/tools/measuring-tapes",
  "Multitools": "tools-and-keyrings/tools/multi-tools",
  "Pocket knives": "tools-and-keyrings/tools/pocket-knives",
  "Lighters": "tools-and-keyrings/tools/lighters",

  // --- Outdoor & Leisure ---
  "Barbecue, picnic and outdoor": "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items",
  "Sports and fitness accessories": "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories",
  "Beach sccessories": "outdoor-and-leisure/travel-and-beach/beach-items",
  "Sunglasses": "outdoor-and-leisure/travel-and-beach/sunglasses",
  "Bicycle accessories": "outdoor-and-leisure/sports-and-fitness/cycling-accessories",

  // --- Office & Writing ---
  "Calculators and clocks": "office-and-writing/office-accessories/calculators",
  "Desktop accessories": "office-and-writing/office-accessories/desk-accessories",
  "Notebooks and folders": "office-and-writing/notebooks-and-planners/notebooks",
  "Glass trophies and paperweights": "office-and-writing/office-accessories/trophies-and-paperweights",
  "Pencils and chalks": "office-and-writing/writing-instruments/pencils",
  "Highlighters": "office-and-writing/writing-instruments/highlighters",
  "Laser pointers": "office-and-writing/office-accessories/desk-accessories",
  "Plastic pens": "office-and-writing/writing-instruments/ball-pens",
  "Eco-friendly pens": "office-and-writing/writing-instruments/ball-pens",
  "Metal pens and writing instrument": "office-and-writing/writing-instruments/ball-pens",
  "Touch pens": "office-and-writing/writing-instruments/stylus-pens",
  "Pen sets and pen holders": "office-and-writing/writing-instruments/gift-sets",
  "Business card holders": "office-and-writing/office-accessories/business-card-holders",
  "Paper cutters": "office-and-writing/office-accessories/paper-cutters",

  // --- Umbrellas & Rainwear ---
  "Umbrellas": "umbrellas-and-rainwear/umbrellas/folding-umbrellas",
  "Raincoats": "umbrellas-and-rainwear/rainwear/raincoats",

  // --- Home & Living ---
  "Kitchen accessories": "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils",
  "Knives and cutting boards": "home-and-living/kitchen-and-dining/cutting-boards",
  "Salt and pepper mills": "home-and-living/kitchen-and-dining/salt-and-pepper-mills",
  "Money boxes": "home-and-living/home-decor/money-boxes",
  "Home accessories": "home-and-living/home-decor/candles-and-fragrances",
  "Towel": "home-and-living/textiles/towels",

  // --- Apparel & Wearables ---
  "T-Shirt": "apparel-and-wearables/t-shirts",
  "Long sleeve t-shirt": "apparel-and-wearables/t-shirts",
  "Polos": "apparel-and-wearables/polo-shirts",
  "Sweater": "apparel-and-wearables/sweaters-and-fleece",
  "Polar": "apparel-and-wearables/sweaters-and-fleece",
  "Shirt": "apparel-and-wearables/fashion-apparel/shirts",
  "Jackets": "apparel-and-wearables/jackets-and-bodywarmers",
  "Cloaks": "apparel-and-wearables/jackets-and-bodywarmers",
  "Vests": "apparel-and-wearables/jackets-and-bodywarmers",
  "Softshell": "apparel-and-wearables/jackets-and-bodywarmers",
  "Sportswear": "apparel-and-wearables/sportswear-and-activewear",
  "Accessories": "apparel-and-wearables/textile-accessories",
  "CAPS": "apparel-and-wearables/headwear/caps-and-hats",
  "Baseballcaps": "apparel-and-wearables/headwear/caps-and-hats",
  "Baseball caps": "apparel-and-wearables/headwear/caps-and-hats",
  "Workwears and safety accessories": "apparel-and-wearables/workwear-and-safety",
  "Workwears vests": "apparel-and-wearables/workwear-and-safety",
  "Workwears jackets": "apparel-and-wearables/workwear-and-safety",
  "Workwears polo shirts": "apparel-and-wearables/workwear-and-safety",
  "Workwears sweatshirts": "apparel-and-wearables/workwear-and-safety",
  "Overalls": "apparel-and-wearables/workwear-and-safety",
  "Pants": "apparel-and-wearables/fashion-apparel/pants",
  "Waist pants": "apparel-and-wearables/fashion-apparel/pants",
  "Pants|Shorts": "apparel-and-wearables/fashion-apparel/shorts",
  "Shorts": "apparel-and-wearables/fashion-apparel/shorts",

  // --- Kids & Games ---
  "Games": "kids-and-games/toys-and-plush/outdoor-and-indoor-games",
  "Games|Beach sccessories": "outdoor-and-leisure/travel-and-beach/beach-items",
}

/**
 * Macma `print.technology[]` code → TGV personalization(s).
 *
 * Rules:
 *  - Laser engraving codes (G*, CG*) default to "co2".
 *    The adapter re-routes to "fiber-laser" when material is metal.
 *  - Transfer/print codes map to "uv-print" / "uv-transfer".
 *  - Techniques TGV doesn't offer (embroidery DW/DC, sublimation SU) map to [].
 *  - Unknown codes are logged to sync-report.
 */
export const personalizationMap: Record<string, Personalization[]> = {
  // Laser / engraving
  "G1": ["co2"],
  "G2": ["co2"],
  "G3": ["co2"],
  "CG0": ["co2"],
  "CG1": ["co2"],
  "CG2": ["co2"],
  "CG3": ["co2"],

  // UV
  "UV": ["uv-print"],
  "UV-PL": ["uv-print"],

  // Transfers (digital + thermal)
  "DT": ["uv-transfer"],
  "T2": ["uv-transfer"],
  "T3": ["uv-transfer"],
  "T4": ["uv-transfer"],

  // Screen / digital print on textiles — closest TGV match is uv-print
  "S1": ["uv-print"],
  "S2": ["uv-print"],

  // Techniques TGV doesn't currently offer — intentionally empty, not unknown
  "DW": [],
  "DC": [],
  "SU": [],
}
