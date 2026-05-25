/**
 * Curated Ontario + federal solar incentive programs as of May 2026.
 *
 * Values, URLs, and program statuses should be re-verified at scaffold time
 * (URL change, dollar shift, cap update). The structure is stable; numbers
 * may drift.
 */

export type ProgramCategory = "rebate" | "financing" | "billing" | "tax-credit";

export interface RebateProgram {
    id: string;
    name: string;
    body: string;
    valueDisplay: string;
    valueMaxCAD: number | null;
    shortPitch: string;
    description: string;
    url: string;
    mutuallyExclusiveWith: string[];
    stacksWith: string[];
    eligibility: {
        requiresOwnership: boolean;
        requiresPrimaryResidence: boolean;
        geographicScope: "canada" | "ontario" | "toronto-only";
    };
    category: ProgramCategory;
    affectsPaybackSimulation: boolean;
    advisoryOnly: boolean;
    /** Optional caveat shown in the card (e.g. battery requirement). */
    note?: string;
    /** Message shown on advisory ("Check directly") cards in place of the default copy. */
    advisoryNote?: string;
}

export const REBATE_PROGRAMS: RebateProgram[] = [
    {
        id: "net-metering",
        name: "Net Metering",
        body: "Ontario Energy Board · your LDC",
        valueDisplay: "Bill credits at retail rate",
        valueMaxCAD: null,
        shortPitch: "Long-term savings. Credits for every kWh you export.",
        description:
            "Bill credits at the retail rate for any power exported to the grid. Credits carry forward 12 months. New 12 kW residential cap effective May 2026.",
        url: "https://www.oeb.ca/consumer-information-and-protection/net-metering",
        mutuallyExclusiveWith: ["hrs"],
        stacksWith: ["cghap", "help", "battery-storage"],
        eligibility: {
            requiresOwnership: false,
            requiresPrimaryResidence: false,
            geographicScope: "ontario",
        },
        category: "billing",
        affectsPaybackSimulation: true,
        advisoryOnly: false,
    },
    {
        id: "hrs",
        name: "Home Renovation Savings",
        body: "IESO · Save on Energy",
        valueDisplay: "Up to $10,000",
        valueMaxCAD: 10000,
        shortPitch: "Cuts upfront cost. Rebate covers part of the install.",
        description:
            "Rebates for energy retrofits, including solar PV. Requires a participating contractor, pre-approval before installation, and post-installation verification.",
        url: "https://www.homerenovationsavings.ca/without-assessment/solar",
        mutuallyExclusiveWith: ["net-metering"],
        stacksWith: ["cghap", "help", "battery-storage"],
        eligibility: {
            requiresOwnership: true,
            requiresPrimaryResidence: true,
            geographicScope: "ontario",
        },
        category: "rebate",
        affectsPaybackSimulation: true,
        advisoryOnly: false,
    },
    {
        id: "help",
        name: "Toronto HELP",
        body: "City of Toronto",
        valueDisplay: "Up to ~$125,000",
        valueMaxCAD: 125000,
        shortPitch: "Repaid through your property tax bill.",
        description:
            "Local Improvement Charge loan for home energy retrofits, repaid via property tax over 15–20 years. Toronto residents only.",
        url: "https://www.toronto.ca/services-payments/grants-incentives-rebates/home-energy-loan-program-help/",
        mutuallyExclusiveWith: [],
        stacksWith: ["hrs", "net-metering", "cghap", "battery-storage"],
        eligibility: {
            requiresOwnership: true,
            requiresPrimaryResidence: false,
            geographicScope: "toronto-only",
        },
        category: "financing",
        affectsPaybackSimulation: false,
        advisoryOnly: false,
    },
    {
        id: "battery-storage",
        name: "Battery Storage + Peak Perks",
        body: "IESO · your LDC",
        valueDisplay: "Varies",
        valueMaxCAD: null,
        shortPitch: "Pays you to share battery power at peak.",
        description:
            "Rebates for batteries installed with solar, plus Peak Perks payments for grid-responsive battery use. Battery is not included in the current quote — add one to qualify.",
        url: "https://saveonenergy.ca/For-Your-Home/Peak-Perks",
        mutuallyExclusiveWith: [],
        stacksWith: ["hrs", "net-metering", "cghap", "help"],
        eligibility: {
            requiresOwnership: false,
            requiresPrimaryResidence: false,
            geographicScope: "ontario",
        },
        category: "rebate",
        affectsPaybackSimulation: false,
        advisoryOnly: false,
        note: "Battery not in current quote.",
    },
    {
        id: "clean-tech-itc",
        name: "Clean Technology ITC",
        body: "Canada Revenue Agency",
        valueDisplay: "Corporate tax credit",
        valueMaxCAD: null,
        shortPitch: "Incorporated owners only. Individuals don't qualify.",
        description:
            "Federal investment tax credit for clean tech investments by taxable Canadian corporations and REITs. Individual homeowners are not eligible, even via a personally-formed corporation, unless the corporation owns the property and meets commercial-use tests.",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/business-tax-credits/clean-technology-investment-tax-credit.html",
        mutuallyExclusiveWith: [],
        stacksWith: [],
        eligibility: {
            requiresOwnership: false,
            requiresPrimaryResidence: false,
            geographicScope: "canada",
        },
        category: "tax-credit",
        affectsPaybackSimulation: false,
        advisoryOnly: true,
        advisoryNote:
            "Talk to your accountant if you operate the property through a corporation.",
    },
    {
        id: "cghap",
        name: "Greener Homes Affordability",
        body: "Natural Resources Canada",
        valueDisplay: "Income-tested grant",
        valueMaxCAD: null,
        shortPitch: "Grant for eligible households. Income-tested.",
        description:
            "Federal grant launched September 2025 for energy-efficient retrofits — including solar PV — for lower- and median-income Canadian homeowners. Funding depends on household income and project scope. Replaces the Greener Homes Loan (closed October 2025).",
        url: "https://natural-resources.canada.ca/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative/canada-greener-homes-affordability-program",
        mutuallyExclusiveWith: [],
        stacksWith: ["hrs", "net-metering", "help", "battery-storage"],
        eligibility: {
            requiresOwnership: true,
            requiresPrimaryResidence: true,
            geographicScope: "canada",
        },
        category: "rebate",
        affectsPaybackSimulation: false,
        advisoryOnly: true,
        advisoryNote: "Income-tested — check your eligibility on NRCan's site.",
    },
];

export const METER_PROGRAM_IDS = ["hrs", "net-metering"] as const;
export type MeterChoice = (typeof METER_PROGRAM_IDS)[number];

export function getProgram(id: string): RebateProgram | undefined {
    return REBATE_PROGRAMS.find((p) => p.id === id);
}
