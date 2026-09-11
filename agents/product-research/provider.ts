import "server-only";
import { buildProductResearchPrompt } from "./prompt";
import { productResearchResponseSchema } from "./validation";
import type { ProductResearchInput, ProductResearchProvider } from "./types";

export const DEFAULT_PRODUCT_RESEARCH_MODEL = "gpt-4.1-mini";

export class OpenAiProductResearchProvider implements ProductResearchProvider {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_MODEL || DEFAULT_PRODUCT_RESEARCH_MODEL,
  ) {}

  async generate(input: ProductResearchInput) {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a cautious ecommerce product research assistant. Return only the requested structured JSON. Never claim estimates are verified live data." },
          { role: "user", content: buildProductResearchPrompt(input) },
        ],
        response_format: { type: "json_schema", json_schema: { name: "product_research", strict: true, schema: responseSchema(input.productCount) } },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Product research provider failed", { status: response.status, detail: detail.slice(0, 500) });
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    const payload: unknown = await response.json();
    const completion = payload as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty product research response");
    let decoded: unknown;
    try { decoded = JSON.parse(content); } catch { throw new Error("OpenAI returned malformed JSON"); }
    const validated = productResearchResponseSchema.parse(decoded);
    if (validated.products.length > input.productCount) throw new Error("OpenAI returned more products than requested");
    return {
      products: validated.products,
      model: this.model,
      provider: "openai" as const,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
    };
  }
}

function responseSchema(maxItems: number) {
  return {
    type: "object", additionalProperties: false, required: ["products"],
    properties: { products: { type: "array", minItems: 1, maxItems, items: {
      type: "object", additionalProperties: false,
      required: ["name","category","description","targetCustomer","supplierCost","suggestedPrice","currency","demandScore","competitionScore","trendScore","marketingScore","shippingScore","riskScore","reasoning","searchKeywords","marketingAngles","risks"],
      properties: {
        name:{type:"string"}, category:{type:"string"}, description:{type:"string"}, targetCustomer:{type:"string"},
        supplierCost:{type:"number"}, suggestedPrice:{type:"number"}, currency:{type:"string"},
        demandScore:{type:"number"}, competitionScore:{type:"number"}, trendScore:{type:"number"}, marketingScore:{type:"number"}, shippingScore:{type:"number"}, riskScore:{type:"number"},
        reasoning:{type:"string"}, searchKeywords:{type:"array",items:{type:"string"}}, marketingAngles:{type:"array",items:{type:"string"}}, risks:{type:"array",items:{type:"string"}},
      },
    } } },
  };
}
