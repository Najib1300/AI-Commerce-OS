import { describe,expect,it } from "vitest";
import { calculateGrossMargin,marginPercentageToScore } from "@/agents/product-research/pricing";
import { calculateOverallScore,clampScore } from "@/agents/product-research/scoring";
import { productResearchInputSchema,productResearchResponseSchema } from "@/agents/product-research/validation";

describe("product research validation and scoring",()=>{
  const valid={businessId:"550e8400-e29b-41d4-a716-446655440000",targetCountry:"Kenya",targetMarket:"East Africa",niche:"Pets",budget:1000,maximumSupplierCost:30,preferredSellingPrice:80,productCount:5};
  it("validates bounded research inputs",()=>{expect(productResearchInputSchema.safeParse(valid).success).toBe(true);expect(productResearchInputSchema.safeParse({...valid,productCount:11}).success).toBe(false);expect(productResearchInputSchema.safeParse({...valid,maximumSupplierCost:1001}).success).toBe(false)});
  it("calculates gross margin safely",()=>{expect(calculateGrossMargin(20,50)).toBe(60);expect(calculateGrossMargin(20,0)).toBe(0);expect(calculateGrossMargin(60,50)).toBe(-20)});
  it("maps margin percentage linearly and clamps it",()=>{expect(marginPercentageToScore(30)).toBe(50);expect(marginPercentageToScore(60)).toBe(100);expect(marginPercentageToScore(-10)).toBe(0)});
  it("inverts competition and risk",()=>{const base={demand:50,trend:50,margin:50,marketing:50,shipping:50};expect(calculateOverallScore({...base,competition:10,risk:10})).toBeGreaterThan(calculateOverallScore({...base,competition:90,risk:90}))});
  it("clamps component and final scores",()=>{expect(clampScore(-2)).toBe(0);expect(clampScore(120)).toBe(100);expect(calculateOverallScore({demand:1000,competition:-20,trend:1000,margin:1000,marketing:1000,shipping:1000,risk:-50})).toBe(100)});
  it("rejects malformed AI output",()=>expect(productResearchResponseSchema.safeParse({products:[{name:"Incomplete"}]}).success).toBe(false));
});
