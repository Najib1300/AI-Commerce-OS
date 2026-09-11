import type { ProductProposal, ScoredProduct } from "./types";
import { calculateGrossMargin, marginPercentageToScore } from "./pricing";

export function clampScore(value: number) { return Math.min(100, Math.max(0, value)); }

export function calculateOverallScore(scores: {
  demand: number; competition: number; trend: number; margin: number;
  marketing: number; shipping: number; risk: number;
}) {
  const competitionOpportunity = 100 - clampScore(scores.competition);
  const riskOpportunity = 100 - clampScore(scores.risk);
  const result = clampScore(scores.demand) * 0.25
    + competitionOpportunity * 0.15
    + clampScore(scores.trend) * 0.15
    + clampScore(scores.margin) * 0.15
    + clampScore(scores.marketing) * 0.15
    + clampScore(scores.shipping) * 0.10
    + riskOpportunity * 0.05;
  return Math.round(clampScore(result) * 100) / 100;
}

export function scoreProduct(product: ProductProposal): ScoredProduct {
  const estimatedMargin = calculateGrossMargin(product.supplierCost, product.suggestedPrice);
  const marginScore = marginPercentageToScore(estimatedMargin);
  const overallScore = calculateOverallScore({
    demand: product.demandScore, competition: product.competitionScore,
    trend: product.trendScore, margin: marginScore, marketing: product.marketingScore,
    shipping: product.shippingScore, risk: product.riskScore,
  });
  return { ...product, estimatedMargin, marginScore, overallScore };
}
