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
  // --- Bags & travel ---
  "Backpacks and shoulder bags": "bags-and-travel/backpacks/backpacks",
  "Belt bags": "bags-and-travel/sports-and-outdoor-bags/waist-and-cross-body-bags",
  "Gym bags": "bags-and-travel/sports-and-outdoor-bags/sports-and-gym-bags",
  "Cooler bags": "bags-and-travel/sports-and-outdoor-bags/cooler-bags",
  "Document bags, laptop bags": "bags-and-travel/business-bags/laptop-bags",
  "Waterproof bags": "bags-and-travel/sports-and-outdoor-bags/waterproof-bags",
  "Shopping bags, canvas bags": "bags-and-travel/shopping-bags/tote-bags",
  "Gift bags": "bags-and-travel/gift-bags/gift-bags",
  "Travel and sports bags": "bags-and-travel/travel-bags-and-trolleys/travel-bags",
  "Travel accessories": "bags-and-travel/travel-accessories/travel-accessories",
  "Cosmetic accessories": "bags-and-travel/travel-accessories/toiletry-bags",

  // --- Car accessories ---
  "Car accessories": "tools-and-keyrings/car-accessories/others",
  "Ice scrapers": "tools-and-keyrings/car-accessories/ice-scrapers",

  // --- Drink & lunchware ---
  "Bottles": "drink-and-lunchware/bottles/water-and-sports-bottles",
  "Mugs, cups, jugs": "drink-and-lunchware/mugs-and-tumblers/mugs-and-cups",
  "Drinking straws": "drink-and-lunchware/lunchware/straws",
  "Hip flasks": "drink-and-lunchware/bottles/hip-flasks",
  "Thermoses and thermos mugs": "drink-and-lunchware/bottles/vacuum-flasks",
  "Sets and drinking accessories": "drink-and-lunchware/glasses-hospitality/sets",
  "Snack and lunch boxes, food containers": "drink-and-lunchware/lunchware/lunch-boxes",

  // --- Technology ---
  "Earphones and headphones": "technology/speakers-and-earphones/earphones-tws",
  "Mobile accessories": "technology/phone-accessories/others",
  "Powerbanks": "technology/power-banks/multifunctional",
  "Speakers": "technology/speakers-and-earphones/speakers",
  "Pendrives": "technology/usb-flashdrives",
  "Wireless chargers": "technology/wireless-chargers/wireless-chargers",

  // --- Tools & keyrings ---
  "Keychains": "tools-and-keyrings/keyrings/basic-keyrings",
  "Security accessories": "tools-and-keyrings/reflective-items/reflective-items",
  "Flashlights": "tools-and-keyrings/tools-and-torches/torches",
  "Measuring tapes and foldig rules": "tools-and-keyrings/tools-and-torches/measuring-tapes",
  "Multitools": "tools-and-keyrings/tools-and-torches/multi-tools",
  "Pocket knives": "tools-and-keyrings/tools-and-torches/pocket-knives",

  // --- Outdoor & leisure ---
  "Barbecue, picnic and outdoor": "outdoor-and-leisure/barbecue",
  "Sports and fitness accessories": "outdoor-and-leisure/sport-and-health/fitness-and-yoga-accessories",
  "Beach sccessories": "outdoor-and-leisure/beach-items/beach-and-hammam-towels",
  "Sunglasses": "outdoor-and-leisure/sunglasses/sunglasses",
  "Bicycle accessories": "outdoor-and-leisure/sport-and-health/bicycle-accessories",

  // --- Office & writing ---
  "Calculators and clocks": "office-and-writing/desk-accessories/desk-and-wall-clocks",
  "Desktop accessories": "office-and-writing/desk-accessories/others",
  "Notebooks and folders": "office-and-writing/notebooks/hard-cover",
  "Glass trophies and paperweights": "office-and-writing/desk-accessories/trophies-awards-and-paper-weights",
  "Pencils and chalks": "office-and-writing/writing/pencils",
  "Highlighters": "office-and-writing/writing/highlighters",
  "Laser pointers": "office-and-writing/writing/accessories-and-cases",
  "Plastic pens": "office-and-writing/writing/ball-pens",
  "Eco-friendly pens": "office-and-writing/writing/inkless-pens",
  "Metal pens and writing instrument": "office-and-writing/writing/multifunctional-pens",
  "Touch pens": "office-and-writing/writing/stylus-pens",
  "Pen sets and pen holders": "office-and-writing/writing/gift-writing-sets",

  // --- Umbrellas & rainwear ---
  "Umbrellas": "umbrellas-and-rainwear/umbrellas",
  "Raincoats": "umbrellas-and-rainwear/rainwear",

  // --- Kitchen & accessories ---
  "Kitchen accessories": "kitchen-and-accessories/kitchenware/kitchen-utensils",
  "Knives and cutting boards": "kitchen-and-accessories/kitchenware/chef-s-knives",
  "Bottle opener, glass opener": "kitchen-and-accessories/kitchenware/bottle-openers-and-stoppers",
  "Wine, bar": "kitchen-and-accessories/gift-sets/wine-sets-and-accessories",

  // --- Home & wellness ---
  "Home accessories": "home-and-wellness/candles-and-fragrances/candles",

  // --- Clothing & wearables ---
  "T-Shirt": "clothing-and-wearables/textile-categories/t-shirts",
  "Polos": "clothing-and-wearables/textile-categories/polos",
  "Sweater": "clothing-and-wearables/textile-categories/sweaters",
  "Shirt": "clothing-and-wearables/textile-categories/shirts",
  "Jackets": "clothing-and-wearables/textile-categories/jackets",
  "Vests": "clothing-and-wearables/textile-categories/bodywarmers",
  "Softshell": "clothing-and-wearables/textile-categories/softshells",
  "Sportswear": "clothing-and-wearables/occasion-to-wear/sports-and-active-wear",
  "Accessories": "clothing-and-wearables/textile-categories/textile-accessories",
  "Towel": "home-and-wellness/towels-and-blankets/towels",
  "Workwears and safety accessories": "clothing-and-wearables/occasion-to-wear/corporate-and-workwear",
  "Polar": "clothing-and-wearables/textile-categories/sweaters",
  "Long sleeve t-shirt": "clothing-and-wearables/textile-categories/t-shirts",
  "Workwears vests": "clothing-and-wearables/occasion-to-wear/corporate-and-workwear",
  "Workwears jackets": "clothing-and-wearables/occasion-to-wear/corporate-and-workwear",
  "CAPS": "clothing-and-wearables/textile-categories/textile-accessories",
  "Eco-friendly bags": "bags-and-travel/shopping-bags/tote-bags",
  "Baseballcaps": "clothing-and-wearables/textile-categories/textile-accessories",
  "Baseball caps": "clothing-and-wearables/textile-categories/textile-accessories",
  "Workwears polo shirts": "clothing-and-wearables/occasion-to-wear/corporate-and-workwear",
  "Workwears sweatshirts": "clothing-and-wearables/occasion-to-wear/corporate-and-workwear",
  "Cloaks": "clothing-and-wearables/textile-categories/jackets",
  "Overalls": "clothing-and-wearables/occasion-to-wear/corporate-and-workwear",
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
