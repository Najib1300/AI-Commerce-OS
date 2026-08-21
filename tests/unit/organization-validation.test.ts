import { describe,expect,it } from "vitest";
import { organizationSchema } from "@/lib/validation";
describe("organization validation",()=>{it("accepts a valid organization",()=>expect(organizationSchema.safeParse({name:"Acme Labs",slug:"acme-labs"}).success).toBe(true));it("rejects unsafe slugs",()=>expect(organizationSchema.safeParse({name:"Acme Labs",slug:"Acme Labs!"}).success).toBe(false));});
