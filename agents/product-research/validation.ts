import { z } from "zod";
import { idSchema } from "@/lib/validation";

export const MAX_RESEARCH_PRODUCTS = 10;
const boundedScore = z.number().finite().min(0).max(100);
const textList = z.array(z.string().trim().min(1).max(160)).max(12);

export const productResearchInputSchema = z.object({
  businessId: idSchema,
  targetCountry: z.string().trim().min(2).max(80),
  targetMarket: z.string().trim().min(2).max(100),
  niche: z.string().trim().min(2).max(100),
  budget: z.coerce.number().finite().min(0).max(100_000_000),
  maximumSupplierCost: z.coerce.number().finite().positive().max(10_000_000),
  preferredSellingPrice: z.coerce.number().finite().positive().max(10_000_000),
  productCount: z.coerce.number().int().min(1).max(MAX_RESEARCH_PRODUCTS),
}).refine(value => value.maximumSupplierCost <= value.budget || value.budget === 0, {
  message: "Maximum supplier cost cannot exceed the available budget.",
  path: ["maximumSupplierCost"],
});

export const productProposalSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(2000),
  targetCustomer: z.string().trim().min(2).max(500),
  supplierCost: z.number().finite().min(0),
  suggestedPrice: z.number().finite().positive(),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()),
  demandScore: boundedScore,
  competitionScore: boundedScore,
  trendScore: boundedScore,
  marketingScore: boundedScore,
  shippingScore: boundedScore,
  riskScore: boundedScore,
  reasoning: z.string().trim().min(10).max(3000),
  searchKeywords: textList,
  marketingAngles: textList,
  risks: textList,
});

export const productResearchResponseSchema = z.object({
  products: z.array(productProposalSchema).min(1).max(MAX_RESEARCH_PRODUCTS),
});
