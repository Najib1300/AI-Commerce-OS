import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductResearchInput, ResearchGeneration, ScoredProduct } from "./types";
import type { ProductResearchPersistence, ResearchReferences } from "./execution";
import { createResearchUsageRecord } from "./usage";

interface PersistenceContext { organizationId: string; userId: string }
interface StartResult { run_id?:string; job_id?:string }

export class SupabaseProductResearchPersistence implements ProductResearchPersistence {
  constructor(private readonly supabase: SupabaseClient, private readonly context: PersistenceContext) {}

  async start(input: ProductResearchInput) {
    const {data,error}=await this.supabase.rpc("start_product_research",{
      p_business_id:input.businessId,p_target_market:input.targetMarket,
      p_target_country:input.targetCountry,p_niche:input.niche,p_budget:input.budget,
      p_maximum_supplier_cost:input.maximumSupplierCost,
      p_preferred_selling_price:input.preferredSellingPrice,
      p_requested_product_count:input.productCount,
    });
    if(error){if(error.code==="23505")throw new Error("Research is already running for this business.");throw new Error(`Unable to start product research: ${error.message}`)}
    const result=data as StartResult|null;
    if(!result?.run_id||!result.job_id)throw new Error("Product research did not return valid job references");
    return {runId:result.run_id,jobId:result.job_id,businessId:input.businessId};
  }

  async complete(references: ResearchReferences, products: ScoredProduct[], generation: ResearchGeneration) {
    const rows=products.map(product=>({
      name:product.name,category:product.category,description:product.description,
      target_customer:product.targetCustomer,supplier_cost:product.supplierCost,
      suggested_price:product.suggestedPrice,estimated_margin:product.estimatedMargin,
      currency:product.currency,demand_score:product.demandScore,
      competition_score:product.competitionScore,trend_score:product.trendScore,
      marketing_score:product.marketingScore,shipping_score:product.shippingScore,
      risk_score:product.riskScore,margin_score:product.marginScore,
      overall_score:product.overallScore,reasoning:product.reasoning,
      search_keywords:product.searchKeywords,marketing_angles:product.marketingAngles,risks:product.risks,
    }));
    const usage=createResearchUsageRecord({...this.context,runId:references.runId},generation);
    const {error}=await this.supabase.rpc("complete_product_research",{
      p_run_id:references.runId,p_job_id:references.jobId,p_products:rows,
      p_model:usage.metadata.model,p_input_tokens:usage.metadata.input_tokens,
      p_output_tokens:usage.metadata.output_tokens,p_total_tokens:usage.metadata.total_tokens,
    });
    if(error)throw new Error(`Unable to complete product research: ${error.message}`);
  }

  async fail(references: ResearchReferences, error: string) {
    const safeLog=error.slice(0,2000);
    console.error("Product research failed",{...references,error:safeLog});
    const {error:cleanupError}=await this.supabase.rpc("fail_product_research",{
      p_run_id:references.runId,p_job_id:references.jobId,p_error:safeLog,
    });
    if(cleanupError)throw new Error(`Unable to clean up product research: ${cleanupError.message}`);
  }
}
