import "server-only";
import { productResearchResponseSchema } from "./validation";
import type { ProductProposal, ProductResearchInput, ProductResearchProvider } from "./types";

export const MOCK_PRODUCT_RESEARCH_MODEL = "mock-product-research";

const petCatalog: Omit<ProductProposal, "supplierCost" | "suggestedPrice">[] = [
  {
    name: "Portable Pet Water Bottle", category: "Pet Travel", description: "A leak-resistant handheld bottle with an integrated drinking trough for walks and road trips.", targetCustomer: "Dog owners who travel, hike, or take long daily walks",
    currency: "USD", demandScore: 78, competitionScore: 52, trendScore: 71, marketingScore: 86, shippingScore: 88, riskScore: 24,
    reasoning: "A compact, demonstrable problem-solver with clear travel and hydration use cases for short-form content.",
    searchKeywords: ["portable dog water bottle", "pet travel bottle"], marketingAngles: ["Hydration anywhere", "One-hand walks"], risks: ["Crowded marketplace", "Leak claims require supplier checks"],
  },
  {
    name: "Reusable Pet Hair Remover", category: "Pet Cleaning", description: "A reusable lint and fur remover designed for sofas, car seats, bedding, and clothing without disposable sheets.", targetCustomer: "Cat and dog owners who want a low-waste cleaning tool",
    currency: "USD", demandScore: 82, competitionScore: 61, trendScore: 76, marketingScore: 91, shippingScore: 92, riskScore: 19,
    reasoning: "Highly visual before-and-after demonstrations support organic marketing while the small format keeps fulfillment simple.",
    searchKeywords: ["reusable pet hair remover", "cat hair cleaning tool"], marketingAngles: ["Satisfying before and after", "No more sticky refills"], risks: ["Performance varies by fabric", "Commodity competition"],
  },
  {
    name: "Slow Feeder Dog Bowl", category: "Pet Feeding", description: "A maze-pattern feeding bowl that encourages dogs to eat more slowly and turns mealtime into enrichment.", targetCustomer: "Dog owners concerned about fast eating and boredom at mealtime",
    currency: "USD", demandScore: 75, competitionScore: 57, trendScore: 68, marketingScore: 80, shippingScore: 79, riskScore: 28,
    reasoning: "The benefit is easy to explain and demonstrate, with room for size, color, and breed-focused positioning.",
    searchKeywords: ["slow feeder dog bowl", "dog enrichment feeding bowl"], marketingAngles: ["Make meals last longer", "Mealtime enrichment"], risks: ["Sizing must be clear", "Avoid unsupported health claims"],
  },
];

function pricePair(input: ProductResearchInput, index: number) {
  const maximum = Math.max(1, input.maximumSupplierCost);
  const supplierCost = Number(Math.min(maximum, maximum * (0.45 + index * 0.08)).toFixed(2));
  const suggestedPrice = Number(Math.max(input.preferredSellingPrice, supplierCost * 2.2).toFixed(2));
  return { supplierCost, suggestedPrice };
}

function genericProduct(input: ProductResearchInput, index: number): ProductProposal {
  const label = input.niche.trim() || "Ecommerce";
  return {
    name: `${label} Test Product ${index + 1}`, category: label,
    description: `A deterministic test product for validating the ${label} research workflow in ${input.targetMarket}.`,
    targetCustomer: `${label} shoppers in ${input.targetMarket}`,
    ...pricePair(input, index), currency: "USD",
    demandScore: 64 + (index % 4) * 4, competitionScore: 48 + (index % 3) * 5,
    trendScore: 62 + (index % 5) * 3, marketingScore: 70 + (index % 4) * 4,
    shippingScore: 78 - (index % 3) * 3, riskScore: 30 + (index % 4) * 4,
    reasoning: `Deterministic mock data for exercising validation, scoring, persistence, and selection. It is not live market research.`,
    searchKeywords: [`${label.toLowerCase()} test product`, `${label.toLowerCase()} ecommerce`],
    marketingAngles: ["Workflow test data", "Deterministic product concept"],
    risks: ["Mock data only", "Requires live supplier and market validation"],
  };
}

export class MockProductResearchProvider implements ProductResearchProvider {
  async generate(input: ProductResearchInput) {
    const isPets = input.niche.trim().toLowerCase() === "pets";
    const products = Array.from({ length: input.productCount }, (_, index) => {
      const catalogProduct = isPets ? petCatalog[index] : undefined;
      return catalogProduct ? { ...catalogProduct, ...pricePair(input, index) } : genericProduct(input, index);
    });
    const validated = productResearchResponseSchema.parse({ products });
    return { products: validated.products, provider: "mock" as const, model: MOCK_PRODUCT_RESEARCH_MODEL, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
  }
}
