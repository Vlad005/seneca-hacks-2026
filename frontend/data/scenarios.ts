/**
 * Precomputed HRS-path scenario for the demo system.
 *
 * Used by the Section A toggle to show the alternate path without recomputing
 * live (Net Metering is the only path with full live math in v1, per spec).
 *
 * Assumptions:
 *  - 8.4 kW system, ~$28,960 installed (8400W × $3.20/W + $500 connection)
 *  - HRS grant: $10,000 (max solar+battery split: $5K + $5K)
 *  - No grid export under HRS (load-displacement only)
 *  - Annual self-consumption savings ≈ Σ_t min(G(t), U(t)) × R(t)
 *  - Same 25yr degradation + escalation stack as Net Metering
 *
 * Numbers are illustrative for the demo Mississauga roof (~9,120 kWh/yr,
 * ~38% self-consumption under typical demo curve). They should be re-derived
 * for any production version — they're a precomputed comparison, not a quote.
 */

export interface HrsScenario {
  upfrontCost: number;
  annualSavings: number;
  breakevenYear: number;
  lifetimeValue: number;
  /** Delta vs Net Metering (negative = NM wins long-term). */
  deltaVsNetMetering: number;
}

export const HRS_DEMO_SCENARIO: HrsScenario = {
  upfrontCost: 18_960, // $28,960 install − $10K grant
  annualSavings: 1_020,
  breakevenYear: 14,
  lifetimeValue: 34_800,
  deltaVsNetMetering: -7_350,
};
