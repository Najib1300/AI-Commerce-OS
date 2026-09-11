"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { executeProductResearch } from "@/agents/product-research/execution";
import { OpenAiProductResearchProvider } from "@/agents/product-research/provider";
import { SupabaseProductResearchPersistence } from "@/agents/product-research/persistence";
import { productResearchInputSchema } from "@/agents/product-research/validation";
import { getCurrentOrganization } from "@/lib/data";
import { idSchema } from "@/lib/validation";

const safeResearchError = "We couldn’t complete product research. Please try again.";

export async function startProductResearch(formData:FormData){
  const parsed=productResearchInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)redirect(`/product-research?error=${encodeURIComponent(parsed.error.issues[0]?.message??"Invalid research request")}`);
  const {supabase,user,membership}=await getCurrentOrganization();
  const {data:business}=await supabase.from("businesses").select("id").eq("id",parsed.data.businessId).eq("organization_id",membership.organization_id).maybeSingle();
  if(!business)redirect(`/product-research?error=${encodeURIComponent("Business not found in your workspace.")}`);
  try{
    await executeProductResearch(parsed.data,new OpenAiProductResearchProvider(),new SupabaseProductResearchPersistence(supabase,{organizationId:membership.organization_id,userId:user.id}));
  }catch(error){
    console.error("Product research action failed",{businessId:parsed.data.businessId,userId:user.id,error});
    const message=error instanceof Error&&error.message.includes("already running")?error.message:safeResearchError;
    redirect(`/product-research?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/businesses/${parsed.data.businessId}`);revalidatePath(`/businesses/${parsed.data.businessId}/research`);redirect(`/businesses/${parsed.data.businessId}/research`);
}

export async function selectProduct(formData:FormData){
  const productId=idSchema.safeParse(formData.get("productId"));const businessId=idSchema.safeParse(formData.get("businessId"));
  if(!productId.success||!businessId.success)redirect("/product-research?error=Invalid%20product");
  const {supabase,membership}=await getCurrentOrganization();
  const {data:product}=await supabase.from("product_opportunities").select("id").eq("id",productId.data).eq("business_id",businessId.data).eq("organization_id",membership.organization_id).maybeSingle();
  if(!product)redirect("/product-research?error=Product%20not%20found");
  const {error}=await supabase.rpc("select_product_opportunity",{p_product_id:productId.data});
  if(error){console.error("Product selection failed",{businessId:businessId.data,productId:productId.data,error});redirect(`/businesses/${businessId.data}/research?error=${encodeURIComponent("We couldn’t select this product. Please try again.")}`);}
  revalidatePath(`/businesses/${businessId.data}`);revalidatePath(`/businesses/${businessId.data}/research`);redirect(`/businesses/${businessId.data}/research?selected=1`);
}

export async function rejectProduct(formData:FormData){
  const productId=idSchema.safeParse(formData.get("productId"));const businessId=idSchema.safeParse(formData.get("businessId"));
  if(!productId.success||!businessId.success)redirect("/product-research?error=Invalid%20product");
  const {supabase,membership}=await getCurrentOrganization();
  const {data:product}=await supabase.from("product_opportunities").select("id").eq("id",productId.data).eq("business_id",businessId.data).eq("organization_id",membership.organization_id).maybeSingle();
  if(!product)redirect("/product-research?error=Product%20not%20found");
  const {error}=await supabase.rpc("reject_product_opportunity",{p_product_id:productId.data});
  if(error){console.error("Product rejection failed",{businessId:businessId.data,productId:productId.data,error});redirect(`/businesses/${businessId.data}/research?error=${encodeURIComponent("We couldn’t reject this product. Please try again.")}`);}
  revalidatePath(`/businesses/${businessId.data}/research`);redirect(`/businesses/${businessId.data}/research`);
}
