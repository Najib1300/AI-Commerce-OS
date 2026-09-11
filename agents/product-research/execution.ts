import { scoreProduct } from "./scoring";
import type { ProductResearchInput, ProductResearchProvider, ResearchGeneration, ScoredProduct } from "./types";

export interface ResearchReferences { runId: string; jobId: string; businessId: string }
export interface ProductResearchPersistence {
  start(input: ProductResearchInput): Promise<ResearchReferences>;
  complete(references: ResearchReferences, products: ScoredProduct[], generation: ResearchGeneration): Promise<void>;
  fail(references: ResearchReferences, error: string): Promise<void>;
}

export async function executeProductResearch(
  input: ProductResearchInput,
  provider: ProductResearchProvider,
  persistence: ProductResearchPersistence,
) {
  const references = await persistence.start(input);
  try {
    const generation = await provider.generate(input);
    const products = generation.products.map(scoreProduct);
    await persistence.complete(references, products, generation);
    return { ...references, products };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown product research failure";
    try { await persistence.fail(references, message); }
    catch (cleanupError) { console.error("Product research failure cleanup failed", { references, cleanupError }); }
    throw error;
  }
}
