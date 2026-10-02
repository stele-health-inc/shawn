import { z } from "zod";
import { defineApp } from "../../kit/app.js";
import { READ_ONLY, fail, ok, registerWidget, uiToolMeta } from "../../kit/meta.js";
import { widgetHtml } from "../../kit/widget.js";
import { safeFilename } from "../../kit/files.js";
import { type Amortization, affordability, amortize, money, money2, mortgage, refinance, scheduleCsv } from "./lib.js";

const WIDGET_URI = "ui://loan-calculator/loan-v1.html";
const DISCLAIMER = "Estimates for information only, not financial advice; lender quotes will differ.";

interface CsvPayload { principal: number; rate: number; months: number; extraMonthly?: number; startDate?: string; title: string }

const yearlySchema = z.array(z.object({ year: z.number(), date: z.string(), principal: z.number(), interest: z.number(), balance: z.number() }));
const amortSummary = (a: Amortization) => ({ payment: a.payment, months: a.months, totalInterest: a.totalInterest, totalPaid: a.totalPaid, payoffDate: a.payoffDate, yearly: a.yearly });
const amortSchema = z.object({ payment: z.number(), months: z.number(), totalInterest: z.number(), totalPaid: z.number(), payoffDate: z.string(), yearly: yearlySchema });
const breakdownSchema = z.object({ principalInterest: z.number(), propertyTax: z.number(), insurance: z.number(), hoa: z.number(), pmi: z.number(), total: z.number() });

