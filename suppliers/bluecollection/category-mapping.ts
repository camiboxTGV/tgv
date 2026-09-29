export interface BlueCollectionCategoryTuple {
  categoryId: number | null
  category: string
  subcategoryId: number | null
  subcategory: string
}

export interface BlueCollectionCategoryContext extends BlueCollectionCategoryTuple {
  name?: string
  material?: readonly string[]
}

export const blueCollectionCategoryMap: Readonly<Record<string, string | null>> = {
  "1/80": "office-and-writing/notebooks-and-planners/notebooks",
  "1/81": "office-and-writing/office-accessories/desk-accessories",
  "1/82": "office-and-writing/writing-instruments/gift-sets",
  "1/83": "office-and-writing/office-accessories/business-card-holders",
  "1/84": "office-and-writing/office-accessories/folders-and-portfolios",
  "1/85": "electronics/computer-and-mobile-accessories/computer-mice-and-mousepads",
  "1/86": "office-and-writing/office-accessories/desk-accessories",
  "1/87": "office-and-writing/office-accessories/business-card-holders",
  "1/88": "office-and-writing/office-accessories/desk-accessories",
  "3/90": "office-and-writing/writing-instruments/ball-pens",
  "3/91": "office-and-writing/writing-instruments/ball-pens",
  "3/92": "office-and-writing/writing-instruments/ball-pens",
  "3/93": "office-and-writing/writing-instruments/stylus-pens",
  "3/94": "office-and-writing/writing-instruments/ball-pens",
  "3/95": "kids-and-games/creative-play/drawing-and-coloring-items",
  "3/96": "office-and-writing/writing-instruments/gift-sets",
  "3/97": "office-and-writing/writing-instruments/pencils",
  "3/98": "kids-and-games/creative-play/pencil-cases-and-accessories",
  "3/99": "office-and-writing/writing-instruments/ball-pens",
  "5/111": "drinkware/bottles/sport-bottles",
  "5/112": "drinkware/bottles/water-bottles",
  "5/113": "drinkware/mugs-and-cups/ceramic-mugs",
  "5/114": "drinkware/mugs-and-cups/travel-tumblers",
  "5/115": "drinkware/bottles/thermal-and-vacuum-flasks",
  "5/116": "drinkware/bottles/hip-flasks",
  "5/117": "drinkware/bar-and-wine-accessories/cocktail-sets",
  "5/118": "home-and-living/kitchen-and-dining/lunch-boxes-and-food-containers",
  "5/119": "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils",
  "5/120": "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items",
  "6/122": "tools-and-keyrings/tools/measuring-tapes",
  "6/123": "tools-and-keyrings/tools/flashlights-and-torches",
  "6/124": "apparel-and-wearables/workwear-and-safety",
  "6/125": "tools-and-keyrings/tools/multi-tools",
  "6/126": "tools-and-keyrings/tools/multi-tools",
  "6/127": "tools-and-keyrings/keyrings/basic-keyrings",
  "6/128": "accommodation-and-travel/travel-accessories",
  "6/129": "tools-and-keyrings/car-accessories/ice-scrapers",
  "7/153": "seasonal-gifts",
  "8/143": "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories",
  "8/144": "kids-and-games/toys-and-plush/outdoor-and-indoor-games",
  "8/145": "outdoor-and-leisure/sports-and-fitness/cycling-accessories",
  "8/146": "home-and-living/textiles/blankets",
  "8/147": null,
  "8/148": "accommodation-and-travel/travel-accessories",
  "8/149": "home-and-living/personal-care-and-wellness/first-aid-kits",
  "8/150": "kids-and-games/toys-and-plush/outdoor-and-indoor-games",
  "8/151": null,
  "9/131": "bags/shopping-bags/non-woven-bags",
  "9/132": "bags/specialty-bags/gym-and-sports-bags",
  "9/133": "bags/specialty-bags/document-and-laptop-bags",
  "9/134": "bags/specialty-bags/cooler-bags",
  "9/135": "bags/backpacks/drawstring-bags",
  "9/136": "bags/backpacks/standard-backpacks",
  "9/137": "accommodation-and-travel/toiletry-bags",
  "9/138": "office-and-writing/office-accessories/business-card-holders",
  "9/139": "bags/gift-bags",
  "9/140": "home-and-living/seasonal-and-event-items/household-accessories",
  "9/141": "umbrellas-and-rainwear/umbrellas/standard-umbrellas",
  "10/78": null,
  "11/100": "electronics/power-and-charging/power-banks",
  "11/101": "electronics/usb-flash-drives",
  "11/102": "electronics/audio-devices/bluetooth-speakers",
  "11/103": "electronics/audio-devices/earphones-and-headphones",
  "11/104": null,
  "11/105": "home-and-living/home-decor/clocks-and-weather-stations",
  "11/106": "home-and-living/home-decor/clocks-and-weather-stations",
  "11/107": "electronics/computer-and-mobile-accessories/phone-holders-and-stands",
  "11/108": "electronics/power-and-charging/charging-cables-and-adapters",
  "11/109": null,
  "12/154": null,
  "12/155": null,
}

