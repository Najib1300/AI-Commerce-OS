import type { ResearchGeneration } from "./types";

export function createResearchUsageRecord(context:{organizationId:string;userId:string;runId:string},generation:ResearchGeneration){return {
  organization_id:context.organizationId,user_id:context.userId,usage_type:"product_research",quantity:generation.usage.totalTokens,
  metadata:{provider:generation.provider,model:generation.model,input_tokens:generation.usage.inputTokens,output_tokens:generation.usage.outputTokens,total_tokens:generation.usage.totalTokens,research_run_id:context.runId},
}}
