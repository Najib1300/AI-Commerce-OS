export type OrganizationRole = "owner" | "admin" | "member";
export type BusinessStatus = "draft" | "researching" | "building" | "ready" | "published" | "paused";
export type BusinessType = "dropshipping";
export type AiJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export interface Profile { id:string; email:string; full_name:string|null; avatar_url:string|null; created_at:string; updated_at:string }
export interface Organization { id:string; name:string; slug:string; owner_id:string; created_at:string; updated_at:string }
export interface Business { id:string; organization_id:string; name:string; slug:string; status:BusinessStatus; business_type:BusinessType; target_country:string; target_market:string; starting_budget:number; niche:string; created_at:string; updated_at:string }
export type ProductResearchStatus = "queued" | "running" | "completed" | "failed";
export type ProductOpportunityStatus = "discovered" | "shortlisted" | "selected" | "rejected";
export interface ProductResearchRun { id:string; organization_id:string; business_id:string; status:ProductResearchStatus; target_market:string; target_country:string; niche:string; budget:number; maximum_supplier_cost:number; preferred_selling_price:number; requested_product_count:number; created_at:string; started_at:string|null; completed_at:string|null; error:string|null }
export interface ProductOpportunity { id:string; organization_id:string; business_id:string; research_run_id:string; name:string; category:string; description:string; target_customer:string; supplier_cost:number; suggested_price:number; estimated_margin:number; currency:string; demand_score:number; competition_score:number; trend_score:number; marketing_score:number; shipping_score:number; risk_score:number; margin_score:number; overall_score:number; reasoning:string; search_keywords:string[]; marketing_angles:string[]; risks:string[]; status:ProductOpportunityStatus; created_at:string; updated_at:string }
