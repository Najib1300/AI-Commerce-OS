import { describe,expect,it } from "vitest";
import { businessSchema } from "@/lib/validation";
describe("business validation",()=>{const valid={name:"Northstar Pets",targetCountry:"Kenya",targetMarket:"East Africa",startingBudget:2500,niche:"Pets"};it("accepts a complete business brief",()=>expect(businessSchema.safeParse(valid).success).toBe(true));it("rejects negative budgets",()=>expect(businessSchema.safeParse({...valid,startingBudget:-1}).success).toBe(false));it("rejects unsupported niches",()=>expect(businessSchema.safeParse({...valid,niche:"Unlisted"}).success).toBe(false));});
