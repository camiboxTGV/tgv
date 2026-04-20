export interface CategoryNode {
  slug: string
  name: string
  description?: string
  accent?: string
  image?: string
  children?: CategoryNode[]
}

const GRADIENTS = [
  "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
  "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
  "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
  "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
  "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
  "linear-gradient(135deg, #FF6600 0%, #0F0F10 60%, #4D4D4D 100%)",
]

function leaf(name: string): CategoryNode {
  return { slug: toSlug(name), name }
}

function group(name: string, children: CategoryNode[], accent?: string, image?: string): CategoryNode {
  return { slug: toSlug(name), name, children, accent, image }
}

function toSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .replaceAll(/-{2,}/g, "-")
}

export const categoryTree: CategoryNode[] = [
  group("Clothing & wearables", [
    group("Textile categories", [
      leaf("Bodywarmers"),
      leaf("Jackets"),
      leaf("Polos"),
      leaf("Shirts"),
      leaf("Socks"),
      leaf("Softshells"),
      leaf("Sweaters"),
      leaf("T-shirts"),
      leaf("Textile Accessories"),
    ]),
    group("Occasion to wear", [
      leaf("Corporate & workwear"),
      leaf("Seasonal & special occasion"),
      leaf("Sports & active wear"),
    ]),
  ], GRADIENTS[0], "/Clothing %26 wearables.jpg"),

  group("Lanyards & events", [
    leaf("Badges & holders"),
    group("Lanyards", [
      leaf("Cord lanyards"),
      leaf("Silk screen lanyards"),
      leaf("Special lanyards"),
      leaf("Wrist & phone holders"),
    ]),
    leaf("Pins & buttons"),
    leaf("Sunglasses"),
    leaf("Wristbands"),
  ], GRADIENTS[1], "/Lanyards %26 events.jpg"),

  group("Umbrellas & rainwear", [
    leaf("Rainwear"),
    leaf("Umbrellas"),
  ], GRADIENTS[2], "/Umbrellas %26 rainwear.jpg"),

  group("Kitchen & accessories", [
    group("Gift sets", [
      leaf("Cheese sets"),
      leaf("Cocktail sets & accessories"),
      leaf("Wine sets & accessories"),
    ]),
    group("Home & hospitality textiles", [
      leaf("Aprons & gloves"),
      leaf("Kitchen & table linen"),
      leaf("Others"),
    ]),
    group("Kitchenware", [
      leaf("Boards"),
      leaf("Bottle openers & stoppers"),
      leaf("Chef's knives"),
      leaf("Coasters"),
      leaf("Kitchen utensils"),
      leaf("Others"),
    ]),
    leaf("Tea & coffee"),
  ], GRADIENTS[3], "/Kitchen %26 accessories.jpg"),

  group("Tools & keyrings", [
    group("Car accessories", [
      leaf("Car air fresheners"),
      leaf("Car blankets"),
      leaf("Car phone holders & chargers"),
      leaf("Ice scrapers"),
      leaf("Others"),
      leaf("Safety car tools"),
      leaf("Sunshades"),
    ]),
    group("Keyrings", [
      leaf("Basic keyrings"),
      leaf("Fabric keyrings"),
      leaf("Multifunctional keyrings"),
      leaf("Opener keyrings"),
      leaf("Reflective keyrings"),
      leaf("Smart key finders and alarms"),
      leaf("Token keyrings"),
      leaf("Torch keyrings"),
    ]),
    group("Reflective items", [
      leaf("Reflective items"),
      leaf("Safety vests"),
    ]),
    group("Tools & torches", [
      leaf("Dynamo & solar torches"),
      leaf("Measuring tapes"),
      leaf("Multi tools"),
      leaf("Pocket knives"),
      leaf("Tool sets & other tools"),
      leaf("Torches"),
    ]),
  ], GRADIENTS[4], "/Tools %26 keyrings.jpg"),

  group("Outdoor & leisure", [
    leaf("Barbecue"),
    group("Beach items", [
      leaf("Beach & hammam towels"),
      leaf("Beach games"),
    ]),
    group("Gardening", [
      leaf("Gardening tools"),
      leaf("Plants & seed items"),
    ]),
    leaf("Hammocks & chairs"),
    group("Outdoor events", [
      leaf("Hand fans"),
      leaf("Seat mat"),
    ]),
    leaf("Picnic & camping"),
    group("Sport & health", [
      leaf("Bicycle accessories"),
      leaf("Fitness & yoga accessories"),
      leaf("Football items"),
      leaf("Medals"),
      leaf("Multiscarves"),
      leaf("Reflectives"),
      leaf("Running & hiking accessories"),
      leaf("Smartphone pouches"),
      leaf("Sports towels"),
    ]),
    group("Sunglasses", [
      leaf("Cleaning cloths & cases"),
      leaf("Sunglasses"),
    ]),
  ], GRADIENTS[5], "/Outdoor %26 leisure.jpg"),

  group("Head & multiwear", [], GRADIENTS[6], "/Head %26 multiwear.jpg"),

  group("Technology", [
    leaf("AA/AAA batteries"),
    group("Phone accessories", [
      leaf("Cables"),
      leaf("Card holders"),
      leaf("Others"),
      leaf("Phone cords & straps"),
      leaf("Phone stands & holders"),
    ]),
    group("Power banks", [
      leaf("High capacity =8.000"),
      leaf("Low capacity =2.000"),
      leaf("Mid capacity =4.000"),
      leaf("Multifunctional"),
      leaf("Powerbank with wireless charging"),
      leaf("Solar"),
    ]),
    leaf("Smart finders"),
    leaf("Smartwatches"),
    group("Speakers & earphones", [
      leaf("Earphones/TWS"),
      leaf("Headphones"),
      leaf("Multifunctional speakers"),
      leaf("Speakers"),
    ]),
    leaf("USB flashdrives"),
    group("Wireless chargers", [
      leaf("Car chargers"),
      leaf("Magnetic chargers"),
      leaf("Multifunctional chargers"),
      leaf("Sets"),
      leaf("Wireless chargers"),
    ]),
  ], GRADIENTS[0], "/Technology.jpg"),

  group("Drink & lunchware", [
    group("Bottles", [
      leaf("Double wall bottles"),
      leaf("Glass bottles"),
      leaf("Hip flasks"),
      leaf("Smart bottles & sets"),
      leaf("Vacuum flasks"),
      leaf("Water & sports bottles"),
    ]),
    group("Ceramics", [
      leaf("Mugs"),
      leaf("Sets"),
    ]),
    group("Glasses hospitality", [
      leaf("Carafes"),
      leaf("Long glasses"),
      leaf("Sets"),
      leaf("Short glasses"),
      leaf("Shot glasses"),
      leaf("Tea & coffee glasses"),
      leaf("Wine glasses"),
    ]),
    group("Lunchware", [
      leaf("Cutlery"),
      leaf("Lunch boxes"),
      leaf("Straws"),
    ]),
    group("Mugs & tumblers", [
      leaf("Mugs & cups"),
      leaf("Tumblers double wall"),
      leaf("Tumblers single wall"),
    ]),
  ], GRADIENTS[1], "/Drink %26 lunchware.jpg"),

  group("Bags & travel", [
    group("Backpacks", [
      leaf("Backpacks"),
      leaf("Laptop backpacks"),
      leaf("Reflective bags"),
    ]),
    group("Business bags", [
      leaf("Business trolleys"),
      leaf("Document bags"),
      leaf("Laptop bags"),
      leaf("Laptop pouches"),
    ]),
    leaf("Drawstring bags"),
    group("Gift bags", [
      leaf("Gift bags"),
      leaf("Paper bags"),
    ]),
    group("Shopping bags", [
      leaf("Foldable bags"),
      leaf("Food bags"),
      leaf("Large shopping bags"),
      leaf("Tote bags"),
    ]),
    group("Sports & outdoor bags", [
      leaf("Beach bags"),
      leaf("Cooler bags"),
      leaf("Sports & gym bags"),
      leaf("Waist & cross body bags"),
      leaf("Waterproof bags"),
    ]),
    group("Travel accessories", [
      leaf("Adapters SKROSS"),
      leaf("Blankets & cushions"),
      leaf("Luggage tags"),
      leaf("Toiletry bags"),
      leaf("Travel accessories"),
      leaf("Wallets & RFID"),
    ]),
    group("Travel bags & trolleys", [
      leaf("Carry on trolleys"),
      leaf("Travel bags"),
    ]),
  ], GRADIENTS[2], "/Bags %26 travel.jpg"),

  group("Kids & games", [
    leaf("Baby & toddlers"),
    group("Indoor games", [
      leaf("Anti stress"),
      leaf("Brain teasers"),
      leaf("Card games"),
      leaf("Desk games"),
      leaf("Others"),
    ]),
    group("Outdoor games", [
      leaf("Inflatables"),
      leaf("Outdoor games"),
    ]),
    leaf("Stuffed animals"),
    group("Writing & colouring", [
      leaf("Art paints"),
      leaf("Colouring pencils"),
      leaf("Colouring sets"),
      leaf("Kids colouring bags"),
      leaf("Pencil cases & Accessories"),
    ]),
  ], GRADIENTS[3], "/Kids %26 games.jpg"),

  group("Seasonal gifts", [
    leaf("Candles & lights"),
    leaf("Decoration"),
    leaf("Drink & lunchware"),
    leaf("Others"),
    leaf("Wearables"),
  ], GRADIENTS[4], "/Seasonal gifts.jpg"),

  group("Home & wellness", [
    group("Candles & fragrances", [
      leaf("Candles"),
      leaf("Diffusers & scents"),
    ]),
    group("Cosmetics", [
      leaf("Lipbalms"),
      leaf("Sun lotions"),
    ]),
    leaf("Mints & sweets"),
    group("Personal care", [
      leaf("Bath accessories"),
      leaf("Care essentials"),
      leaf("Heat & cold pads"),
      leaf("Mirrors"),
      leaf("Nail kits"),
      leaf("Soaps & gels"),
      leaf("Toiletry & cosmetic bags"),
    ]),
    group("Towels & blankets", [
      leaf("Beach & hammam towels"),
      leaf("Blankets"),
      leaf("Sports towels"),
      leaf("Towels"),
    ]),
  ], GRADIENTS[5], "/Home %26 wellness.jpg"),

  group("Office & writing", [
    group("Computer accessories", [
      leaf("Hubs"),
      leaf("Phone stands & holders"),
    ]),
    group("Desk accessories", [
      leaf("Desk & wall clocks"),
      leaf("Desk lamps"),
      leaf("Mousepads & mouses"),
      leaf("Others"),
      leaf("Trophies (awards) & paper weights"),
      leaf("Weather stations"),
    ]),
    group("Notebooks", [
      leaf("Combi sets"),
      leaf("Hard cover"),
      leaf("Ringbound (spiral)"),
      leaf("Soft cover"),
    ]),
    group("Paper desk accessories", [
      leaf("Desk pads & calendars"),
      leaf("Memo pads & sticky notes"),
    ]),
    leaf("Phone accessories"),
    group("Portfolios", [
      leaf("Conference folders"),
      leaf("Smart folders"),
    ]),
    group("Writing", [
      leaf("Accessories & cases"),
      leaf("Ball pens"),
      leaf("Gift writing sets"),
      leaf("Highlighters"),
      leaf("Inkless pens"),
      leaf("Multifunctional pens"),
      leaf("Pencils"),
      leaf("Stylus pens"),
    ]),
  ], GRADIENTS[6], "/Office %26 writing.jpg"),
]