export function encodeBlueCollectionCategory(tuple: BlueCollectionCategoryTuple): string {
  return JSON.stringify(tuple)
}

export function decodeBlueCollectionCategory(value: string): BlueCollectionCategoryTuple {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`bluecollection product has an invalid category tuple: ${value}`)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`bluecollection product has an invalid category tuple: ${value}`)
  }
  const record = parsed as Record<string, unknown>
  if (
    !nullableInteger(record.categoryId) ||
    !nullableInteger(record.subcategoryId) ||
    typeof record.category !== "string" ||
    typeof record.subcategory !== "string"
  ) {
    throw new Error(`bluecollection product has an invalid category tuple: ${value}`)
  }
  return {
    categoryId: record.categoryId,
    category: record.category.trim(),
    subcategoryId: record.subcategoryId,
    subcategory: record.subcategory.trim(),
  }
}

export function mapBlueCollectionCategory(
  context: BlueCollectionCategoryContext,
): string | null {
  const key = tupleKey(context.categoryId, context.subcategoryId)
  const fallback = blueCollectionCategoryMap[key]
  if (fallback === undefined) return null

  const text = normalize([context.name ?? "", ...(context.material ?? [])].join(" "))
  const has = (pattern: RegExp) => pattern.test(text)

  if (key === "1/85") {
    if (has(/\bwireless charger\b/)) return "electronics/power-and-charging/wireless-chargers"
    if (has(/\blaptop stand\b/)) return "electronics/computer-and-mobile-accessories/phone-holders-and-stands"
  }
  if (key === "1/86") {
    if (has(/\bcharger\b/)) return "electronics/power-and-charging/wireless-chargers"
    if (has(/\bspeaker\b/)) return "electronics/audio-devices/bluetooth-speakers"
    if (has(/\b(?:phone|mobile).{0,20}\b(?:stand|holder)\b|\b(?:stand|holder).{0,20}\b(?:phone|mobile)\b/)) {
      return "electronics/computer-and-mobile-accessories/phone-holders-and-stands"
    }
    if (has(/\bcalendar\b/)) return "office-and-writing/notebooks-and-planners/diaries-and-almanacs"
    if (has(/\bcoin bank\b/)) return "home-and-living/home-decor/money-boxes"
  }
  if (key === "1/87" && has(/\btravel wallet\b/)) {
    return "accommodation-and-travel/travel-accessories"
  }
  if (key === "1/88") {
    if (has(/\bid holder\b/)) return "lanyards-and-events/badges-and-holders"
    if (has(/\bwriting pad\b/)) return "office-and-writing/notebooks-and-planners/notebooks"
    if (has(/\bclip pad\b/)) return "office-and-writing/office-accessories/folders-and-portfolios"
  }
  if (["3/90", "3/91", "3/92"].includes(key) && has(/\btouch pen\b/)) {
    return "office-and-writing/writing-instruments/stylus-pens"
  }
  if (key === "3/94" && has(/\blaser pointer\b/)) {
    return "office-and-writing/office-accessories/desk-accessories"
  }
  if (key === "3/95") {
    if (has(/\bhighlighter\b/)) return "office-and-writing/writing-instruments/highlighters"
    if (has(/\bpencil case\b/)) return "kids-and-games/creative-play/pencil-cases-and-accessories"
  }
  if (key === "5/112" && has(/\b(?:vacuum|thermal|insulated)\b/)) {
    return "drinkware/bottles/thermal-and-vacuum-flasks"
  }
  if (key === "5/111" && has(/\b(?:vacuum|thermal|insulated)\b/)) {
    return "drinkware/bottles/thermal-and-vacuum-flasks"
  }
  if (key === "5/113") {
    if (has(/\bglass\b/)) return "drinkware/mugs-and-cups/glass-mugs"
    if (has(/\benamell?ed\b|\benamel\b/)) return "drinkware/mugs-and-cups/enamel-mugs"
    if (has(/\b(?:metal|steel|plastic|carabiner|two compartment)\b/)) {
      return "drinkware/mugs-and-cups/travel-tumblers"
    }
  }
  if (key === "5/117") {
    if (has(/\b(?:opener|stopper)\b/)) return "drinkware/bar-and-wine-accessories/bottle-openers-and-stoppers"
    if (has(/\bstraw\b/)) return "drinkware/bar-and-wine-accessories/reusable-straws"
    if (has(/\bwine\b/)) return "drinkware/bar-and-wine-accessories/wine-sets"
  }
  if (key === "5/119") {
    if (has(/\bapron\b/)) return "home-and-living/kitchen-and-dining/aprons-and-gloves"
    if (has(/\bcoaster\b/)) return "drinkware/bar-and-wine-accessories/coasters"
    if (has(/\b(?:salt|pepper|grinder)\b/)) return "home-and-living/kitchen-and-dining/salt-and-pepper-mills"
    if (has(/\bboard\b/)) return "home-and-living/kitchen-and-dining/cutting-boards"
  }
  if (key === "6/124") {
    if (has(/\b(?:flashlight|lamp)\b/)) return "tools-and-keyrings/tools/flashlights-and-torches"
    if (has(/\b(?:keychain|pendant)\b/)) return "tools-and-keyrings/keyrings/basic-keyrings"
    if (has(/\bluggage tag\b/)) return "accommodation-and-travel/travel-accessories"
    if (has(/\bdrawstring bag\b/)) return "bags/backpacks/drawstring-bags"
  }
  if (key === "6/125" && has(/\bknife\b/)) return "tools-and-keyrings/tools/pocket-knives"
  if (key === "6/126") {
    if (has(/\bgarden\b/)) return "outdoor-and-leisure/outdoor-gear/gardening-tools"
    if (has(/\bbicycle\b/)) return "outdoor-and-leisure/sports-and-fitness/cycling-accessories"
  }
  if (key === "6/127" && has(/\b(?:2 in 1|2 w 1|3 in 1|4 in 1|anti touch|hip flask|wine)\b/)) {
    return "tools-and-keyrings/keyrings/multifunctional-keyrings"
  }
  if (key === "6/128") {
    if (has(/\bskipass\b/)) return "lanyards-and-events/badges-and-holders"
    if (has(/\bpin\b/)) return "lanyards-and-events/pins-and-buttons"
    if (has(/\banti stress\b/)) return "home-and-living/personal-care-and-wellness/first-aid-kits"
    if (has(/\bkey organizer\b/)) return "tools-and-keyrings/keyrings/multifunctional-keyrings"
  }
  if (key === "7/153") {
    if (has(/\b(?:packing|gift wrap)\b/)) return "bags/gift-bags"
    if (has(/\bblanket\b/)) return "home-and-living/textiles/blankets"
    if (has(/\bsocks?\b/)) return "apparel-and-wearables/socks"
    if (has(/\bpendants?\b/)) return "home-and-living/seasonal-and-event-items/christmas-decorations"
    if (has(/\bhip flask\b/)) return "drinkware/bottles/hip-flasks"
    if (has(/\bcandle\b/)) return "home-and-living/home-decor/candles-and-fragrances"
  }
  if (key === "8/143") {
    if (has(/\btowel\b/)) return "outdoor-and-leisure/sports-and-fitness/sports-towels"
    if (has(/\barm.{0,15}phone holder\b/)) return "outdoor-and-leisure/sports-and-fitness/running-and-hiking-accessories"
    if (has(/\bneck tube\b/)) return "apparel-and-wearables/textile-accessories"
    if (has(/\bbeach\b/)) return "outdoor-and-leisure/travel-and-beach/beach-items"
    if (has(/\braincoat\b/)) return "umbrellas-and-rainwear/rainwear/raincoats"
    if (has(/\bfrisbee\b/)) return "kids-and-games/toys-and-plush/outdoor-and-indoor-games"
    if (has(/\bcap\b/)) return "apparel-and-wearables/headwear/caps-and-hats"
    if (has(/\bwaterproof case\b/)) return "bags/specialty-bags/waterproof-bags"
  }
  if (key === "8/146") {
    if (has(/\bhot water bottle\b/)) return "home-and-living/seasonal-and-event-items/household-accessories"
    if (has(/\b(?:picnic blanket|picnic mat|seat mat)\b/)) {
      return "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items"
    }
  }
  if (key === "8/149") {
    if (has(/\bsunglasses\b/)) return "outdoor-and-leisure/travel-and-beach/sunglasses"
    if (has(/\bthermal blanket\b/)) return "tools-and-keyrings/car-accessories/fire-and-emergency-blankets"
  }
  if (key === "8/150" && has(/\bcolou?r(?:ing)? book\b/)) {
    return "kids-and-games/creative-play/drawing-and-coloring-items"
  }
  if (key === "8/151") {
    if (has(/\bcandle\b/)) return "home-and-living/home-decor/candles-and-fragrances"
    if (has(/\bmirror\b/)) return "home-and-living/personal-care-and-wellness/mirrors"
    if (has(/\bhumidifier\b/)) return "home-and-living/home-decor/clocks-and-weather-stations"
  }
  if (key === "9/131") {
    if (has(/\b(?:thermal|cooler|lunch) bag\b/)) return "bags/specialty-bags/cooler-bags"
    if (has(/\bfold(?:ing|able)\b/)) return "bags/shopping-bags/foldable-bags"
    if (has(/\bpaper\b/)) return "bags/gift-bags"
    if (has(/\bjute\b/)) return "bags/shopping-bags/jute-bags"
    if (has(/\b(?:rpet|recycled felt)\b/)) return "bags/shopping-bags/rpet-and-recycled-bags"
    if (has(/\bcotton\b/)) return "bags/shopping-bags/cotton-and-canvas"
  }
  if (key === "9/132") {
    if (has(/\bwaterproof\b/)) return "bags/specialty-bags/waterproof-bags"
    if (has(/\b(?:hip|waist|bum) bag\b|\bpouch\b|\bshoulder case\b/)) {
      return "bags/specialty-bags/fanny-packs-and-waist-bags"
    }
    if (has(/\brucksack\b/)) return "bags/backpacks/standard-backpacks"
  }
  if (key === "9/136" && has(/\blaptop\b/)) return "bags/backpacks/laptop-backpacks"
  if (key === "9/141") {
    if (has(/\brain poncho\b/)) return "umbrellas-and-rainwear/rainwear/raincoats"
    if (has(/\bfold(?:ing|able)\b/)) return "umbrellas-and-rainwear/umbrellas/folding-umbrellas"
    if (has(/\bgolf\b/)) return "umbrellas-and-rainwear/umbrellas/golf-umbrellas"
  }
  if (key === "10/78") {
    if (has(/\b(?:sanitizer|sanitiser|gel)\b/)) return "home-and-living/personal-care-and-wellness/hand-sanitizers-and-gels"
    if (has(/\blip balm\b/)) return "home-and-living/personal-care-and-wellness/lip-balms"
    if (has(/\b(?:sun care|sunscreen|sun lotion)\b/)) return "home-and-living/personal-care-and-wellness/sun-care"
    if (has(/\bmirror\b/)) return "home-and-living/personal-care-and-wellness/mirrors"
    if (has(/\b(?:nail|manicure)\b/)) return "home-and-living/personal-care-and-wellness/nail-and-manicure-kits"
  }
  if (key === "11/106" && has(/\b(?:watch|fitness bracelet)\b/)) {
    return "electronics/smart-devices/smartwatches"
  }
  if (key === "11/104") {
    if (has(/\b(?:desk|office) lamp\b/)) {
      return "office-and-writing/office-accessories/desk-accessories"
    }
    if (has(/\b(?:usb light|flashlight|torch)\b/)) {
      return "tools-and-keyrings/tools/flashlights-and-torches"
    }
  }
  if (key === "11/107") {
    if (has(/\bcar phone holder\b/)) return "tools-and-keyrings/car-accessories/car-phone-holders"
    if (has(/\bphone wallet\b/)) return "office-and-writing/office-accessories/business-card-holders"
  }
  if (key === "11/108" && has(/\b(?:wireless|inductive)\b/)) {
    return "electronics/power-and-charging/wireless-chargers"
  }
  if (key === "11/109" && has(/\bfan\b/)) return "lanyards-and-events/event-accessories/fans"

  return fallback
}

export function tupleKey(categoryId: number | null, subcategoryId: number | null): string {
  return `${categoryId ?? ""}/${subcategoryId ?? ""}`
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function nullableInteger(value: unknown): value is number | null {
  return value === null || Number.isInteger(value)
}
