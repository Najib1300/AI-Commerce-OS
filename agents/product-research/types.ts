export interface ProductResearchInput {
  businessId: string;
  targetCountry: string;
  targetMarket: string;
  niche: string;
  budget: number;
  maximumSupplierCost: number;
  preferredSellingPrice: number;
  productCount: number;
}

export interface ProductProposal {
  name: string;
  category: string;
  description: string;
  targetCustomer: string;
  supplierCost: number;
  suggestedPrice: number;
  currency: string;
  demandScore: number;
  competitionScore: number;
  trendScore: number;
  marketingScore: number;
  shippingScore: number;
  riskScore: number;
  reasoning: string;
  searchKeywords: string[];
  marketingAngles: string[];
  risks: string[];
}

export interface AiUsage { inputTokens: number; outputTokens: number; totalTokens: number }
export type ProductResearchProviderName = "openai" | "mock";
export interface ResearchGeneration { products: ProductProposal[]; usage: AiUsage; model: string; provider: ProductResearchProviderName }
export interface ProductResearchProvider { generate(input: ProductResearchInput): Promise<ResearchGeneration> }

export interface ScoredProduct extends ProductProposal {
  estimatedMargin: number;
  marginScore: number;
  overallScore: number;
}