export interface FlatNode {
  path: string[]
  slugPath: string
  node: CategoryNode
  parent: CategoryNode | null
  depth: number
}

export function flattenTree(
  nodes: CategoryNode[] = categoryTree,
  parent: CategoryNode | null = null,
  trail: string[] = [],
): FlatNode[] {
  const out: FlatNode[] = []
  for (const n of nodes) {
    const path = [...trail, n.slug]
    out.push({ path, slugPath: path.join("/"), node: n, parent, depth: trail.length })
    if (n.children?.length) out.push(...flattenTree(n.children, n, path))
  }
  return out
}

export function findNode(segments: string[], tree: CategoryNode[] = categoryTree): CategoryNode | null {
  if (!segments.length) return null
  const [head, ...rest] = segments
  const match = tree.find((n) => n.slug === head)
  if (!match) return null
  if (!rest.length) return match
  return findNode(rest, match.children ?? [])
}

export function leafSlugPaths(tree: CategoryNode[] = categoryTree): string[][] {
  const out: string[][] = []
  for (const fn of flattenTree(tree)) {
    if (!fn.node.children?.length) out.push(fn.path)
  }
  return out
}

export function allSlugPaths(tree: CategoryNode[] = categoryTree): string[][] {
  return flattenTree(tree).map((f) => f.path)
}

export function joinPath(segments: string[]): string {
  return segments.join("/")
}

export function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean)
}

export function isLeaf(node: CategoryNode): boolean {
  return !node.children || node.children.length === 0
}

export function descendantLeafPaths(node: CategoryNode, trail: string[] = []): string[][] {
  const here = [...trail, node.slug]
  if (isLeaf(node) || !node.children) return [here]
  const out: string[][] = []
  for (const c of node.children) out.push(...descendantLeafPaths(c, here))
  return out
}

export function breadcrumbsFor(segments: string[]): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = []
  let cursor = categoryTree
  const trail: string[] = []
  for (const seg of segments) {
    const match = cursor.find((n) => n.slug === seg)
    if (!match) break
    trail.push(seg)
    out.push({ label: match.name, href: `/catalog/${trail.join("/")}` })
    cursor = match.children ?? []
  }
  return out
}
