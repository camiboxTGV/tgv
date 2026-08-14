"use client"

import { useState } from "react"
import DecorationEstimator from "@/components/pricing/DecorationEstimator"

export default function StandalonePriceCalculator() {
  const [quantity, setQuantity] = useState(100)

  return (
    <DecorationEstimator
      methods={["co2", "fiber-laser", "uv-print", "uv-transfer"]}
      quantity={quantity}
      onQuantityChange={setQuantity}
    />
  )
}
