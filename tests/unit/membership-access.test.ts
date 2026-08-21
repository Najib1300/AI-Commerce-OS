import { describe,expect,it } from "vitest";
import { hasOrganizationMembership } from "@/lib/access";
const memberships=[{organization_id:"org-a",user_id:"user-a"},{organization_id:"org-b",user_id:"user-b"}];
describe("membership access",()=>{it("allows members of the organization",()=>expect(hasOrganizationMembership(memberships,"org-a","user-a")).toBe(true));it("denies users from another organization",()=>expect(hasOrganizationMembership(memberships,"org-a","user-b")).toBe(false));});
