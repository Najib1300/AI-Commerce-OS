import type { ProductResearchInput } from "./types";

export function buildProductResearchPrompt(input: ProductResearchInput) {
  return `Identify ${input.productCount} plausible ecommerce product opportunities for this business brief.
Target country: ${input.targetCountry}
Target selling market: ${input.targetMarket}
Niche: ${input.niche}
Starting budget: ${input.budget}
Maximum supplier cost: ${input.maximumSupplierCost}
Preferred selling price: ${input.preferredSellingPrice}

Treat demand, trend, competition, costs, and risks as AI estimates, not verified live market data.
Keep supplierCost at or below the maximum where possible. Do not calculate a final score or gross margin.`;
}
