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
  group("Accommodation & Travel", [
    leaf("Travel Accessories"),
    leaf("Travel Bags & Luggage"),
    leaf("Toiletry Bags"),
  ], GRADIENTS[0]),

  group("Apparel & Wearables", [
    leaf("T-shirts"),
    leaf("Polo Shirts"),
    leaf("Sweaters & Fleece"),
    leaf("Jackets & Bodywarmers"),
    group("Headwear", [
      leaf("Caps & Hats"),
      leaf("Beanies"),
      leaf("Visors"),
    ]),
    leaf("Socks"),
    leaf("Textile Accessories"),
    leaf("Workwear & Safety"),
    leaf("Sportswear & Activewear"),
    group("Fashion Apparel", [
      leaf("Shirts"),
      leaf("Pants"),
      leaf("Shorts"),
    ]),
    leaf("Seasonal Wearables"),
  ], GRADIENTS[1]),

  group("Bags", [
    group("Shopping Bags", [
      leaf("Cotton & Canvas"),
      leaf("Non-Woven Bags"),
      leaf("Foldable Bags"),
      leaf("Jute Bags"),
      leaf("RPET & Recycled Bags"),
    ]),
    group("Backpacks", [
      leaf("Standard Backpacks"),
      leaf("Laptop Backpacks"),
      leaf("Drawstring Bags"),
      leaf("Anti-theft Backpacks"),
      leaf("Urban Backpacks"),
    ]),
    group("Specialty Bags", [
      leaf("Cooler Bags"),
      leaf("Gym & Sports Bags"),
      leaf("Document & Laptop Bags"),
      leaf("Waterproof Bags"),
      leaf("Fanny Packs & Waist Bags"),
    ]),
    leaf("Gift Bags"),
    leaf("Travel Bags"),
  ], GRADIENTS[2]),

  group("Drinkware", [
    group("Bottles", [
      leaf("Water Bottles"),
      leaf("Thermal & Vacuum Flasks"),
      leaf("Hip Flasks"),
      leaf("Sport Bottles"),
    ]),
    group("Mugs & Cups", [
      leaf("Ceramic Mugs"),
      leaf("Glass Mugs"),
      leaf("Travel Tumblers"),
      leaf("Enamel Mugs"),
    ]),
    group("Bar & Wine Accessories", [
      leaf("Cocktail Sets"),
      leaf("Wine Sets"),
      leaf("Bottle Openers & Stoppers"),
      leaf("Coasters"),
      leaf("Reusable Straws"),
    ]),
  ], GRADIENTS[3]),

  group("Electronics", [
    group("Audio Devices", [
      leaf("Bluetooth Speakers"),
      leaf("Earphones & Headphones"),
    ]),
    group("Power & Charging", [
      leaf("Power Banks"),
      leaf("Wireless Chargers"),
      leaf("Charging Cables & Adapters"),
    ]),
    leaf("USB Flash Drives"),
    group("Computer & Mobile Accessories", [
      leaf("Phone Holders & Stands"),
      leaf("Computer Mice & Mousepads"),
      leaf("Webcam Covers"),
    ]),
    group("Smart Devices", [
      leaf("Smartwatches"),
      leaf("Smart Finders"),
    ]),
  ], GRADIENTS[4]),

  group("Home & Living", [
    group("Kitchen & Dining", [
      leaf("Lunch Boxes & Food Containers"),
      leaf("Kitchen Tools & Utensils"),
      leaf("Aprons & Gloves"),
      leaf("Cutting Boards"),
      leaf("Salt & Pepper Mills"),
    ]),
    group("Home Decor", [
      leaf("Candles & Fragrances"),
      leaf("Photo Frames"),
      leaf("Clocks & Weather Stations"),
      leaf("Money Boxes"),
    ]),
    group("Textiles", [
      leaf("Blankets"),
      leaf("Towels"),
    ]),
    group("Personal Care & Wellness", [
      leaf("Lip Balms"),
      leaf("Hand Sanitizers & Gels"),
      leaf("Mirrors"),
      leaf("Nail & Manicure Kits"),
      leaf("First Aid Kits"),
    ]),
    group("Seasonal & Event Items", [
      leaf("Christmas Decorations"),
      leaf("Summer & Beach Items"),
      leaf("Household Accessories"),
    ]),
  ], GRADIENTS[5]),

  group("Kids & Games", [
    group("Toys & Plush", [
      leaf("Stuffed Animals"),
      leaf("Outdoor & Indoor Games"),
    ]),
    group("Creative Play", [
      leaf("Drawing & Coloring Items"),
      leaf("Pencil Cases & Accessories"),
    ]),
  ], GRADIENTS[6]),

  group("Lanyards & Events", [
    leaf("Lanyards"),
    leaf("Badges & Holders"),
    leaf("Wristbands"),
    leaf("Pins & Buttons"),
    group("Event Accessories", [
      leaf("Flags & Banners"),
      leaf("Fans"),
    ]),
  ], GRADIENTS[0]),

  group("Office & Writing", [
    group("Writing Instruments", [
      leaf("Ball Pens"),
      leaf("Pencils"),
      leaf("Highlighters"),
      leaf("Stylus Pens"),
      leaf("Gift Sets"),
    ]),
    group("Notebooks & Planners", [
      leaf("Notebooks"),
      leaf("Diaries & Almanacs"),
    ]),
    group("Office Accessories", [
      leaf("Desk Accessories"),
      leaf("Mouse Pads"),
      leaf("Folders & Portfolios"),
      leaf("Calculators"),
      leaf("Trophies & Paperweights"),
      leaf("Business Card Holders"),
      leaf("Paper Cutters"),
    ]),
  ], GRADIENTS[1]),

  group("Outdoor & Leisure", [
    group("Outdoor Gear", [
      leaf("Barbecue & Picnic Items"),
      leaf("Camping Gear"),
      leaf("Tools & Torches"),
      leaf("Gardening Tools"),
    ]),
    group("Sports & Fitness", [
      leaf("Fitness & Yoga Accessories"),
      leaf("Cycling Accessories"),
      leaf("Football Items"),
      leaf("Sports Towels"),
      leaf("Running & Hiking Accessories"),
    ]),
    group("Travel & Beach", [
      leaf("Beach Items"),
      leaf("Sunglasses"),
    ]),
  ], GRADIENTS[2]),

  group("Tools & Keyrings", [
    group("Keyrings", [
      leaf("Basic Keyrings"),
      leaf("Multifunctional Keyrings"),
      leaf("Smart Key Finders"),
    ]),
    group("Tools", [
      leaf("Multi-tools"),
      leaf("Pocket Knives"),
      leaf("Measuring Tapes"),
      leaf("Flashlights & Torches"),
      leaf("Lighters"),
    ]),
    group("Car Accessories", [
      leaf("Ice Scrapers"),
      leaf("Car Air Fresheners"),
      leaf("Car Phone Holders"),
    ]),
  ], GRADIENTS[3]),

  group("Umbrellas & Rainwear", [
    group("Umbrellas", [
      leaf("Folding Umbrellas"),
      leaf("Golf Umbrellas"),
    ]),
    group("Rainwear", [
      leaf("Raincoats"),
    ]),
  ], GRADIENTS[4]),
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
