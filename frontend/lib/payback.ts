/**
 * 25-year cashflow + payback for a residential PV system.
 *
 * All numbers nominal CAD. NPV computed alongside for the tooltip.
 */

export interface PaybackInputs {
  /** System DC capacity in kW (e.g. 8.4). */
  systemKw: number;
  /** Year-1 dollar savings — already computed by upstream (Net Metering or HRS). */
  year1SavingsCAD: number;
  /** Optional override of the install cost per watt. Default 3.20 CAD/W. */
  costPerWattCAD?: number;
  /** Optional grant deducted from upfront cost (HRS scenario uses this). */
  upfrontGrantCAD?: number;
  /** Optional connection / inspection fee. Default 500 for under 12 kW. */
  connectionFeeCAD?: number;
}

export interface PaybackResult {
  upfrontCost: number;
  annualSavings: number;
  /** First year in which cumulative cashflow ≥ 0. Null if never within lifetime. */
  breakevenYear: number | null;
  /** 25-year cumulative nominal savings minus upfront. */
  lifetimeValue: number;
  /** Net present value at 3% real discount rate. */
  npv: number;
  /** Length 26: [year 0 = -upfront, year 1..25 = annual savings (degraded + escalated)]. */
  yearlyCashflow: number[];
  /** Length 26 cumulative running total of yearlyCashflow. */
  cumulativeCashflow: number[];
}

export const PAYBACK_CONSTANTS = {
  COST_PER_WATT_CAD: 3.2,
  PANEL_DEGRADATION_PER_YEAR: 0.005,
  ELECTRICITY_INFLATION: 0.025,
  DISCOUNT_RATE: 0.03,
  CONNECTION_FEE_CAD: 500,
  LIFETIME_YEARS: 25,
} as const;

export function computePayback(inputs: PaybackInputs): PaybackResult {
  const {
    systemKw,
    year1SavingsCAD,
    costPerWattCAD = PAYBACK_CONSTANTS.COST_PER_WATT_CAD,
    upfrontGrantCAD = 0,
    connectionFeeCAD = PAYBACK_CONSTANTS.CONNECTION_FEE_CAD,
  } = inputs;

  const install = systemKw * 1000 * costPerWattCAD;
  const upfrontCost = install + connectionFeeCAD - upfrontGrantCAD;

  const yearlyCashflow: number[] = [-upfrontCost];
  const cumulativeCashflow: number[] = [-upfrontCost];
  let runningNominal = -upfrontCost;
  let runningDiscounted = -upfrontCost;
  let breakevenYear: number | null = null;

  for (let year = 1; year <= PAYBACK_CONSTANTS.LIFETIME_YEARS; year++) {
    const degradation = Math.pow(
      1 - PAYBACK_CONSTANTS.PANEL_DEGRADATION_PER_YEAR,
      year - 1,
    );
    const escalation = Math.pow(
      1 + PAYBACK_CONSTANTS.ELECTRICITY_INFLATION,
      year - 1,
    );
    const yearSavings = year1SavingsCAD * degradation * escalation;

    runningNominal += yearSavings;
    runningDiscounted += yearSavings / Math.pow(1 + PAYBACK_CONSTANTS.DISCOUNT_RATE, year);

    yearlyCashflow.push(yearSavings);
    cumulativeCashflow.push(runningNominal);

    if (breakevenYear === null && runningNominal >= 0) {
      breakevenYear = year;
    }
  }

  return {
    upfrontCost,
    annualSavings: year1SavingsCAD,
    breakevenYear,
    lifetimeValue: runningNominal,
    npv: runningDiscounted,
    yearlyCashflow,
    cumulativeCashflow,
  };
}
