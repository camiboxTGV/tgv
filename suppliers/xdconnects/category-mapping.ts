/**
 * XD Connects MainCategory/SubCategory -> TGV product leaf mapping.
 *
 * Baseline snapshot source: combined English CSV feed, 2026-09-29.
 * Coverage: all 124 observed category pairs. Lookup is deliberately exact
 * after Unicode, case, and whitespace normalization: a new supplier tuple is
 * returned as null so the sync can place it in the review queue.
 */

export interface XdConnectsCategoryTuple {
  mainCategory: string
  subCategory: string
}

export interface XdConnectsCategoryInput extends XdConnectsCategoryTuple {
  name?: string
  material?: string | readonly string[]
}

const CATEGORY_KEY_SEPARATOR = "\u001f"

const REFINED_ONLY_CATEGORY_KEYS = new Set([
  xdConnectsCategoryLookupKey(
    "Phone & Tablet accessories",
    "Mobile Gadgets",
  ),
  xdConnectsCategoryLookupKey(
    "Phone & Tablet accessories",
    "Post-PC accessories",
  ),
  xdConnectsCategoryLookupKey(
    "Home & Living",
    "Wellness &Personal care",
  ),
  xdConnectsCategoryLookupKey("Bags & Travel", "Carry shopping bags"),
  xdConnectsCategoryLookupKey("Bags & Travel", "Carry beach bags"),
  xdConnectsCategoryLookupKey("Bags & Travel", "Crossbody bags"),
  xdConnectsCategoryLookupKey("Home & Living", "Bathrobes"),
  xdConnectsCategoryLookupKey("Home & Living", "Table accessories"),
  xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Hubs"),
  xdConnectsCategoryLookupKey("Tools & Torches", "Rulers & cutters"),
  xdConnectsCategoryLookupKey("Tools & Torches", "Tool sets"),
])

export function normalizeXdConnectsCategoryPart(value: string): string {
  return value.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en")
}

export function xdConnectsCategoryLookupKey(
  mainCategory: string,
  subCategory: string,
): string {
  return [mainCategory, subCategory]
    .map(normalizeXdConnectsCategoryPart)
    .join(CATEGORY_KEY_SEPARATOR)
}

