import assert from "node:assert/strict"
import test from "node:test"
import {
  describeXdConnectsPersonalizations,
  mapXdConnectsTechnique,
  xdConnectsPrintSize,
} from "./personalization.ts"
import type { XdConnectsRow } from "./types.ts"

function row(values: Partial<Record<keyof XdConnectsRow, string>>): XdConnectsRow {
  return values as XdConnectsRow
}

test("XD Connects preserves exact default codes, techniques, positions, and print sizes", () => {
  const methods = describeXdConnectsPersonalizations([
    row({
      PrintCodeDefault: "Screen Transfer OS",
      PrintTechniqueDefault: "Screen transfer",
      PrintPositionDefault: "item front",
      MaxPrintAreaDefault: "150 x 150 mm",
    }),
    row({
      PrintCodeDefault: "Screen Transfer OS",
      PrintTechniqueDefault: "Screen transfer",
      PrintPositionDefault: "item back",
      MaxPrintAreaDefault: "100 x 80 mm",
    }),
  ])

  assert.deepEqual(methods, [
    {
      code: "Screen Transfer OS",
      label: "Screen transfer",
      labelRo: "Transfer serigrafic",
      printSizes: ["100 × 80 mm · item back", "150 × 150 mm · item front"],
      recognized: true,
    },
  ])
})

test("XD Connects does not infer printability from populated price columns", () => {
  assert.deepEqual(
    describeXdConnectsPersonalizations([
      row({
        PrintCodeDefault: "",
        PrintTechniqueDefault: "",
        PrintPriceDefaultNet_Qty1: "11.19",
      }),
    ]),
    [],
  )
})

test("XD Connects maps only techniques supported by the TGV calculator", () => {
  assert.deepEqual(
    mapXdConnectsTechnique("Screen Transfer OS", "Screen transfer", ["Cotton"]),
    ["textile-transfer"],
  )
  assert.deepEqual(mapXdConnectsTechnique("Pad Print", "Pad print", ["Plastic"]), ["pad-screen"])
  assert.deepEqual(mapXdConnectsTechnique("CO2 Engraving 2", "CO2 Engraving", ["Wood"]), ["co2"])
  assert.deepEqual(mapXdConnectsTechnique("Laser Engraving 2", "Laser engraving", ["Aluminium"]), ["fiber-laser"])
  assert.deepEqual(mapXdConnectsTechnique("Laser Engraving 2", "Laser engraving", ["Bamboo"]), ["co2"])
  assert.deepEqual(mapXdConnectsTechnique("Digital round 360-2", "Digital print 360°", ["Steel"]), ["uv-print"])
  assert.deepEqual(mapXdConnectsTechnique("Doming", "Doming", ["Plastic"]), ["uv-transfer"])
  assert.deepEqual(mapXdConnectsTechnique("Embroidery", "Embroidery", ["Cotton"]), [])
})

test("XD Connects falls back to width and height when the combined area is absent", () => {
  assert.equal(
    xdConnectsPrintSize(row({
      MaxPrintAreaDefault: "",
      MaxPrintWidthDefaultMM: "45",
      MaxPrintHeightDefaultMM: "12",
      PrintPositionDefault: "clip",
    })),
    "45 × 12 mm · clip",
  )
})

test("unknown XD Connects methods stay visible and are marked unrecognized", () => {
  const [method] = describeXdConnectsPersonalizations([
    row({
      PrintCodeDefault: "Future Method",
      PrintTechniqueDefault: "Future process",
      MaxPrintAreaDefault: "20 x 20 mm",
      PrintPositionDefault: "item",
    }),
  ])
  assert.equal(method?.label, "XD Connects method Future Method")
  assert.equal(method?.recognized, false)
})
