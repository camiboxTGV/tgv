"use client"

import { useState } from "react"
import DecorationEstimator from "@/components/pricing/DecorationEstimator"

export default function StandalonePriceCalculator() {
  const [quantity, setQuantity] = useState(100)

  return (
    <DecorationEstimator
      methods={["uv-print", "co2", "fiber-laser", "pad-screen", "textile-transfer"]}
      quantity={quantity}
      onQuantityChange={setQuantity}
    />
  )
}
