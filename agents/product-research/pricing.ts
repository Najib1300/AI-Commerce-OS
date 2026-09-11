export function calculateGrossMargin(supplierCost: number, suggestedPrice: number) {
  if (!Number.isFinite(supplierCost) || !Number.isFinite(suggestedPrice) || suggestedPrice <= 0) return 0;
  return Math.round((((suggestedPrice - supplierCost) / suggestedPrice) * 100) * 100) / 100;
}

// A 0% margin scores 0 and a 60% margin scores 100. Values between are linear.
// Negative margins remain 0; unusually high margins are capped at 100.
export function marginPercentageToScore(marginPercentage: number) {
  if (!Number.isFinite(marginPercentage)) return 0;
  return Math.min(100, Math.max(0, Math.round((marginPercentage / 60) * 10000) / 100));
}
