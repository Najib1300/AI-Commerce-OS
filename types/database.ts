export type OrganizationRole = "owner" | "admin" | "member";
export type BusinessStatus = "draft" | "researching" | "building" | "ready" | "published" | "paused";
export type BusinessType = "dropshipping";
export type AiJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export interface Profile { id:string; email:string; full_name:string|null; avatar_url:string|null; created_at:string; updated_at:string }
export interface Organization { id:string; name:string; slug:string; owner_id:string; created_at:string; updated_at:string }
export interface Business { id:string; organization_id:string; name:string; slug:string; status:BusinessStatus; business_type:BusinessType; target_country:string; target_market:string; starting_budget:number; niche:string; created_at:string; updated_at:string }
