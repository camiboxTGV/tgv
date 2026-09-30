import assert from "node:assert/strict"
import test from "node:test"
import type { RawProduct } from "../_shared/adapter.ts"
import {
  describeMakitoPersonalizations,
  mapMakitoPersonalizations,
} from "./personalization.ts"

function rawProduct(material: string[]): RawProduct {
  return {
    supplierId: "makito",
    supplierSku: "15246",
    supplierVariantIds: ["15246003000"],
    name: "Komir",
    supplierCategory: '{"categories":["Technology"]}',
    supplierPriceEur: 10,
    originalCurrency: "EUR",
    stock: 25,
    images: [
      "https://apis.makito.es/catalog/assets/15246/principal/5246-W.jpg",
    ],
    fetchedAt: "2026-09-30T00:00:00.000Z",
    material,
  }
}

test("Makito personalization keeps exact technique IDs, print areas, and limits", () => {
  const methods = describeMakitoPersonalizations([
    {
      id: "100111",
      description: "PAD PRINTING A",
      category: "Pad printing",
      technicalRange: "XTRIA",
      maximumColors: 4,
      printSizes: ["40 × 20 mm · A1", "40 × 20 mm · A1"],
    },
  ])
  assert.deepEqual(methods, [
    {
      code: "100111",
      label: "Pad printing",
      labelRo: "Tampografie",
      printSizes: ["40 × 20 mm · A1", "Up to 4 colours"],
      recognized: true,
    },
  ])

  const raw = rawProduct(["ABS", "Aluminium"])
  raw.supplierPersonalizations = methods
  assert.deepEqual(mapMakitoPersonalizations(raw), ["pad-screen"])
})

test("Makito laser mapping distinguishes metal and non-metal products", () => {
  const methods = describeMakitoPersonalizations([
    { id: "LASER", description: "Laser engraving" },
  ])
  const metal = rawProduct(["Stainless steel"])
  metal.supplierPersonalizations = methods
  assert.deepEqual(mapMakitoPersonalizations(metal), ["fiber-laser"])

  const wood = rawProduct(["Bamboo"])
  wood.supplierPersonalizations = methods
  assert.deepEqual(mapMakitoPersonalizations(wood), ["co2"])
})

test("unknown Makito techniques stay visible but do not enter calculator families", () => {
  const methods = describeMakitoPersonalizations([
    {
      id: "X-999",
      description: "Supplier-exclusive finish",
      printSizes: ["25 × 10 mm · Front"],
    },
  ])
  assert.deepEqual(methods, [
    {
      code: "X-999",
      label: "Supplier-exclusive finish",
      labelRo: "Metodă Makito X-999",
      printSizes: ["25 × 10 mm · Front"],
      recognized: false,
    },
  ])
  const raw = rawProduct(["Plastic"])
  raw.supplierPersonalizations = methods
  assert.deepEqual(mapMakitoPersonalizations(raw), [])
})
