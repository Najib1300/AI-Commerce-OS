import{MockPaymentProvider}from"./mock-provider";import type{PaymentProvider}from"./types";
export function getPaymentProvider(value=process.env.PAYMENT_PROVIDER||"mock"):PaymentProvider{if(value==="mock")return new MockPaymentProvider();throw new Error("Unsupported payment provider configuration")}
