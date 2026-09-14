export interface OrderConfirmationService{send(input:{email:string;orderNumber:string}):Promise<void>}
export class NoopOrderConfirmationService implements OrderConfirmationService{async send(input:{email:string;orderNumber:string}){void input;/* Email delivery is optional in Phase 1E. */}}
