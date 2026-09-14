"use server";
import{redirect}from"next/navigation";
import{createClient}from"@/lib/supabase/server";
import{getPaymentProvider}from"@/providers/payments/provider-factory";
import{checkoutInputSchema}from"@/providers/payments/validation";
import{NoopOrderConfirmationService}from"@/services/order-confirmation";

const safe="We couldn’t process your checkout. Please try again.";
const allowed=["slug","quantity","firstName","lastName","email","phone","countryCode","addressLine1","addressLine2","city","region","postalCode","scenario"]as const;

export async function submitCheckout(formData:FormData){
 const raw=Object.fromEntries(allowed.map(name=>[name,String(formData.get(name)??"")]));
 const parsed=checkoutInputSchema.safeParse(raw);
 const slug=String(formData.get("slug")||"");
 if(!parsed.success)redirect(`/store/${slug}/checkout?error=${encodeURIComponent(parsed.error.issues[0]?.message||"Invalid checkout details")}`);
 let confirmation="";
 try{
  const provider=getPaymentProvider();
  const supabase=await createClient();
  const d=parsed.data;
  const{data:session,error}=await supabase.rpc("create_checkout_session",{p_slug:d.slug,p_quantity:d.quantity,p_first_name:d.firstName,p_last_name:d.lastName,p_email:d.email,p_phone:d.phone,p_country_code:d.countryCode,p_address_line_1:d.addressLine1,p_address_line_2:d.addressLine2,p_city:d.city,p_region:d.region,p_postal_code:d.postalCode,p_provider:provider.name});
  if(error||!session)throw error||new Error("Checkout session missing");
  const{error:startError}=await supabase.rpc("record_checkout_payment_started",{p_checkout_id:session.checkoutId,p_payment_token:session.paymentToken});
  if(startError)throw startError;
  const result=await provider.verifyPayment(await provider.createPayment({checkoutId:session.checkoutId,paymentToken:session.paymentToken,amount:session.amount,currency:session.currency,scenario:d.scenario}));
  confirmation=session.confirmationToken;
  if(result.status==="succeeded"){
   const{data,error:completeError}=await supabase.rpc("complete_checkout_payment",{p_checkout_id:result.checkoutId,p_payment_token:result.paymentToken,p_provider:result.provider,p_provider_transaction_id:result.transactionId,p_provider_event_id:result.eventId,p_amount:result.amount,p_currency:result.currency,p_payload_hash:result.payloadHash});
   if(completeError||!data)throw completeError||new Error("Payment completion missing");
   try{await new NoopOrderConfirmationService().send({email:data.customerEmail,orderNumber:data.orderNumber})}catch(emailError){console.error("Order confirmation email failed",{orderNumber:data.orderNumber,emailError})}
  }else{
   const{error:failureError}=await supabase.rpc("fail_checkout_payment",{p_checkout_id:result.checkoutId,p_payment_token:result.paymentToken,p_provider:result.provider,p_provider_transaction_id:result.transactionId,p_status:result.status});
   if(failureError)throw failureError;
   redirect(`/store/${d.slug}/checkout?error=${encodeURIComponent(result.status==="cancelled"?"Payment was cancelled.":"Payment failed. Please try again.")}`);
  }
 }catch(error){console.error("Checkout failed",{slug,error});redirect(`/store/${slug}/checkout?error=${encodeURIComponent(safe)}`)}
 redirect(`/store/${parsed.data.slug}/checkout/confirmation?token=${confirmation}`);
}
