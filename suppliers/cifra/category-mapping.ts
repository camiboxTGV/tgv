const CATEGORY_SEPARATOR = "\u001f"

export interface CifraCategoryInput {
  parentCategory?: string | null
  category?: string | null
  name?: string | null
}

type CategoryRule = readonly [pattern: RegExp, leaf: string]

const CATEGORY_RULES: readonly CategoryRule[] = [
  [/air freshener|perfumer/, "tools-and-keyrings/car-accessories/car-air-fresheners"],
  [/car sunshade/, "tools-and-keyrings/car-accessories/car-sunshades"],
  [/phone holder/, "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  [/power bank/, "electronics/power-and-charging/power-banks"],
  [/wire|charger|charging adapter/, "electronics/power-and-charging/charging-cables-and-adapters"],
  [/earphone|headphone/, "electronics/audio-devices/earphones-and-headphones"],
  [/wireless speaker/, "electronics/audio-devices/bluetooth-speakers"],
  [/usb stock|usb flash/, "electronics/usb-flash-drives"],
  [/computer mouse|mouse pad|mousepad/, "electronics/computer-and-mobile-accessories/computer-mice-and-mousepads"],
  [/webcam protector/, "electronics/computer-and-mobile-accessories/webcam-covers"],
  [/tripod|phone glasses|ring of light|wifi amplifier/, "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  [/calculator/, "office-and-writing/office-accessories/calculators"],
  [/battery|energy timer/, "electronics/power-and-charging/charging-cables-and-adapters"],
  [/^electronics$/, "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],

  [/cooler backpack|cooler bag/, "bags/specialty-bags/cooler-bags"],
  [/sports bag|fanny pack/, "bags/specialty-bags/gym-and-sports-bags"],
  [/waterproof bag/, "bags/specialty-bags/waterproof-bags"],
  [/computer bag|briefcase|document bag/, "bags/specialty-bags/document-and-laptop-bags"],
  [/trolley|travel bag|travel item|suit bag/, "accommodation-and-travel/travel-bags-and-luggage"],
  [/watch case/, "accommodation-and-travel/travel-accessories"],
  [/toiletry|hotel y spa/, "accommodation-and-travel/toiletry-bags"],
  [/backpack/, "bags/backpacks/standard-backpacks"],
  [/non woven bag|polypropylene bag/, "bags/shopping-bags/non-woven-bags"],
  [/organic cotton|cotton bag|canvas cotton|recycled cotton|bolsa.*algodon/, "bags/shopping-bags/cotton-and-canvas"],
  [/rpet bag/, "bags/shopping-bags/rpet-and-recycled-bags"],
  [/jute bag/, "bags/shopping-bags/jute-bags"],
  [/foldable bag|bolsa plegable/, "bags/shopping-bags/foldable-bags"],
  [/paper bag|cardboard bag|organza bag|suede bag|gift bag|bags for bottles|presentation box|packaging eco/, "bags/gift-bags"],
  [/\bbags?\b/, "bags/shopping-bags/non-woven-bags"],

  [/beanie/, "apparel-and-wearables/headwear/beanies"],
  [/cap|hat|sombrero/, "apparel-and-wearables/headwear/caps-and-hats"],
  [/polo shirt/, "apparel-and-wearables/polo-shirts"],
  [/t-shirt|technical shirt|gym pants|technical flag shirt/, "apparel-and-wearables/t-shirts"],
  [/\bshirt\b/, "apparel-and-wearables/fashion-apparel/shirts"],
  [/sweather|sweater|polar panties/, "apparel-and-wearables/sweaters-and-fleece"],
  [/vest|triangle|emergenc|workwear/, "apparel-and-wearables/workwear-and-safety"],
  [/\bties?\b|\bscar(?:f|ves)\b|\bbelts?\b/, "apparel-and-wearables/textile-accessories"],
  [/\btextil|\btextile|\bcotton\b|\bpolyester\b/, "apparel-and-wearables/sportswear-and-activewear"],

  [/thermos|vacuum flask/, "drinkware/bottles/thermal-and-vacuum-flasks"],
  [/liquor flask/, "drinkware/bottles/hip-flasks"],
  [/bottle|drum/, "drinkware/bottles/water-bottles"],
  [/cup|jug|glass bottle/, "drinkware/mugs-and-cups/glass-mugs"],
  [/corkscrew|opener|vacuum stopper/, "drinkware/bar-and-wine-accessories/bottle-openers-and-stoppers"],
  [/wine accessories|cases, bottle racks/, "drinkware/bar-and-wine-accessories/wine-sets"],
  [/cocktail/, "drinkware/bar-and-wine-accessories/cocktail-sets"],

  [/diar|almanac|calendar/, "office-and-writing/notebooks-and-planners/diaries-and-almanacs"],
  [/notebook|recambios/, "office-and-writing/notebooks-and-planners/notebooks"],
  [/document holder|folder/, "office-and-writing/office-accessories/folders-and-portfolios"],
  [/card holder|wallet|purse|covers for cards/, "office-and-writing/office-accessories/business-card-holders"],
  [/catalog/, "office-and-writing/office-accessories/folders-and-portfolios"],
  [/pencil holder|office/, "office-and-writing/office-accessories/desk-accessories"],
  [/highlighter/, "office-and-writing/writing-instruments/highlighters"],
  [/pencil|marker|drawing|painting/, "office-and-writing/writing-instruments/pencils"],
  [/smartphone ball pen/, "office-and-writing/writing-instruments/stylus-pens"],
  [/pen|roller|writing/, "office-and-writing/writing-instruments/ball-pens"],

  [/lanyard/, "lanyards-and-events/lanyards"],
  [/magnet/, "lanyards-and-events/pins-and-buttons"],
  [/bracelet|wristband|identifier/, "lanyards-and-events/wristbands"],
  [/fan|paypay/, "lanyards-and-events/event-accessories/fans"],
  [/flag|banner|roll up|snapframe|tarp|exhibitor|pop up|technical pole/, "lanyards-and-events/event-accessories/flags-and-banners"],
  [/tent|tents and events/, "outdoor-and-leisure/outdoor-gear/camping-gear"],
  [/medal|troph|metop|paperweight|chrome tray|\bglass\b/, "office-and-writing/office-accessories/trophies-and-paperweights"],

  [/football/, "outdoor-and-leisure/sports-and-fitness/football-items"],
  [/bicycle/, "outdoor-and-leisure/sports-and-fitness/cycling-accessories"],
  [/sport/, "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories"],
  [/picnic/, "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items"],
  [/towel|pareo/, "home-and-living/textiles/towels"],
  [/count threads|magnifying/, "office-and-writing/office-accessories/desk-accessories"],
  [/glasses/, "outdoor-and-leisure/travel-and-beach/sunglasses"],
  [/rain|waterproof/, "umbrellas-and-rainwear/rainwear/raincoats"],

  [/pocketknive/, "tools-and-keyrings/tools/pocket-knives"],
  [/flashlight/, "tools-and-keyrings/tools/flashlights-and-torches"],
  [/lighter|ashtray/, "tools-and-keyrings/tools/lighters"],
  [/key.?ring|keychain/, "tools-and-keyrings/keyrings/basic-keyrings"],
  [/vehicle accessor|set/, "tools-and-keyrings/tools/multi-tools"],

  [/blanket/, "home-and-living/textiles/blankets"],
  [/apron|bib|ham cover/, "home-and-living/kitchen-and-dining/aprons-and-gloves"],
  [/air fryer|kitchen accessor/, "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  [/candle/, "home-and-living/home-decor/candles-and-fragrances"],
  [/photo frame|foldable photo/, "home-and-living/home-decor/photo-frames"],
  [/clock|weather station|lamp|humidifier/, "home-and-living/home-decor/clocks-and-weather-stations"],
  [/pharmacy|health|covid|pillbox|brush|antistress/, "home-and-living/personal-care-and-wellness/first-aid-kits"],

  [/tedd|doll/, "kids-and-games/toys-and-plush/stuffed-animals"],
  [/drawing|painting/, "kids-and-games/creative-play/drawing-and-coloring-items"],
  [/game|frisbee/, "kids-and-games/toys-and-plush/outdoor-and-indoor-games"],
  [/christmas/, "home-and-living/seasonal-and-event-items/christmas-decorations"],
  [/summer/, "home-and-living/seasonal-and-event-items/summer-and-beach-items"],
  [/^home$/, "home-and-living/seasonal-and-event-items/household-accessories"],
  [/articles for sublimation|accessories & details|^outlet$/, "seasonal-gifts"],
]

const PARENT_FALLBACKS: readonly CategoryRule[] = [
  [/writing/, "office-and-writing/writing-instruments/ball-pens"],
  [/diar|notebook/, "office-and-writing/notebooks-and-planners/notebooks"],
  [/bag|backpack/, "bags/backpacks/standard-backpacks"],
  [/bottle|thermos/, "drinkware/bottles/water-bottles"],
  [/electronic/, "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  [/textil/, "apparel-and-wearables/sportswear-and-activewear"],
  [/cap|hat/, "apparel-and-wearables/headwear/caps-and-hats"],
  [/home/, "home-and-living/seasonal-and-event-items/household-accessories"],
  [/watch|weather/, "home-and-living/home-decor/clocks-and-weather-stations"],
  [/health/, "home-and-living/personal-care-and-wellness/first-aid-kits"],
  [/wine/, "drinkware/bar-and-wine-accessories/wine-sets"],
  [/key/, "tools-and-keyrings/keyrings/basic-keyrings"],
  [/labor|tool|vehicle/, "tools-and-keyrings/tools/multi-tools"],
  [/winter|rain/, "umbrellas-and-rainwear/rainwear/raincoats"],
  [/event|party|summer/, "home-and-living/seasonal-and-event-items/summer-and-beach-items"],
  [/display/, "lanyards-and-events/event-accessories/flags-and-banners"],
  [/troph/, "office-and-writing/office-accessories/trophies-and-paperweights"],
  [/kid/, "kids-and-games/toys-and-plush/outdoor-and-indoor-games"],
  [/christmas/, "home-and-living/seasonal-and-event-items/christmas-decorations"],
  [/accessor|religious|pet|outlet|sublimation|catalog/, "seasonal-gifts"],
]

const NAME_FALLBACK_CATEGORIES = new Set([
  "",
  "accessories & details",
  "articles for sublimation",
  "bags",
  "bottles, drums and thermos",
  "caps & hats",
  "christmas",
  "electronics",
  "events, parties and summer",
  "health, grooming and pharmacy",
  "home",
  "key-rings",
  "kids and board games",
  "labor, tools and vehicle accessories",
  "outlet",
  "textile, casual and sport",
  "toiletry bags",
  "watches and weather stations",
  "wines & cocktails",
  "writing",
].map(normalize))

export function cifraCategoryKey(parentCategory: string, category: string): string {
  return `${normalize(parentCategory)}${CATEGORY_SEPARATOR}${normalize(category)}`
}

export function encodeCifraCategory(parentCategory: string, category: string): string {
  return `${parentCategory.trim()}${CATEGORY_SEPARATOR}${category.trim()}`
}

export function decodeCifraCategory(value: string): {
  parentCategory: string
  category: string
} {
  const [parentCategory = "", category = ""] = value.split(CATEGORY_SEPARATOR, 2)
  return { parentCategory, category }
}

export function mapCifraCategory(input: CifraCategoryInput): string | null {
  const parent = normalize(input.parentCategory ?? "")
  const category = normalize(input.category ?? "")
  const name = normalize(input.name ?? "")

  if (name && NAME_FALLBACK_CATEGORIES.has(category)) {
    for (const [pattern, leaf] of CATEGORY_RULES) {
      if (pattern.test(name)) return leaf
    }
  }
  for (const [pattern, leaf] of CATEGORY_RULES) {
    if (pattern.test(category)) return leaf
  }
  if (!category && name) {
    for (const [pattern, leaf] of CATEGORY_RULES) {
      if (pattern.test(name)) return leaf
    }
  }
  for (const [pattern, leaf] of PARENT_FALLBACKS) {
    if (pattern.test(parent)) return leaf
  }
  return null
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[’“”"']/g, "")
    .replace(/[^a-zA-Z0-9+&/ -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en")
}
