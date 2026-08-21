export interface Membership { organization_id:string; user_id:string }
export function hasOrganizationMembership(memberships:readonly Membership[],organizationId:string,userId:string){return memberships.some(item=>item.organization_id===organizationId&&item.user_id===userId);}