export const loanApp = defineApp({
  slug: "loan",
  name: "Mortgage & Loan Calculator",
  version: "1.0.0",
  subtitle: "Mortgage & loan payments",
  category: "FINANCE",
  description:
    "Exact mortgage, auto and personal-loan math with an interactive breakdown: monthly payment including taxes, insurance, HOA and PMI, full amortization with a downloadable schedule, extra-payment payoff savings, home affordability by income, and refinance break-even.",
  files: {
    csv: (p: CsvPayload) => ({ body: scheduleCsv(amortize(p.principal, p.rate, p.months, { extraMonthly: p.extraMonthly, startDate: p.startDate }), p.title), contentType: "text/csv; charset=utf-8", filename: safeFilename(p.title, "csv") }),
  },
  samples: [
    { tool: "calculate_mortgage_payment", args: { homePrice: 450000, downPaymentPercent: 10, annualRate: 6.5, termYears: 30, propertyTaxPercent: 1.2, insuranceYearly: 1800, hoaMonthly: 50, extraMonthly: 200, startDate: "2026-11-01" } },
    { tool: "calculate_loan_payment", args: { amount: 32000, annualRate: 7.9, termMonths: 60, extraMonthly: 100 } },
    { tool: "calculate_home_affordability", args: { annualIncome: 120000, monthlyDebts: 600, downPayment: 60000, annualRate: 6.5 } },
    { tool: "compare_refinance", args: { currentBalance: 380000, currentRate: 7.25, remainingMonths: 324, newRate: 5.75, newTermMonths: 360, closingCosts: 6000 } },
    { tool: "calculate_loan_payment", args: { amount: -5, annualRate: 7.9, termMonths: 60 }, expectError: true },
  ],
  register(server, ctx) {
    registerWidget(server, {
      uri: WIDGET_URI,
      name: "Loan calculator widget",
      html: widgetHtml("loan"),
      description: "Shows the payment breakdown, balance chart, yearly amortization table and CSV download. Give the headline numbers in one or two sentences; don't repeat the table.",
    });

    server.registerTool(
      "calculate_mortgage_payment",
      {
        title: "Calculate mortgage payment",
        description:
          "Use this when the user asks what a home loan would cost — e.g. \"mortgage payment on a $450k house with 10% down at 6.5%\", \"what's my monthly payment\", \"amortization schedule\", \"how much interest will I pay over 30 years\", \"what if I pay an extra $200 a month\". Includes property tax, insurance, HOA and PMI, and shows payoff savings from extra payments. Use the rate the user gives; if none, ask or state the assumption. Not for affordability (use calculate_home_affordability) or refinancing (use compare_refinance).",
        inputSchema: {
          homePrice: z.number().positive().max(1e9),
          downPayment: z.number().min(0).optional().describe("Down payment amount"),
          downPaymentPercent: z.number().min(0).max(100).optional().describe("Down payment as % of price (default 20 if neither given)"),
          annualRate: z.number().min(0).max(30).describe("Interest rate, annual %"),
          termYears: z.number().min(1).max(50).describe("e.g. 30 or 15"),
          propertyTaxYearly: z.number().min(0).optional(),
          propertyTaxPercent: z.number().min(0).max(10).optional().describe("Annual property tax as % of price (typical 0.5–2.5)"),
          insuranceYearly: z.number().min(0).optional().describe("Homeowners insurance per year"),
          hoaMonthly: z.number().min(0).optional(),
          pmiRate: z.number().min(0).max(5).optional().describe("PMI annual % of loan while LTV > 80% (default 0.6; set 0 to exclude)"),
          extraMonthly: z.number().min(0).optional().describe("Extra principal paid each month"),
          startDate: z.string().optional().describe("First payment month, YYYY-MM-DD (default now)"),
          currency: z.string().length(3).optional().describe("ISO code, default USD"),
        },
        outputSchema: {
          view: z.literal("mortgage"),
          currency: z.string(),
          homePrice: z.number(), loanAmount: z.number(), downPayment: z.number(), downPaymentPercent: z.number(), ltv: z.number(),
          annualRate: z.number(), termYears: z.number(),
          monthly: breakdownSchema,
          pmiMonthsRemaining: z.number(),
          base: amortSchema,
          withExtra: amortSchema.extend({ extraMonthly: z.number(), interestSaved: z.number(), monthsSaved: z.number() }).optional(),
          summary: z.string(),
          downloads: z.object({ schedule: z.string().url() }),
          disclaimer: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Running the numbers", invoked: "Mortgage calculated" }),
      },
      async (input) => {
        try {
          const cur = (input.currency ?? "USD").toUpperCase();
          const r = mortgage(input);
          const months = Math.round(input.termYears * 12);
          const payload: CsvPayload = { principal: r.loanAmount, rate: input.annualRate, months, extraMonthly: input.extraMonthly, startDate: input.startDate, title: `Mortgage ${money(input.homePrice, cur)} at ${input.annualRate}% for ${input.termYears} years` };
          const summary = `Monthly payment ${money2(r.monthly.total, cur)} (${money2(r.monthly.principalInterest, cur)} principal & interest` +
            `${r.monthly.propertyTax ? ` + ${money2(r.monthly.propertyTax, cur)} tax` : ""}${r.monthly.insurance ? ` + ${money2(r.monthly.insurance, cur)} insurance` : ""}${r.monthly.hoa ? ` + ${money2(r.monthly.hoa, cur)} HOA` : ""}${r.monthly.pmi ? ` + ${money2(r.monthly.pmi, cur)} PMI until month ${r.pmiMonthsRemaining}` : ""}) ` +
            `on a ${money(r.loanAmount, cur)} loan (${r.downPaymentPercent}% down). Total interest ${money(r.base.totalInterest, cur)} over ${input.termYears} years, paid off ${r.base.payoffDate}.` +
            (r.withExtra ? ` Paying ${money2(input.extraMonthly!, cur)} extra per month saves ${money(r.withExtra.interestSaved, cur)} in interest and ${r.withExtra.monthsSaved} months (payoff ${r.withExtra.payoffDate}).` : "");
          const structured = {
            view: "mortgage" as const, currency: cur,
            homePrice: input.homePrice, loanAmount: r.loanAmount, downPayment: r.downPayment, downPaymentPercent: r.downPaymentPercent, ltv: r.ltv,
            annualRate: input.annualRate, termYears: input.termYears,
            monthly: r.monthly, pmiMonthsRemaining: r.pmiMonthsRemaining,
            base: amortSummary(r.base),
            ...(r.withExtra ? { withExtra: { ...amortSummary(r.withExtra), extraMonthly: input.extraMonthly!, interestSaved: r.withExtra.interestSaved, monthsSaved: r.withExtra.monthsSaved } } : {}),
            summary,
            downloads: { schedule: ctx.fileUrl("csv", payload, "amortization.csv") },
            disclaimer: DISCLAIMER,
          };
          return ok(`${summary} ${DISCLAIMER} The widget shows the breakdown and chart.`, structured);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "calculate_loan_payment",
      {
        title: "Calculate loan payment (auto, personal, student)",
        description:
          "Use this when the user asks about a car loan, personal loan, student loan or any fixed-rate installment loan — e.g. \"monthly payment on a $32k car loan at 7.9% for 60 months\", \"how long to pay off $10k at $300 a month\", \"total interest on this loan\", \"what if I pay extra\". Returns payment, total interest, payoff date, a yearly table and a CSV schedule. For home purchases use calculate_mortgage_payment.",
        inputSchema: {
          amount: z.number().positive().max(1e9).describe("Amount borrowed"),
          annualRate: z.number().min(0).max(100).describe("APR, annual %"),
          termMonths: z.number().int().min(1).max(600),
          extraMonthly: z.number().min(0).optional().describe("Extra principal paid each month"),
          startDate: z.string().optional().describe("First payment month, YYYY-MM-DD"),
          currency: z.string().length(3).optional(),
          label: z.string().max(60).optional().describe("e.g. \"Car loan\""),
        },
        outputSchema: {
          view: z.literal("loan"),
          currency: z.string(), label: z.string(),
          amount: z.number(), annualRate: z.number(), termMonths: z.number(),
          base: amortSchema,
          withExtra: amortSchema.extend({ extraMonthly: z.number(), interestSaved: z.number(), monthsSaved: z.number() }).optional(),
          summary: z.string(),
          downloads: z.object({ schedule: z.string().url() }),
          disclaimer: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Running the numbers", invoked: "Loan calculated" }),
      },
      async ({ amount, annualRate, termMonths, extraMonthly, startDate, currency, label }) => {
        try {
          const cur = (currency ?? "USD").toUpperCase();
          const base = amortize(amount, annualRate, termMonths, { startDate });
          const withExtra = extraMonthly ? amortize(amount, annualRate, termMonths, { extraMonthly, startDate }) : undefined;
          const title = label ?? "Loan";
          const summary = `${title}: ${money2(base.payment, cur)}/month for ${termMonths} months on ${money(amount, cur)} at ${annualRate}% APR; total interest ${money(base.totalInterest, cur)}, total paid ${money(base.totalPaid, cur)}, paid off ${base.payoffDate}.` +
            (withExtra ? ` With ${money2(extraMonthly!, cur)} extra per month: paid off ${withExtra.payoffDate}, saving ${money(base.totalInterest - withExtra.totalInterest, cur)} interest and ${base.months - withExtra.months} months.` : "");
          const structured = {
            view: "loan" as const, currency: cur, label: title, amount, annualRate, termMonths,
            base: amortSummary(base),
            ...(withExtra ? { withExtra: { ...amortSummary(withExtra), extraMonthly: extraMonthly!, interestSaved: Math.round((base.totalInterest - withExtra.totalInterest) * 100) / 100, monthsSaved: base.months - withExtra.months } } : {}),
            summary,
            downloads: { schedule: ctx.fileUrl("csv", { principal: amount, rate: annualRate, months: termMonths, extraMonthly, startDate, title: `${title} ${money(amount, cur)} at ${annualRate}%` } satisfies CsvPayload, "schedule.csv") },
            disclaimer: DISCLAIMER,
          };
          return ok(`${summary} ${DISCLAIMER}`, structured);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "calculate_home_affordability",
      {
        title: "How much house can I afford",
        description:
          "Use this when the user asks how much home they can afford or what price range to shop in — e.g. \"how much house can I afford on $120k a year\", \"max mortgage with $60k down\", \"what home price fits a $3,000/month budget\". Applies the standard 28%/36% debt-to-income rules (configurable), accounts for taxes, insurance, HOA and PMI, and also gives a conservative figure. Not for a specific home's payment (use calculate_mortgage_payment).",
        inputSchema: {
          annualIncome: z.number().positive().describe("Gross household income per year"),
          monthlyDebts: z.number().min(0).optional().describe("Car loans, student loans, minimum card payments per month"),
          downPayment: z.number().min(0).describe("Cash available for the down payment"),
          annualRate: z.number().min(0).max(30).describe("Expected mortgage rate, annual %"),
          termYears: z.number().min(1).max(50).optional().describe("Default 30"),
          propertyTaxPercent: z.number().min(0).max(10).optional().describe("Default 1.1% of price per year"),
          insuranceYearly: z.number().min(0).optional().describe("Default 1500"),
          hoaMonthly: z.number().min(0).optional(),
          frontRatio: z.number().min(0.1).max(0.6).optional().describe("Max housing cost ÷ gross income (default 0.28)"),
          backRatio: z.number().min(0.1).max(0.7).optional().describe("Max (housing + debts) ÷ gross income (default 0.36)"),
          currency: z.string().length(3).optional(),
        },
        outputSchema: {
          view: z.literal("affordability"),
          currency: z.string(),
          maxPrice: z.number(), maxLoan: z.number(), downPayment: z.number(), monthlyHousingBudget: z.number(),
          limitingRule: z.enum(["front", "back"]),
          monthly: breakdownSchema,
          conservative: z.object({ maxPrice: z.number(), monthlyTotal: z.number() }),
          assumptions: z.object({ frontRatio: z.number(), backRatio: z.number(), termYears: z.number(), propertyTaxPercent: z.number(), insuranceYearly: z.number(), annualRate: z.number() }),
          summary: z.string(),
          disclaimer: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Estimating your budget", invoked: "Affordability estimated" }),
      },
      async (input) => {
        try {
          const cur = (input.currency ?? "USD").toUpperCase();
          const r = affordability(input);
          const summary = `With ${money(input.annualIncome, cur)}/year, ${money(input.monthlyDebts ?? 0, cur)}/month in debts and ${money(input.downPayment, cur)} down at ${input.annualRate}%, you could afford roughly a ${money(r.maxPrice, cur)} home (loan ${money(r.maxLoan, cur)}), with total housing costs about ${money2(r.monthly.total, cur)}/month — limited by the ${r.limitingRule === "front" ? `${Math.round(r.assumptions.frontRatio * 100)}% housing` : `${Math.round(r.assumptions.backRatio * 100)}% total debt`} rule. A more conservative budget (25% of income) is about ${money(r.conservative.maxPrice, cur)}.`;
          const structured = {
            view: "affordability" as const, currency: cur,
            maxPrice: r.maxPrice, maxLoan: r.maxLoan, downPayment: input.downPayment, monthlyHousingBudget: r.monthlyHousingBudget,
            limitingRule: r.limitingRule, monthly: r.monthly, conservative: r.conservative,
            assumptions: { ...r.assumptions, annualRate: input.annualRate },
            summary, disclaimer: DISCLAIMER,
          };
          return ok(`${summary} ${DISCLAIMER}`, structured);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "compare_refinance",
      {
        title: "Refinance break-even",
        description:
          "Use this when the user asks whether refinancing makes sense — e.g. \"should I refinance from 7.25% to 5.75%\", \"refinance break-even point\", \"how much would I save refinancing with $6k closing costs\". Compares current vs new payment, months to recoup closing costs, and lifetime interest difference.",
        inputSchema: {
          currentBalance: z.number().positive(),
          currentRate: z.number().min(0).max(30).describe("Current annual rate %"),
          remainingMonths: z.number().int().min(1).max(600),
          newRate: z.number().min(0).max(30).describe("Offered annual rate %"),
          newTermMonths: z.number().int().min(1).max(600).optional().describe("New loan term (default: same as remaining months)"),
          closingCosts: z.number().min(0).optional(),
          rollClosingCostsIntoLoan: z.boolean().optional(),
          currency: z.string().length(3).optional(),
        },
        outputSchema: {
          view: z.literal("refinance"),
          currency: z.string(),
          current: amortSchema.extend({ rate: z.number() }),
          next: amortSchema.extend({ rate: z.number(), principal: z.number() }),
          monthlySavings: z.number(),
          breakEvenMonths: z.number().nullable(),
          lifetimeSavings: z.number(),
          closingCosts: z.number(),
          summary: z.string(),
          disclaimer: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Comparing loans", invoked: "Refinance compared" }),
      },
      async (input) => {
        try {
          const cur = (input.currency ?? "USD").toUpperCase();
          const r = refinance(input);
          const summary = `Refinancing ${money(input.currentBalance, cur)} from ${input.currentRate}% to ${input.newRate}%${input.newTermMonths ? ` over ${input.newTermMonths} months` : ""} changes the payment from ${money2(r.current.payment, cur)} to ${money2(r.next.payment, cur)} (${r.monthlySavings >= 0 ? "saves" : "costs"} ${money2(Math.abs(r.monthlySavings), cur)}/month). ` +
            (r.breakEvenMonths != null ? `Closing costs of ${money(r.closingCosts, cur)} are recouped in ${r.breakEvenMonths} months. ` : r.closingCosts && !input.rollClosingCostsIntoLoan ? "The payment doesn't drop, so closing costs are never recouped through monthly savings. " : "") +
            `Over the life of the loans you ${r.lifetimeSavings >= 0 ? "save" : "pay"} about ${money(Math.abs(r.lifetimeSavings), cur)} in total payments${input.newTermMonths && input.newTermMonths > input.remainingMonths ? " (note: the new loan runs longer)" : ""}.`;
          const structured = {
            view: "refinance" as const, currency: cur,
            current: { ...amortSummary(r.current), rate: input.currentRate },
            next: { ...amortSummary(r.next), rate: input.newRate, principal: r.newPrincipal },
            monthlySavings: r.monthlySavings, breakEvenMonths: r.breakEvenMonths, lifetimeSavings: r.lifetimeSavings, closingCosts: r.closingCosts,
            summary, disclaimer: DISCLAIMER,
          };
          return ok(`${summary} ${DISCLAIMER}`, structured);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );
  },
});
