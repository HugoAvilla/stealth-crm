export type PlanPeriod = 'monthly' | 'annual';

export type PlanCode = 'basic' | 'ultra' | 'premium';

export interface PlanPrice {
    plan_code: string;
    billing_period: PlanPeriod;
    price: number;
}

export interface Feature {
    name: string;
    basic: boolean | string;
    ultra: boolean | string;
    premium: boolean | string;
}
