export type PaymentScenario="success"|"failure"|"cancel";
export type PaymentStatus="succeeded"|"failed"|"cancelled";
export interface PaymentRequest{checkoutId:string;paymentToken:string;amount:number;currency:string;scenario:PaymentScenario}
export interface VerifiedPayment{valid:boolean;status:PaymentStatus;provider:"mock";transactionId:string;eventId:string;checkoutId:string;paymentToken:string;amount:number;currency:string;payloadHash:string;metadata:Record<string,unknown>}
export interface PaymentProvider{name:string;createPayment(input:PaymentRequest):Promise<VerifiedPayment>;verifyPayment(input:VerifiedPayment):Promise<VerifiedPayment>;parseWebhook(payload:unknown):Promise<VerifiedPayment>;refundPayment(transactionId:string,amount:number):Promise<{status:"succeeded";refundId:string}>}
