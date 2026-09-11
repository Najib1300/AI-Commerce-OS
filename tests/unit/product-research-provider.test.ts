import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeProductResearch, type ProductResearchPersistence } from "@/agents/product-research/execution";
import { MockProductResearchProvider, MOCK_PRODUCT_RESEARCH_MODEL } from "@/agents/product-research/mock-provider";
import { getProductResearchProvider } from "@/agents/product-research/provider-factory";
import { OpenAiProductResearchProvider } from "@/agents/product-research/provider";
import { scoreProduct } from "@/agents/product-research/scoring";
import { productResearchResponseSchema } from "@/agents/product-research/validation";
import type { ProductResearchInput } from "@/agents/product-research/types";

const input:ProductResearchInput={businessId:"550e8400-e29b-41d4-a716-446655440000",targetCountry:"Uganda",targetMarket:"United States",niche:"Pets",budget:300,maximumSupplierCost:20,preferredSellingPrice:40,productCount:3};

describe("product research providers",()=>{
  it("defaults to OpenAI and explicitly selects OpenAI",()=>{expect(getProductResearchProvider({})).toBeInstanceOf(OpenAiProductResearchProvider);expect(getProductResearchProvider({AI_PROVIDER:"openai"})).toBeInstanceOf(OpenAiProductResearchProvider)});
  it("selects mock and rejects unsupported values",()=>{expect(getProductResearchProvider({AI_PROVIDER:"mock"})).toBeInstanceOf(MockProductResearchProvider);expect(()=>getProductResearchProvider({AI_PROVIDER:"fallback"})).toThrow("AI_PROVIDER must be either openai or mock")});
  it("returns deterministic, schema-valid products without derived scores",async()=>{const provider=new MockProductResearchProvider();const first=await provider.generate(input);const second=await provider.generate(input);expect(first).toEqual(second);expect(first.products).toHaveLength(3);expect(first.products.map(item=>item.name)).toEqual(["Portable Pet Water Bottle","Reusable Pet Hair Remover","Slow Feeder Dog Bowl"]);expect(productResearchResponseSchema.safeParse({products:first.products}).success).toBe(true);expect(first).toMatchObject({provider:"mock",model:MOCK_PRODUCT_RESEARCH_MODEL,usage:{inputTokens:0,outputTokens:0,totalTokens:0}});expect(first.products[0]).not.toHaveProperty("overallScore");expect(first.products[0]).not.toHaveProperty("estimatedMargin");expect(first.products[0]).not.toHaveProperty("marginScore")});
  it("supports unsupported niches with deterministic generic results",async()=>{const result=await new MockProductResearchProvider().generate({...input,niche:"Unlisted Niche",productCount:2});expect(result.products).toHaveLength(2);expect(result.products[0]?.name).toBe("Unlisted Niche Test Product 1")});
  it("uses normal lifecycle and application scoring with zero paid usage",async()=>{const store:ProductResearchPersistence={start:async()=>({runId:"run",jobId:"job",businessId:input.businessId}),complete:async(_references,products,generation)=>{expect(products[0]).toEqual(scoreProduct(generation.products[0]!));expect(generation.usage.totalTokens).toBe(0)},fail:async()=>{throw new Error("unexpected failure")}};const result=await executeProductResearch(input,new MockProductResearchProvider(),store);expect(result.products).toHaveLength(3);expect(result.products[0]?.estimatedMargin).toBeGreaterThan(0);expect(result.products[0]?.overallScore).toBeGreaterThan(0)});
  it("renders an explicit test-data warning only for persisted mock metadata",()=>{const list=readFileSync("app/businesses/[id]/research/page.tsx","utf8");const detail=readFileSync("app/businesses/[id]/research/[opportunityId]/page.tsx","utf8");expect(list).toContain('overview.provider==="mock"');expect(detail).toContain('product.research_provider==="mock"');expect(list).toContain("Test Data");expect(list).toContain("not live market research")});
});
