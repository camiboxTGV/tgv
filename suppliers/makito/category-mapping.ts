export interface MakitoCategoryContext {
  categories: readonly string[]
  name?: string
  material?: readonly string[]
}

interface EncodedMakitoCategory {
  categories: string[]
}

type CategoryRule = readonly [RegExp, string]

const CATEGORY_RULES: readonly CategoryRule[] = [
  [/\b(?:toiletry|cosmetic|wash) bags?\b/, "accommodation-and-travel/toiletry-bags"],
  [/\b(?:suitcase|trolley|luggage|travel bags?|duffel)\b/, "accommodation-and-travel/travel-bags-and-luggage"],
  [/\b(?:travel (?:accessor|set)|luggage tag|passport holder|travel pillow|sleep mask)\b/, "accommodation-and-travel/travel-accessories"],

  [/\b(?:t[ -]?shirts?|tee shirts?)\b/, "apparel-and-wearables/t-shirts"],
  [/\bpolo(?: shirts?)?\b/, "apparel-and-wearables/polo-shirts"],
  [/\b(?:sweatshirts?|hoodies?|fleece)\b/, "apparel-and-wearables/sweaters-and-fleece"],
  [/\b(?:jackets?|bodywarmers?|body warmers?|vests?|gilets?)\b/, "apparel-and-wearables/jackets-and-bodywarmers"],
  [/\b(?:caps?|hats?|bucket hats?)\b/, "apparel-and-wearables/headwear/caps-and-hats"],
  [/\bbeanies?\b/, "apparel-and-wearables/headwear/beanies"],
  [/\bvisors?\b/, "apparel-and-wearables/headwear/visors"],
  [/\bsocks?\b/, "apparel-and-wearables/socks"],
  [/\b(?:scarves?|scarfs?|gloves?|neck warmers?|bandanas?)\b/, "apparel-and-wearables/textile-accessories"],
  [/\b(?:workwear|safety (?:vest|jacket|clothing)|high visibility|reflective vest)\b/, "apparel-and-wearables/workwear-and-safety"],
  [/\b(?:sportswear|activewear|sports? shirts?|running shirts?)\b/, "apparel-and-wearables/sportswear-and-activewear"],
  [/\bshirts?\b/, "apparel-and-wearables/fashion-apparel/shirts"],
  [/\b(?:pants?|trousers?)\b/, "apparel-and-wearables/fashion-apparel/pants"],
  [/\bshorts?\b/, "apparel-and-wearables/fashion-apparel/shorts"],
  [/\b(?:ponchos?|seasonal wearables?)\b/, "apparel-and-wearables/seasonal-wearables"],

  [/\b(?:cooler|insulated|thermal|lunch) bags?\b/, "bags/specialty-bags/cooler-bags"],
  [/\b(?:drawstring|gym sack)\b/, "bags/backpacks/drawstring-bags"],
  [/\b(?:anti[ -]?theft|antitheft) backpacks?\b/, "bags/backpacks/anti-theft-backpacks"],
  [/\b(?:laptop|computer) backpacks?\b/, "bags/backpacks/laptop-backpacks"],
  [/\b(?:urban backpacks?|city backpacks?)\b/, "bags/backpacks/urban-backpacks"],
  [/\b(?:backpacks?|rucksacks?)\b/, "bags/backpacks/standard-backpacks"],
  [/\b(?:waist|bum|fanny|belt) bags?\b/, "bags/specialty-bags/fanny-packs-and-waist-bags"],
  [/\b(?:gym|sports?|shoe) bags?\b/, "bags/specialty-bags/gym-and-sports-bags"],
  [/\b(?:document|conference|business|laptop) bags?\b/, "bags/specialty-bags/document-and-laptop-bags"],
  [/\b(?:waterproof|dry) bags?\b/, "bags/specialty-bags/waterproof-bags"],
  [/\b(?:gift|paper) bags?\b/, "bags/gift-bags"],
  [/\bjute bags?\b/, "bags/shopping-bags/jute-bags"],
  [/\b(?:non[ -]?woven|polypropylene) bags?\b/, "bags/shopping-bags/non-woven-bags"],
  [/\b(?:foldable|folding)\b.{0,30}\bbags?\b/, "bags/shopping-bags/foldable-bags"],
  [/\b(?:rpet|recycled) (?:shopping |tote )?bags?\b/, "bags/shopping-bags/rpet-and-recycled-bags"],
  [/\b(?:cotton|canvas) (?:shopping |tote )?bags?\b/, "bags/shopping-bags/cotton-and-canvas"],
  [/\btravel bags?\b/, "bags/travel-bags"],

  [/\bhip flasks?\b/, "drinkware/bottles/hip-flasks"],
  [/\b(?:thermal|vacuum|insulated|thermos) (?:bottles?|flasks?)\b/, "drinkware/bottles/thermal-and-vacuum-flasks"],
  [/\bsports? bottles?\b/, "drinkware/bottles/sport-bottles"],
  [/\b(?:water|drinking) bottles?\b/, "drinkware/bottles/water-bottles"],
  [/\b(?:travel|thermal|insulated) (?:mugs?|tumblers?)\b/, "drinkware/mugs-and-cups/travel-tumblers"],
  [/\bglass (?:mugs?|cups?)\b/, "drinkware/mugs-and-cups/glass-mugs"],
  [/\benamel(?:led)? (?:mugs?|cups?)\b/, "drinkware/mugs-and-cups/enamel-mugs"],
  [/\b(?:ceramic|porcelain|stoneware) (?:mugs?|cups?)\b/, "drinkware/mugs-and-cups/ceramic-mugs"],
  [/\b(?:cocktail|bartender) sets?\b/, "drinkware/bar-and-wine-accessories/cocktail-sets"],
  [/\b(?:wine|sommelier) sets?\b/, "drinkware/bar-and-wine-accessories/wine-sets"],
  [/\b(?:bottle openers?|corkscrews?|bottle stoppers?)\b/, "drinkware/bar-and-wine-accessories/bottle-openers-and-stoppers"],
  [/\bcoasters?\b/, "drinkware/bar-and-wine-accessories/coasters"],
  [/\breusable straws?\b|\bdrinking straws?\b/, "drinkware/bar-and-wine-accessories/reusable-straws"],

  [/\b(?:bluetooth|wireless) speakers?\b/, "electronics/audio-devices/bluetooth-speakers"],
  [/\b(?:earphones?|earbuds?|headphones?|headsets?)\b/, "electronics/audio-devices/earphones-and-headphones"],
  [/\bpower ?banks?\b/, "electronics/power-and-charging/power-banks"],
  [/\bwireless chargers?|\binductive chargers?\b/, "electronics/power-and-charging/wireless-chargers"],
  [/\b(?:charging )?(?:cables?|adapters?|connectors?|hubs?)\b/, "electronics/power-and-charging/charging-cables-and-adapters"],
  [/\b(?:usb|flash) (?:drives?|memories?)\b/, "electronics/usb-flash-drives"],
  [/\b(?:phone|mobile|tablet) (?:holders?|stands?)\b/, "electronics/computer-and-mobile-accessories/phone-holders-and-stands"],
  [/\b(?:computer )?mice\b|\bmouse ?pads?\b/, "electronics/computer-and-mobile-accessories/computer-mice-and-mousepads"],
  [/\bwebcam covers?\b/, "electronics/computer-and-mobile-accessories/webcam-covers"],
  [/\b(?:smart ?watches?|fitness bracelets?)\b/, "electronics/smart-devices/smartwatches"],
  [/\b(?:smart finders?|item trackers?|bluetooth finders?)\b/, "electronics/smart-devices/smart-finders"],

  [/\b(?:lunch boxes?|food containers?)\b/, "home-and-living/kitchen-and-dining/lunch-boxes-and-food-containers"],
  [/\b(?:kitchen|cooking) (?:tools?|utensils?|sets?)\b/, "home-and-living/kitchen-and-dining/kitchen-tools-and-utensils"],
  [/\b(?:aprons?|oven (?:gloves?|mitts?))\b/, "home-and-living/kitchen-and-dining/aprons-and-gloves"],
  [/\b(?:cutting|chopping|cheese) boards?\b/, "home-and-living/kitchen-and-dining/cutting-boards"],
  [/\b(?:salt|pepper) (?:mills?|grinders?)\b/, "home-and-living/kitchen-and-dining/salt-and-pepper-mills"],
  [/\b(?:candles?|fragrance|diffusers?)\b/, "home-and-living/home-decor/candles-and-fragrances"],
  [/\b(?:photo|picture) frames?\b/, "home-and-living/home-decor/photo-frames"],
  [/\b(?:clocks?|weather stations?)\b/, "home-and-living/home-decor/clocks-and-weather-stations"],
  [/\b(?:money|coin) (?:boxes?|banks?)\b/, "home-and-living/home-decor/money-boxes"],
  [/\bblankets?\b/, "home-and-living/textiles/blankets"],
  [/\btowels?\b/, "home-and-living/textiles/towels"],
  [/\blip balms?\b/, "home-and-living/personal-care-and-wellness/lip-balms"],
  [/\b(?:sun care|sunscreen|sun lotion)\b/, "home-and-living/personal-care-and-wellness/sun-care"],
  [/\b(?:hand )?saniti[sz]ers?\b|\bhydroalcoholic gels?\b/, "home-and-living/personal-care-and-wellness/hand-sanitizers-and-gels"],
  [/\bmirrors?\b/, "home-and-living/personal-care-and-wellness/mirrors"],
  [/\b(?:nail|manicure) (?:kits?|sets?)\b/, "home-and-living/personal-care-and-wellness/nail-and-manicure-kits"],
  [/\bfirst aid kits?\b/, "home-and-living/personal-care-and-wellness/first-aid-kits"],
  [/\b(?:christmas|xmas) (?:decorations?|ornaments?)\b/, "home-and-living/seasonal-and-event-items/christmas-decorations"],
  [/\b(?:summer|beach) (?:accessories|items)\b/, "home-and-living/seasonal-and-event-items/summer-and-beach-items"],
  [/\b(?:household|home) accessories\b/, "home-and-living/seasonal-and-event-items/household-accessories"],

  [/\b(?:baby|toddler) (?:products?|items?|sets?)\b/, "kids-and-games/baby-and-toddler-products"],
  [/\b(?:plush|stuffed) (?:toys?|animals?)\b|\bteddy bears?\b/, "kids-and-games/toys-and-plush/stuffed-animals"],
  [/\b(?:toys?|games?|puzzles?)\b/, "kids-and-games/toys-and-plush/outdoor-and-indoor-games"],
  [/\b(?:drawing|colou?ring) (?:items?|sets?|books?)\b|\bcrayons?\b/, "kids-and-games/creative-play/drawing-and-coloring-items"],
  [/\bpencil cases?\b/, "kids-and-games/creative-play/pencil-cases-and-accessories"],

  [/\blanyards?\b/, "lanyards-and-events/lanyards"],
  [/\b(?:badges?|id holders?|credential holders?)\b/, "lanyards-and-events/badges-and-holders"],
  [/\bwristbands?\b/, "lanyards-and-events/wristbands"],
  [/\b(?:pins?|buttons?)\b/, "lanyards-and-events/pins-and-buttons"],
  [/\b(?:flags?|banners?)\b/, "lanyards-and-events/event-accessories/flags-and-banners"],
  [/\bfans?\b/, "lanyards-and-events/event-accessories/fans"],

  [/\bhighlighters?\b/, "office-and-writing/writing-instruments/highlighters"],
  [/\bstylus pens?\b|\btouch pens?\b/, "office-and-writing/writing-instruments/stylus-pens"],
  [/\bpencil sets?\b|\bpencils?\b/, "office-and-writing/writing-instruments/pencils"],
  [/\b(?:pen|writing) sets?\b/, "office-and-writing/writing-instruments/gift-sets"],
  [/\b(?:ball ?pens?|roller pens?|writing instruments?)\b|\bpens?\b/, "office-and-writing/writing-instruments/ball-pens"],
  [/\b(?:diaries|diary|agendas?|almanacs?|planners?)\b/, "office-and-writing/notebooks-and-planners/diaries-and-almanacs"],
  [/\b(?:notebooks?|notepads?|memo pads?)\b/, "office-and-writing/notebooks-and-planners/notebooks"],
  [/\b(?:folders?|portfolios?|document holders?)\b/, "office-and-writing/office-accessories/folders-and-portfolios"],
  [/\bbusiness card holders?\b/, "office-and-writing/office-accessories/business-card-holders"],
  [/\bcalculators?\b/, "office-and-writing/office-accessories/calculators"],
  [/\b(?:trophies|awards?|paperweights?)\b/, "office-and-writing/office-accessories/trophies-and-paperweights"],
  [/\bpaper cutters?\b/, "office-and-writing/office-accessories/paper-cutters"],
  [/\b(?:desk|office) accessories\b/, "office-and-writing/office-accessories/desk-accessories"],

  [/\b(?:barbecues?|bbq|picnic) (?:items?|sets?|accessories)\b/, "outdoor-and-leisure/outdoor-gear/barbecue-and-picnic-items"],
  [/\b(?:camping|outdoor) (?:gear|sets?|accessories)\b/, "outdoor-and-leisure/outdoor-gear/camping-gear"],
  [/\bgardening (?:tools?|sets?)\b/, "outdoor-and-leisure/outdoor-gear/gardening-tools"],
  [/\b(?:fitness|gym|yoga) (?:accessories|sets?|items?)\b/, "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories"],
  [/\b(?:cycling|bicycle|bike) (?:accessories|sets?|items?)\b/, "outdoor-and-leisure/sports-and-fitness/cycling-accessories"],
  [/\bfootball (?:items?|accessories|sets?)\b/, "outdoor-and-leisure/sports-and-fitness/football-items"],
  [/\bsports? towels?\b/, "outdoor-and-leisure/sports-and-fitness/sports-towels"],
  [/\b(?:running|hiking) (?:accessories|sets?|items?)\b/, "outdoor-and-leisure/sports-and-fitness/running-and-hiking-accessories"],
  [/\b(?:beach items?|beach accessories)\b/, "outdoor-and-leisure/travel-and-beach/beach-items"],
  [/\bsunglasses?\b/, "outdoor-and-leisure/travel-and-beach/sunglasses"],

  [/\b(?:smart )?key finders?\b/, "tools-and-keyrings/keyrings/smart-key-finders"],
  [/\bmultifunction(?:al)? keyrings?\b/, "tools-and-keyrings/keyrings/multifunctional-keyrings"],
  [/\b(?:keyrings?|keychains?)\b/, "tools-and-keyrings/keyrings/basic-keyrings"],
  [/\b(?:multi[ -]?tools?|tool sets?)\b/, "tools-and-keyrings/tools/multi-tools"],
  [/\b(?:pocket )?knives?\b/, "tools-and-keyrings/tools/pocket-knives"],
  [/\bmeasuring tapes?\b/, "tools-and-keyrings/tools/measuring-tapes"],
  [/\b(?:flashlights?|torches?)\b/, "tools-and-keyrings/tools/flashlights-and-torches"],
  [/\blighters?\b/, "tools-and-keyrings/tools/lighters"],
  [/\bice scrapers?\b/, "tools-and-keyrings/car-accessories/ice-scrapers"],
  [/\bcar air fresheners?\b/, "tools-and-keyrings/car-accessories/car-air-fresheners"],
  [/\bcar (?:phone|mobile) holders?\b/, "tools-and-keyrings/car-accessories/car-phone-holders"],
  [/\bcar (?:organizers?|accessories)\b/, "tools-and-keyrings/car-accessories/car-organizers-and-accessories"],
  [/\bcar sunshades?\b/, "tools-and-keyrings/car-accessories/car-sunshades"],
  [/\b(?:fire|emergency|thermal) blankets?\b/, "tools-and-keyrings/car-accessories/fire-and-emergency-blankets"],

  [/\bfolding umbrellas?\b/, "umbrellas-and-rainwear/umbrellas/folding-umbrellas"],
  [/\bgolf umbrellas?\b/, "umbrellas-and-rainwear/umbrellas/golf-umbrellas"],
  [/\bumbrellas?\b/, "umbrellas-and-rainwear/umbrellas/standard-umbrellas"],
  [/\b(?:raincoats?|rain ponchos?)\b/, "umbrellas-and-rainwear/rainwear/raincoats"],

  [/\b(?:seasonal|holiday) gifts?\b/, "seasonal-gifts"],
]

export function encodeMakitoCategories(categories: readonly string[]): string {
  return JSON.stringify({ categories: cleanCategories(categories) } satisfies EncodedMakitoCategory)
}

export function decodeMakitoCategories(value: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`makito product has an invalid category payload: ${value}`)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`makito product has an invalid category payload: ${value}`)
  }
  const categories = (parsed as Record<string, unknown>).categories
  if (!Array.isArray(categories) || categories.some((item) => typeof item !== "string")) {
    throw new Error(`makito product has an invalid category payload: ${value}`)
  }
  return cleanCategories(categories)
}

export function mapMakitoCategory(context: MakitoCategoryContext): string | null {
  const text = normalizeSearchText([
    ...context.categories,
    context.name ?? "",
    ...(context.material ?? []),
  ].join(" "))
  if (!text) return null
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(text)) return category
  }
  return null
}

function cleanCategories(categories: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of categories) {
    const value = raw.replace(/\s+/g, " ").trim()
    const key = value.toLocaleLowerCase("en")
    if (!value || seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
