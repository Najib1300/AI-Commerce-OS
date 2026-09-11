import "server-only";
import { DEFAULT_PRODUCT_RESEARCH_MODEL } from "@/agents/product-research/provider";
import { ConfigurationError } from "@/lib/env";
import { MockBrandProvider,MOCK_BRAND_MODEL } from "./mock-provider";
import { OpenAiBrandProvider } from "./provider";
export function getBrandProviderConfig(env:Record<string,string|undefined>=process.env){const name=env.AI_PROVIDER?.trim().toLowerCase()||"openai";if(name==="mock")return{name,model:MOCK_BRAND_MODEL,provider:new MockBrandProvider()};if(name==="openai")return{name,model:env.OPENAI_MODEL||DEFAULT_PRODUCT_RESEARCH_MODEL,provider:new OpenAiBrandProvider(env.OPENAI_API_KEY,env.OPENAI_MODEL)};throw new ConfigurationError("AI_PROVIDER must be either openai or mock.")}
