import assert from "node:assert/strict"
import test from "node:test"
import {
  describeCifraPersonalizations,
  mapCifraTechnique,
} from "./personalization.ts"

function describe(code: string) {
  return describeCifraPersonalizations([code], new Map())[0]!
}

test("Cifra recognizes every observed embroidery spelling without offering an unsupported method", () => {
  for (const code of ["BORDA", "BORDAD", "BORDADO", "BORDADOF"]) {
    assert.deepEqual(mapCifraTechnique(code, ["Cotton"]), [])
    assert.deepEqual(describe(code), {
      code,
      label: "Embroidery",
      labelRo: "Broderie",
      printSizes: [],
      recognized: true,
    })
  }
})

test("Cifra maps observed digital misspellings to UV transfer", () => {
  for (const code of ["DIGITAL", "DGITAL", "DIGTAL", "DIIGTAL"]) {
    assert.deepEqual(mapCifraTechnique(code, []), ["uv-transfer"])
    assert.equal(describe(code).label, "Digital printing")
    assert.equal(describe(code).recognized, true)
  }
})

test("Cifra treats LC01 and LC02 as laser codes", () => {
  for (const code of ["LC01", "LC02"]) {
    assert.deepEqual(mapCifraTechnique(code, ["Steel"]), ["fiber-laser"])
    assert.deepEqual(mapCifraTechnique(code, ["Wood"]), ["co2"])
    assert.equal(describe(code).label, "Laser engraving")
  }
})

test("Cifra keeps observed generic codes but fails closed for unknown future codes", () => {
  for (const code of [
    "A",
    "A (PACK)",
    "C(CAJA)",
    "E*",
    "F(1COLOR)",
    "D_PACK_5",
    "G_D",
    "R4",
    "SERIGRAFIA",
    "SGP",
  ]) {
    assert.deepEqual(mapCifraTechnique(code, []), ["pad-screen"])
    assert.equal(describe(code).recognized, true)
  }

  for (const code of [
    "FUTURE",
    "FUTURE_CODE_99",
    "XYZ123",
    "A+A",
    "I_I",
    "B(VARILLA)",
  ]) {
    assert.deepEqual(mapCifraTechnique(code, []), [])
    assert.equal(describe(code).recognized, false)
  }
})