const XD_CONNECTS_CATEGORY_ENTRIES: ReadonlyArray<readonly [string, string, string]> = [
  ["Audio", "Earbuds", "electronics/audio-devices/earphones-and-headphones"],
  ["Audio", "Headphones", "electronics/audio-devices/earphones-and-headphones"],
  ["Audio", "Speakers", "electronics/audio-devices/bluetooth-speakers"],
  ["Audio", "True wireless", "electronics/audio-devices/earphones-and-headphones"],

  ["Bags & Travel", "Anti-theft backpacks", "bags/backpacks/anti-theft-backpacks"],
  ["Bags & Travel", "Backpack trolleys", "accommodation-and-travel/travel-bags-and-luggage"],
  ["Bags & Travel", "Backpacks", "bags/backpacks/standard-backpacks"],
  ["Bags & Travel", "Backpacks outdoor/adventure", "bags/backpacks/standard-backpacks"],
  ["Bags & Travel", "Cardholders & Wallets", "accommodation-and-travel/travel-accessories"],
  ["Bags & Travel", "Carry beach bags", "bags/shopping-bags/cotton-and-canvas"],
  ["Bags & Travel", "Carry shopping bags", "bags/shopping-bags/cotton-and-canvas"],
  ["Bags & Travel", "Crossbody bags", "bags/specialty-bags/fanny-packs-and-waist-bags"],
  ["Bags & Travel", "Document exhibition bags", "bags/specialty-bags/document-and-laptop-bags"],
  ["Bags & Travel", "Drawstring bags", "bags/backpacks/drawstring-bags"],
  ["Bags & Travel", "Laptop backpacks", "bags/backpacks/laptop-backpacks"],
  ["Bags & Travel", "Laptop bags executive", "bags/specialty-bags/document-and-laptop-bags"],
  ["Bags & Travel", "Laptop sleeves", "bags/specialty-bags/document-and-laptop-bags"],
  ["Bags & Travel", "Sling bags", "bags/specialty-bags/fanny-packs-and-waist-bags"],
  ["Bags & Travel", "Travel Accessories", "accommodation-and-travel/travel-accessories"],
  ["Bags & Travel", "Travel garment bags", "accommodation-and-travel/travel-bags-and-luggage"],
  ["Bags & Travel", "Travel sets", "accommodation-and-travel/travel-accessories"],
  ["Bags & Travel", "Travel toiletry bags", "accommodation-and-travel/toiletry-bags"],
  ["Bags & Travel", "Trolley bags", "accommodation-and-travel/travel-bags-and-luggage"],
  ["Bags & Travel", "Weekend bags large", "accommodation-and-travel/travel-bags-and-luggage"],
  ["Bags & Travel", "Weekend duffle bags", "accommodation-and-travel/travel-bags-and-luggage"],
  ["Bags & Travel", "Weekend medium bags", "accommodation-and-travel/travel-bags-and-luggage"],
  ["Bags & Travel", "Weekend sport bags", "bags/specialty-bags/gym-and-sports-bags"],

  ["Car & Safety", "Bike accessories", "outdoor-and-leisure/sports-and-fitness/cycling-accessories"],
  ["Car & Safety", "Car accessories", "tools-and-keyrings/car-accessories/car-organizers-and-accessories"],
  ["Car & Safety", "First aid & Home safety", "home-and-living/personal-care-and-wellness/first-aid-kits"],

  ["Drinkware", "Ceramic mugs", "drinkware/mugs-and-cups/ceramic-mugs"],
  ["Drinkware", "Coffee mugs & tumblers", "drinkware/mugs-and-cups/travel-tumblers"],
  ["Drinkware", "Drinkware sets", "drinkware/bottles/water-bottles"],
  ["Drinkware", "Glass", "drinkware/mugs-and-cups/glass-mugs"],
  ["Drinkware", "Infuser bottles", "drinkware/bottles/water-bottles"],
  ["Drinkware", "Thermos flasks", "drinkware/bottles/thermal-and-vacuum-flasks"],
  ["Drinkware", "Water bottles", "drinkware/bottles/water-bottles"],

  ["Headwear", "5 panel caps", "apparel-and-wearables/headwear/caps-and-hats"],
  ["Headwear", "6 panel caps", "apparel-and-wearables/headwear/caps-and-hats"],
  ["Headwear", "Beanies", "apparel-and-wearables/headwear/beanies"],
  ["Headwear", "Hats", "apparel-and-wearables/headwear/caps-and-hats"],
  ["Headwear", "Scarves", "apparel-and-wearables/textile-accessories"],

  ["Healthy Living & Sport", "Activity Trackers", "electronics/smart-devices/smartwatches"],
  ["Healthy Living & Sport", "Sport accessories", "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories"],

  ["Home & Living", "Bathrobes", "home-and-living/textiles/towels"],
  ["Home & Living", "Bathroom textiles", "home-and-living/textiles/towels"],
  ["Home & Living", "Blankets", "home-and-living/textiles/blankets"],
  ["Home & Living", "Candles & Fragrance sticks", "home-and-living/home-decor/candles-and-fragrances"],
  ["Home & Living", "Coffee & Tea", "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  ["Home & Living", "Cutting sets", "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  ["Home & Living", "Games", "kids-and-games/toys-and-plush/outdoor-and-indoor-games"],
  ["Home & Living", "Interior", "home-and-living/seasonal-and-event-items/household-accessories"],
  ["Home & Living", "Kitchen accessories", "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  ["Home & Living", "Lunchboxes & Foodflasks", "home-and-living/kitchen-and-dining/lunch-boxes-and-food-containers"],
  ["Home & Living", "Table accessories", "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  ["Home & Living", "Tableware", "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  ["Home & Living", "Wellness &Personal care", "home-and-living/personal-care-and-wellness/first-aid-kits"],
  ["Home & Living", "Wine & Bar", "drinkware/bar-and-wine-accessories/wine-sets"],
  ["Home & Living", "interior & accessories", "home-and-living/seasonal-and-event-items/household-accessories"],

  ["Lanyards & Keychains", "Keychains", "tools-and-keyrings/keyrings/basic-keyrings"],

  ["Outdoor", "Adventure sets", "outdoor-and-leisure/outdoor-gear/camping-gear"],
  ["Outdoor", "Barbecue", "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items"],
  ["Outdoor", "Beach towels", "outdoor-and-leisure/sports-and-fitness/sports-towels"],
  ["Outdoor", "Cooler bags", "bags/specialty-bags/cooler-bags"],
  ["Outdoor", "Outdoor accessories", "outdoor-and-leisure/outdoor-gear/camping-gear"],
  ["Outdoor", "Outdoor games", "kids-and-games/toys-and-plush/outdoor-and-indoor-games"],
  ["Outdoor", "Picnic", "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items"],
  ["Outdoor", "Poncho's", "umbrellas-and-rainwear/rainwear/raincoats"],
  ["Outdoor", "Sport Accessoires", "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories"],
  ["Outdoor", "Sunglasses", "outdoor-and-leisure/travel-and-beach/sunglasses"],

  ["Phone & Tablet accessories", "Chargers", "electronics/power-and-charging/charging-cables-and-adapters"],
  ["Phone & Tablet accessories", "Connectors & Cables", "electronics/power-and-charging/charging-cables-and-adapters"],
  ["Phone & Tablet accessories", "Desk accessories", "office-and-writing/office-accessories/desk-accessories"],
  ["Phone & Tablet accessories", "FindMy-compatible products", "electronics/smart-devices/smart-finders"],
  ["Phone & Tablet accessories", "Gaming accessoires", "electronics/computer-and-mobile-accessories/computer-mice-and-mousepads"],
  ["Phone & Tablet accessories", "Holders & Casings", "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  ["Phone & Tablet accessories", "Hubs", "electronics/power-and-charging/charging-cables-and-adapters"],
  ["Phone & Tablet accessories", "Laserpointers & -presenters", "office-and-writing/office-accessories/desk-accessories"],
  ["Phone & Tablet accessories", "Mobile Gadgets", "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  ["Phone & Tablet accessories", "Post-PC accessories", "electronics/computer-and-mobile-accessories/computer-mice-and-mousepads"],
  ["Phone & Tablet accessories", "Powerbanks", "electronics/power-and-charging/power-banks"],
  ["Phone & Tablet accessories", "Smartwatches", "electronics/smart-devices/smartwatches"],
  ["Phone & Tablet accessories", "Stands", "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  ["Phone & Tablet accessories", "Travel adapters", "electronics/power-and-charging/charging-cables-and-adapters"],
  ["Phone & Tablet accessories", "Wireless charger", "electronics/power-and-charging/wireless-chargers"],

  ["Portfolios & Notebooks", "Notebooks basic", "office-and-writing/notebooks-and-planners/notebooks"],
  ["Portfolios & Notebooks", "Notebooks executive", "office-and-writing/notebooks-and-planners/notebooks"],
  ["Portfolios & Notebooks", "Portfolios", "office-and-writing/office-accessories/folders-and-portfolios"],
  ["Portfolios & Notebooks", "Portfolios deluxe", "office-and-writing/office-accessories/folders-and-portfolios"],
  ["Portfolios & Notebooks", "Portfolios with zipper", "office-and-writing/office-accessories/folders-and-portfolios"],

  ["Textile", "Kids Sweatshirts", "apparel-and-wearables/sweaters-and-fleece"],
  ["Textile", "Kids t-shirts", "apparel-and-wearables/t-shirts"],
  ["Textile", "Men bodywarmers", "apparel-and-wearables/jackets-and-bodywarmers"],
  ["Textile", "Men jackets", "apparel-and-wearables/jackets-and-bodywarmers"],
  ["Textile", "Unisex Fleece Jackets", "apparel-and-wearables/sweaters-and-fleece"],
  ["Textile", "Unisex Pants", "apparel-and-wearables/fashion-apparel/pants"],
  ["Textile", "Unisex Polos", "apparel-and-wearables/polo-shirts"],
  ["Textile", "Unisex Sweatshirts", "apparel-and-wearables/sweaters-and-fleece"],
  ["Textile", "Unisex T-Shirts", "apparel-and-wearables/t-shirts"],
  ["Textile", "Unisex fleece hoodies", "apparel-and-wearables/sweaters-and-fleece"],
  ["Textile", "Unisex jackets", "apparel-and-wearables/jackets-and-bodywarmers"],
  ["Textile", "Women bodywarmers", "apparel-and-wearables/jackets-and-bodywarmers"],
  ["Textile", "Women jackets", "apparel-and-wearables/jackets-and-bodywarmers"],
  ["Textile", "Women t-shirts", "apparel-and-wearables/t-shirts"],
  ["Textile", "women polos", "apparel-and-wearables/polo-shirts"],

  ["Tools & Torches", "Light", "tools-and-keyrings/tools/flashlights-and-torches"],
  ["Tools & Torches", "Measuring tapes", "tools-and-keyrings/tools/measuring-tapes"],
  ["Tools & Torches", "Multitools", "tools-and-keyrings/tools/multi-tools"],
  ["Tools & Torches", "Pocket knives", "tools-and-keyrings/tools/pocket-knives"],
  ["Tools & Torches", "Rulers & cutters", "office-and-writing/office-accessories/paper-cutters"],
  ["Tools & Torches", "Table lamp", "office-and-writing/office-accessories/desk-accessories"],
  ["Tools & Torches", "Tool gifts", "tools-and-keyrings/tools/multi-tools"],
  ["Tools & Torches", "Tool pens", "tools-and-keyrings/tools/multi-tools"],
  ["Tools & Torches", "Tool sets", "tools-and-keyrings/tools/multi-tools"],
  ["Tools & Torches", "Torches", "tools-and-keyrings/tools/flashlights-and-torches"],
  ["Tools & Torches", "Work light", "tools-and-keyrings/tools/flashlights-and-torches"],

  ["Umbrellas", "Foldable umbrellas", "umbrellas-and-rainwear/umbrellas/folding-umbrellas"],
  ["Umbrellas", "Golf umbrellas (> 23')", "umbrellas-and-rainwear/umbrellas/golf-umbrellas"],
  ["Umbrellas", "Standard umbrellas (≤ 23')", "umbrellas-and-rainwear/umbrellas/standard-umbrellas"],

  ["Writing Instruments", "Eco pens", "office-and-writing/writing-instruments/ball-pens"],
  ["Writing Instruments", "Metal pens", "office-and-writing/writing-instruments/ball-pens"],
  ["Writing Instruments", "Pen sets", "office-and-writing/writing-instruments/gift-sets"],
  ["Writing Instruments", "Pencils", "office-and-writing/writing-instruments/pencils"],
  ["Writing Instruments", "Plastic pens", "office-and-writing/writing-instruments/ball-pens"],
]

export const XD_CONNECTS_CATEGORY_MAP: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    XD_CONNECTS_CATEGORY_ENTRIES.map(([mainCategory, subCategory, leaf]) => [
      xdConnectsCategoryLookupKey(mainCategory, subCategory),
      leaf,
    ]),
  ),
)

export function encodeXdConnectsCategory(tuple: XdConnectsCategoryTuple): string
export function encodeXdConnectsCategory(mainCategory: string, subCategory: string): string
export function encodeXdConnectsCategory(
  tupleOrMainCategory: XdConnectsCategoryTuple | string,
  subCategory?: string,
): string {
  const tuple = typeof tupleOrMainCategory === "string"
    ? { mainCategory: tupleOrMainCategory, subCategory: subCategory ?? "" }
    : tupleOrMainCategory
  return JSON.stringify({
    mainCategory: tuple.mainCategory.trim(),
    subCategory: tuple.subCategory.trim(),
  })
}

export function decodeXdConnectsCategory(value: string): XdConnectsCategoryTuple {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`xdconnects product has an invalid category tuple: ${value}`)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`xdconnects product has an invalid category tuple: ${value}`)
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.mainCategory !== "string" || typeof record.subCategory !== "string") {
    throw new Error(`xdconnects product has an invalid category tuple: ${value}`)
  }
  return {
    mainCategory: record.mainCategory.trim(),
    subCategory: record.subCategory.trim(),
  }
}

export function mapXdConnectsCategory(input: XdConnectsCategoryInput): string | null {
  const key = xdConnectsCategoryLookupKey(input.mainCategory, input.subCategory)
  const fallback = XD_CONNECTS_CATEGORY_MAP[key]
  if (fallback === undefined) return null

  const material = typeof input.material === "string"
    ? input.material
    : (input.material ?? []).join(" ")
  const text = normalizeXdConnectsSearchText(`${input.name ?? ""} ${material}`)
  const has = (pattern: RegExp): boolean => pattern.test(text)

  if (
    key === xdConnectsCategoryLookupKey("Bags & Travel", "Carry shopping bags") ||
    key === xdConnectsCategoryLookupKey("Bags & Travel", "Carry beach bags")
  ) {
    if (has(/\bfold(?:ing|able)\b/)) return "bags/shopping-bags/foldable-bags"
    if (has(/\bjute\b/)) return "bags/shopping-bags/jute-bags"
    if (has(/\b(?:non woven|polypropylene)\b/)) return "bags/shopping-bags/non-woven-bags"
    if (has(/\b(?:rpet|recycled pet|recycled polyester|recycled canvas|recycled cotton|rcanvas)\b/)) {
      return "bags/shopping-bags/rpet-and-recycled-bags"
    }
    if (has(/\b(?:cotton|canvas)\b/)) return "bags/shopping-bags/cotton-and-canvas"
  }
  if (key === xdConnectsCategoryLookupKey("Bags & Travel", "Cardholders & Wallets")) {
    if (has(/\bbusiness card\b/)) {
      return "office-and-writing/office-accessories/business-card-holders"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Car & Safety", "Car accessories")) {
    if (has(/\b(?:phone|mobile).{0,20}\bholder\b|\bholder.{0,20}\b(?:phone|mobile)\b/)) {
      return "tools-and-keyrings/car-accessories/car-phone-holders"
    }
    if (has(/\bsun ?shade\b/)) return "tools-and-keyrings/car-accessories/car-sunshades"
    if (has(/\bair freshener\b/)) return "tools-and-keyrings/car-accessories/car-air-fresheners"
    if (has(/\bice scraper\b/)) return "tools-and-keyrings/car-accessories/ice-scrapers"
  }
  if (key === xdConnectsCategoryLookupKey("Car & Safety", "First aid & Home safety")) {
    if (has(/\b(?:fire|emergency|thermal) blanket\b/)) {
      return "tools-and-keyrings/car-accessories/fire-and-emergency-blankets"
    }
    if (has(/\b(?:protective|face) masks?\b/)) {
      return "apparel-and-wearables/workwear-and-safety"
    }
    if (has(/\bpersonal alarm\b/)) {
      return "tools-and-keyrings/keyrings/smart-key-finders"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Drinkware", "Coffee mugs & tumblers")) {
    if (has(/\b(?:glass|borosilicate)\b/)) return "drinkware/mugs-and-cups/glass-mugs"
    if (has(/\benamell?ed\b|\benamel\b/)) return "drinkware/mugs-and-cups/enamel-mugs"
    if (has(/\b(?:ceramic|porcelain|stoneware)\b/)) return "drinkware/mugs-and-cups/ceramic-mugs"
  }
  if (
    key === xdConnectsCategoryLookupKey("Drinkware", "Drinkware sets") ||
    key === xdConnectsCategoryLookupKey("Drinkware", "Water bottles")
  ) {
    if (has(/\b(?:glass|borosilicate)\b/)) return "drinkware/mugs-and-cups/glass-mugs"
    if (has(/\b(?:vacuum|thermal|thermos|insulated|double wall)\b/)) {
      return "drinkware/bottles/thermal-and-vacuum-flasks"
    }
    if (has(/\bsport\b/)) return "drinkware/bottles/sport-bottles"
  }
  if (key === xdConnectsCategoryLookupKey("Healthy Living & Sport", "Sport accessories")) {
    if (has(/\btowel\b/)) return "outdoor-and-leisure/sports-and-fitness/sports-towels"
    if (has(/\b(?:bike|bicycle|cycling)\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/cycling-accessories"
    }
    if (has(/\b(?:running|hiking)\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/running-and-hiking-accessories"
    }
    if (has(/\bfootball\b/)) return "outdoor-and-leisure/sports-and-fitness/football-items"
  }
  if (
    key === xdConnectsCategoryLookupKey("Home & Living", "Interior") ||
    key === xdConnectsCategoryLookupKey("Home & Living", "interior & accessories")
  ) {
    if (has(/\b(?:bed ?linen|bedding|duvet|bed sheet)\b/)) return null
    if (has(/\b(?:candle|fragrance|diffuser)\b/)) {
      return "home-and-living/home-decor/candles-and-fragrances"
    }
    if (has(/\b(?:clock|weather station)\b/)) {
      return "home-and-living/home-decor/clocks-and-weather-stations"
    }
    if (has(/\b(?:photo|picture) frame\b/)) return "home-and-living/home-decor/photo-frames"
    if (has(/\b(?:money|coin) (?:box|bank)\b/)) return "home-and-living/home-decor/money-boxes"
  }
  if (
    key === xdConnectsCategoryLookupKey("Home & Living", "Kitchen accessories") ||
    key === xdConnectsCategoryLookupKey("Home & Living", "Table accessories") ||
    key === xdConnectsCategoryLookupKey("Home & Living", "Cutting sets")
  ) {
    if (has(/\btablet stand\b/)) {
      return "electronics/computer-and-mobile-accessories/phone-holders-and-stands"
    }
    if (has(/\b(?:cutting|chopping|cheese) board\b/)) {
      return "home-and-living/kitchen-and-dining/cutting-boards"
    }
    if (has(/\b(?:apron|oven glove|oven mitt|kitchen glove)\b/)) {
      return "home-and-living/kitchen-and-dining/aprons-and-gloves"
    }
    if (has(/\b(?:salt|pepper).{0,15}\b(?:mill|grinder)\b|\bgrinder\b/)) {
      return "home-and-living/kitchen-and-dining/salt-and-pepper-mills"
    }
    if (has(/\bstraw\b/)) return "drinkware/bar-and-wine-accessories/reusable-straws"
    if (has(/\b(?:espresso|coffee).{0,20}\b(?:cup|mug)s?\b/)) {
      if (has(/\bglass\b/)) return "drinkware/mugs-and-cups/glass-mugs"
      if (has(/\b(?:ceramic|clay|porcelain|stoneware)\b/)) {
        return "drinkware/mugs-and-cups/ceramic-mugs"
      }
    }
    if (has(/\bcoaster\b/)) return "drinkware/bar-and-wine-accessories/coasters"
    if (has(/\b(?:bottle opener|stopper|corkscrew)\b/)) {
      return "drinkware/bar-and-wine-accessories/bottle-openers-and-stoppers"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Home & Living", "Wellness &Personal care")) {
    if (has(/\b(?:alarm clock|humidifier)\b/)) {
      return "home-and-living/home-decor/clocks-and-weather-stations"
    }
    if (has(/\bmassage gun\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories"
    }
    if (has(/\blip balm\b/)) return "home-and-living/personal-care-and-wellness/lip-balms"
    if (has(/\b(?:sun care|sunscreen|sun lotion)\b/)) {
      return "home-and-living/personal-care-and-wellness/sun-care"
    }
    if (has(/\b(?:sanitizer|sanitiser|hand gel)\b/)) {
      return "home-and-living/personal-care-and-wellness/hand-sanitizers-and-gels"
    }
    if (has(/\bmirror\b/)) return "home-and-living/personal-care-and-wellness/mirrors"
    if (has(/\b(?:nail|manicure)\b/)) {
      return "home-and-living/personal-care-and-wellness/nail-and-manicure-kits"
    }
    if (has(/\b(?:earplugs?|travel shaver)\b/)) {
      return "accommodation-and-travel/travel-accessories"
    }
    if (has(/\bscented sachet\b/)) {
      return "home-and-living/home-decor/candles-and-fragrances"
    }
    if (has(/\bwhite noise speaker\b/)) {
      return "electronics/audio-devices/bluetooth-speakers"
    }
    if (has(/\b(?:body (?:and hand )?care gift set|hand care gift set)\b/)) {
      return "home-and-living/seasonal-and-event-items/household-accessories"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Home & Living", "Wine & Bar")) {
    if (has(/\bcocktail\b/)) return "drinkware/bar-and-wine-accessories/cocktail-sets"
    if (has(/\b(?:opener|stopper|corkscrew)\b/)) {
      return "drinkware/bar-and-wine-accessories/bottle-openers-and-stoppers"
    }
    if (has(/\bcoaster\b/)) return "drinkware/bar-and-wine-accessories/coasters"
  }
  if (key === xdConnectsCategoryLookupKey("Lanyards & Keychains", "Keychains")) {
    if (has(/\b(?:find ?my|tracker|smart finder)\b/)) {
      return "tools-and-keyrings/keyrings/smart-key-finders"
    }
    if (has(/\b(?:multi ?tool|multifunction|bottle opener|torch)\b/)) {
      return "tools-and-keyrings/keyrings/multifunctional-keyrings"
    }
  }
  if (
    key === xdConnectsCategoryLookupKey("Outdoor", "Adventure sets") ||
    key === xdConnectsCategoryLookupKey("Outdoor", "Outdoor accessories")
  ) {
    if (has(/\bcooling towel\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/sports-towels"
    }
    if (has(/\bhand fan\b/)) return "lanyards-and-events/event-accessories/fans"
    if (has(/\bbeach chair\b/)) return "outdoor-and-leisure/travel-and-beach/beach-items"
    if (has(/\b(?:barbecue|bbq|picnic)\b/)) {
      return "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items"
    }
    if (has(/\b(?:garden|gardening)\b/)) return "outdoor-and-leisure/outdoor-gear/gardening-tools"
    if (has(/\b(?:torch|flashlight)\b/)) return "tools-and-keyrings/tools/flashlights-and-torches"
  }
  if (key === xdConnectsCategoryLookupKey("Outdoor", "Sport Accessoires")) {
    if (has(/\btowel\b/)) return "outdoor-and-leisure/sports-and-fitness/sports-towels"
    if (has(/\b(?:bike|bicycle|cycling)\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/cycling-accessories"
    }
    if (has(/\b(?:running|hiking)\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/running-and-hiking-accessories"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Chargers")) {
    if (has(/\bwireless\b/)) return "electronics/power-and-charging/wireless-chargers"
  }
  if (key === xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Desk accessories")) {
    if (has(/\b(?:clock|weather station)\b/)) {
      return "home-and-living/home-decor/clocks-and-weather-stations"
    }
    if (has(/\b(?:phone|mobile).{0,20}\b(?:stand|holder)\b/)) {
      return "electronics/computer-and-mobile-accessories/phone-holders-and-stands"
    }
    if (has(/\b(?:mouse|mousepad|mouse pad)\b/)) {
      return "electronics/computer-and-mobile-accessories/computer-mice-and-mousepads"
    }
    if (has(/\bwebcam cover\b/)) return "electronics/computer-and-mobile-accessories/webcam-covers"
  }
  if (
    key === xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Mobile Gadgets") ||
    key === xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Post-PC accessories")
  ) {
    if (has(/\bluggage scale\b/)) return "accommodation-and-travel/travel-accessories"
    if (has(/\b(?:camping light|portable air pump)\b/)) {
      return "outdoor-and-leisure/outdoor-gear/camping-gear"
    }
    if (has(/\bco detector\b|\buv c steriliser\b/)) {
      if (has(/\bwireless charg(?:er|ing)\b/)) {
        return "electronics/power-and-charging/wireless-chargers"
      }
      return "home-and-living/seasonal-and-event-items/household-accessories"
    }
    if (has(/\b(?:key finder|smart finder)\b/)) {
      return "tools-and-keyrings/keyrings/smart-key-finders"
    }
    if (has(/\bwaterproof.{0,20}\bphone pouch\b|\bphone pouch.{0,20}\bwaterproof\b/)) {
      return "bags/specialty-bags/waterproof-bags"
    }
    if (has(/\b(?:phone holder (?:lanyard|wristlet)|crossbody lanyard)\b/)) {
      return "lanyards-and-events/lanyards"
    }
    if (has(/\b(?:magnetic phone holder|phone wallet with stand)\b/)) {
      return "electronics/computer-and-mobile-accessories/phone-holders-and-stands"
    }
    if (has(/\bmagnetic phone card holder\b/)) {
      return "office-and-writing/office-accessories/business-card-holders"
    }
    if (has(/\bkeychain camera\b/)) {
      return "tools-and-keyrings/keyrings/multifunctional-keyrings"
    }
    if (has(/\b(?:emergency|personal) alarm\b|\bsos function\b/)) {
      return "tools-and-keyrings/keyrings/smart-key-finders"
    }
    if (has(/\b(?:portable|desk) fan\b/)) {
      return "lanyards-and-events/event-accessories/fans"
    }
    if (has(/\bpower ?bank\b/)) return "electronics/power-and-charging/power-banks"
    if (has(/\bwireless charg(?:er|ing)\b/)) return "electronics/power-and-charging/wireless-chargers"
    if (has(/\b(?:bluetooth|wireless).{0,20}\bspeaker\b|\bspeaker.{0,20}\b(?:bluetooth|wireless)\b/)) {
      return "electronics/audio-devices/bluetooth-speakers"
    }
    if (has(/\b(?:headphone|earphone|earbud)s?\b/)) {
      return "electronics/audio-devices/earphones-and-headphones"
    }
    if (has(/\bwebcam cover\b/)) return "electronics/computer-and-mobile-accessories/webcam-covers"
  }
  if (
    key === xdConnectsCategoryLookupKey(
      "Phone & Tablet accessories",
      "Laserpointers & -presenters",
    ) && has(/\b(?:stylus|4 in 1 pen)\b/)
  ) {
    return "office-and-writing/writing-instruments/stylus-pens"
  }
  if (key === xdConnectsCategoryLookupKey("Home & Living", "Coffee & Tea")) {
    if (has(/\b(?:ceramic|clay|porcelain|stoneware).{0,20}\bmug\b|\bmug\b.{0,20}\b(?:ceramic|clay|porcelain|stoneware)\b/)) {
      return "drinkware/mugs-and-cups/ceramic-mugs"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Tools & Torches", "Table lamp")) {
    if (has(/\blantern\b|\b(?:camping|outdoor|portable)\b.{0,20}\b(?:lamp|light)\b|\b(?:lamp|light)\b.{0,20}\b(?:camping|outdoor|portable)\b/)) {
      return "outdoor-and-leisure/outdoor-gear/camping-gear"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Car & Safety", "First aid & Home safety")) {
    if (has(/\bpersonal alarm\b/)) {
      return "tools-and-keyrings/keyrings/smart-key-finders"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Bags & Travel", "Crossbody bags")) {
    if (has(/\b(?:messenger|laptop)\b/)) {
      return "bags/specialty-bags/document-and-laptop-bags"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Tools & Torches", "Rulers & cutters")) {
    if (has(/\b(?:cutter|knife)\b/)) {
      return "office-and-writing/office-accessories/paper-cutters"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Tools & Torches", "Tool pens")) {
    if (has(/\b(?:graphite|infinity)\b/)) {
      return "office-and-writing/writing-instruments/pencils"
    }
    if (has(/\b(?:stylus|touch)\b/)) return "office-and-writing/writing-instruments/stylus-pens"
  }
  if (key === xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Holders & Casings")) {
    if (has(/\blaptop sleeve\b/)) {
      return "bags/specialty-bags/document-and-laptop-bags"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Tools & Torches", "Light")) {
    if (has(/\bbike light\b/)) {
      return "outdoor-and-leisure/sports-and-fitness/cycling-accessories"
    }
  }
  if (key === xdConnectsCategoryLookupKey("Home & Living", "Tableware")) {
    if (has(/\b(?:ceramic|clay|porcelain|stoneware)\b/)) return null
  }
  if (
    key === xdConnectsCategoryLookupKey("Writing Instruments", "Eco pens") ||
    key === xdConnectsCategoryLookupKey("Writing Instruments", "Metal pens") ||
    key === xdConnectsCategoryLookupKey("Writing Instruments", "Plastic pens")
  ) {
    if (has(/\b(?:stylus|touch)\b/)) return "office-and-writing/writing-instruments/stylus-pens"
  }

  return REFINED_ONLY_CATEGORY_KEYS.has(key) ? null : fallback
}

function normalizeXdConnectsSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()
    .replaceAll(/\s+/g, " ")
}
