import "server-only";
import { ConfigurationError } from "@/lib/env";
import { MockProductResearchProvider } from "./mock-provider";
import { OpenAiProductResearchProvider } from "./provider";
import type { ProductResearchProvider } from "./types";

export function getProductResearchProvider(environment: Record<string,string|undefined> = process.env): ProductResearchProvider {
  const provider = environment.AI_PROVIDER?.trim().toLowerCase() || "openai";
  if (provider === "openai") return new OpenAiProductResearchProvider(environment.OPENAI_API_KEY, environment.OPENAI_MODEL);
  if (provider === "mock") return new MockProductResearchProvider();
  throw new ConfigurationError("AI_PROVIDER must be either openai or mock.");
}
