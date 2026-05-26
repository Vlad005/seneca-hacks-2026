/**
 * ESA-certified Ontario solar installers for the demo's hand-off step.
 * Phones intentionally omitted from rendering — only website links surface
 * to judges. `topMatch` and `badge` drive visual treatment in the UI.
 */

export interface Installer {
    id: string;
    name: string;
    tagline: string;
    coverage: string;
    yearsExperience: number;
    projectsCompleted: string;
    certifications: string[];
    specialties: string[];
    website: string;
    badge: string | null;
    topMatch?: boolean;
}

export const INSTALLERS: Installer[] = [
    {
        id: "polaron",
        name: "Polaron Solar",
        tagline: "6× Consumer Choice Award winner",
        coverage: "Toronto & GTA, Eastern & Southwestern Ontario",
        yearsExperience: 12,
        projectsCompleted: "13,000+",
        certifications: ["ESA/ECRA Certified", "BBB A+"],
        specialties: [
            "Urban roofs",
            "Battery integration",
            "Snow-load engineering",
        ],
        website: "https://polaronsolar.com",
        badge: "Top match",
        topMatch: true,
    },
    {
        id: "solarx",
        name: "Solar X Canada",
        tagline: "10,000+ projects · 118 MW installed",
        coverage: "Ontario, Alberta, Nova Scotia, New Brunswick",
        yearsExperience: 10,
        projectsCompleted: "10,000+",
        certifications: ["ESA/ECRA Certified"],
        specialties: [
            "HRSP processing",
            "Battery bundles",
            "Multi-province support",
        ],
        website: "https://solar-x.ca",
        badge: "Largest network",
    },
    {
        id: "terawatt",
        name: "Terawatt Solar",
        tagline: "Toronto-focused, climate-engineered",
        coverage: "Toronto, North York, Etobicoke, Scarborough",
        yearsExperience: 6,
        projectsCompleted: "500+",
        certifications: ["ESA/ECRA Certified", "BBB Accredited"],
        specialties: ["GTA-specific designs", "Net metering optimization"],
        website: "https://www.terawattsolar.ca",
        badge: "Local specialist",
    },
    {
        id: "newdawn",
        name: "New Dawn Energy Solutions",
        tagline: "Transparent process, post-install support",
        coverage: "GTA, Hamilton, Niagara",
        yearsExperience: 8,
        projectsCompleted: "1,200+",
        certifications: ["ESA/ECRA Certified"],
        specialties: ["Residential rooftop", "Customer support"],
        website: "https://newdawnenergy.ca",
        badge: null,
    },
    {
        id: "envelectric",
        name: "ENV Electric",
        tagline: "Electrical specialists, solar division",
        coverage: "Toronto & GTA",
        yearsExperience: 15,
        projectsCompleted: "800+",
        certifications: [
            "ESA/ECRA Certified",
            "Licensed Electrical Contractor",
        ],
        specialties: [
            "Complex electrical integration",
            "EV charger pairing",
        ],
        website: "https://envelectric.com",
        badge: "Best for EV homes",
    },
];
