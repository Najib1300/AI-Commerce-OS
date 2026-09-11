import { describe,expect,it,vi } from "vitest";
import { provisionInitialWorkspace,shouldSkipOnboarding,type OnboardingClient } from "@/lib/onboarding";

function client(options?: { user?: { id:string;email:string } | null; organizationId?: string | null; error?: { message:string } | null }) {
  const rpc=vi.fn().mockResolvedValue({data:options?.organizationId??"organization-1",error:options?.error??null});
  const value:OnboardingClient={auth:{getUser:vi.fn().mockResolvedValue({data:{user:options?.user===undefined?{id:"user-1",email:"founder@example.com"}:options.user},error:null})},rpc};
  return {value,rpc};
}

describe("initial workspace orchestration",()=>{
  it("lets a verified user complete onboarding through the transactional RPC",async()=>{const {value,rpc}=client();await expect(provisionInitialWorkspace(value,{fullName:"New Founder",organizationName:"NJ Print Solutions"})).resolves.toEqual({status:"created",organizationId:"organization-1"});expect(rpc).toHaveBeenCalledWith("create_initial_workspace",{p_full_name:"New Founder",p_organization_name:"NJ Print Solutions"});expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("user_id");expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("owner_id");});
  it("does not call the RPC for an unauthenticated user",async()=>{const {value,rpc}=client({user:null});await expect(provisionInitialWorkspace(value,{fullName:"New Founder",organizationName:"New Org"})).resolves.toEqual({status:"unauthenticated"});expect(rpc).not.toHaveBeenCalled();});
  it("returns database detail for server-side logging",async()=>{const {value}=client({organizationId:null,error:{message:"database unavailable"}});await expect(provisionInitialWorkspace(value,{fullName:"New Founder",organizationName:"New Org"})).resolves.toEqual({status:"failed",detail:"database unavailable"});});
  it("skips onboarding for an existing member",()=>{expect(shouldSkipOnboarding({organization_id:"organization-1"})).toBe(true);expect(shouldSkipOnboarding(null)).toBe(false);});
});
