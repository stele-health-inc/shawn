import { DateTime } from "luxon";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Standard level-payment formula (rate may be 0). */
export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) throw new Error("term must be at least 1 month");
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Present value of a level payment: the largest loan a payment supports. */
export function maxPrincipal(payment: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return payment * months;
  return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

export interface ScheduleRow {
  month: number;
  date: string; // YYYY-MM
  payment: number;
  principal: number;
  interest: number;
  extra: number;
  balance: number;
}

export interface Amortization {
  payment: number;
  rows: ScheduleRow[];
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffDate: string; // YYYY-MM
  yearly: Array<{ year: number; date: string; principal: number; interest: number; balance: number }>;
}

export function amortize(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  opts: { extraMonthly?: number; startDate?: string } = {},
): Amortization {
  if (principal <= 0) throw new Error("loan amount must be positive");
  if (annualRatePct < 0 || annualRatePct > 100) throw new Error("rate must be between 0 and 100 percent");
  const payment = monthlyPayment(principal, annualRatePct, termMonths);
  const r = annualRatePct / 100 / 12;
  const extra = Math.max(0, opts.extraMonthly ?? 0);
  const start = (opts.startDate ? DateTime.fromISO(opts.startDate, { zone: "UTC" }) : DateTime.utc()).startOf("month");
  if (!start.isValid) throw new Error(`Invalid startDate "${opts.startDate}" — use YYYY-MM-DD`);

  const rows: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  for (let m = 1; m <= termMonths && balance > 0.005; m++) {
    const interest = balance * r;
    let principalPart = Math.min(balance, payment - interest + extra);
    if (principalPart < 0) principalPart = 0;
    const pay = principalPart + interest;
    balance = Math.max(0, balance - principalPart);
    totalInterest += interest;
    totalPaid += pay;
    rows.push({
      month: m,
      date: start.plus({ months: m }).toFormat("yyyy-LL"),
      payment: round2(pay),
      principal: round2(principalPart),
      interest: round2(interest),
      extra: round2(Math.max(0, Math.min(extra, pay - (payment - interest > 0 ? payment - interest : 0) - interest))),
      balance: round2(balance),
    });
  }
  const yearly: Amortization["yearly"] = [];
  for (let i = 0; i < rows.length; i += 12) {
    const chunk = rows.slice(i, i + 12);
    yearly.push({
      year: Math.floor(i / 12) + 1,
      date: chunk[chunk.length - 1].date,
      principal: round2(chunk.reduce((a, b) => a + b.principal, 0)),
      interest: round2(chunk.reduce((a, b) => a + b.interest, 0)),
      balance: chunk[chunk.length - 1].balance,
    });
  }
  return {
    payment: round2(payment),
    rows,
    months: rows.length,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    payoffDate: rows.length ? rows[rows.length - 1].date : start.toFormat("yyyy-LL"),
    yearly,
  };
}

export interface MortgageInput {
  homePrice: number;
  downPayment?: number;
  downPaymentPercent?: number;
  annualRate: number;
  termYears: number;
  propertyTaxYearly?: number;
  propertyTaxPercent?: number; // of home price per year
  insuranceYearly?: number;
  hoaMonthly?: number;
  pmiRate?: number; // annual % of loan, applied while LTV > 80
  extraMonthly?: number;
  startDate?: string;
}

export interface MortgageResult {
  loanAmount: number;
  downPayment: number;
  downPaymentPercent: number;
  ltv: number;
  monthly: { principalInterest: number; propertyTax: number; insurance: number; hoa: number; pmi: number; total: number };
  pmiMonthsRemaining: number;
  base: Amortization;
  withExtra?: Amortization & { interestSaved: number; monthsSaved: number };
}

export function mortgage(i: MortgageInput): MortgageResult {
  if (i.homePrice <= 0) throw new Error("homePrice must be positive");
  let down = i.downPayment ?? (i.downPaymentPercent != null ? (i.homePrice * i.downPaymentPercent) / 100 : i.homePrice * 0.2);
  down = Math.min(Math.max(0, down), i.homePrice - 1);
  const loan = i.homePrice - down;
  const months = Math.round(i.termYears * 12);
  const base = amortize(loan, i.annualRate, months, { startDate: i.startDate });
  const ltv = (loan / i.homePrice) * 100;
  const tax = i.propertyTaxYearly ?? (i.propertyTaxPercent != null ? (i.homePrice * i.propertyTaxPercent) / 100 : 0);
  const ins = i.insuranceYearly ?? 0;
  const hoa = i.hoaMonthly ?? 0;
  const pmiRate = i.pmiRate ?? (ltv > 80 ? 0.6 : 0);
  const pmiMonthly = ltv > 80 && pmiRate > 0 ? (loan * pmiRate) / 100 / 12 : 0;
  // PMI typically cancels once the balance reaches 80% of the original price.
  let pmiMonths = 0;
  if (pmiMonthly > 0) {
    const cutoff = i.homePrice * 0.8;
    pmiMonths = base.rows.findIndex((r) => r.balance <= cutoff) + 1 || base.rows.length;
  }
  const result: MortgageResult = {
    loanAmount: round2(loan),
    downPayment: round2(down),
    downPaymentPercent: round2((down / i.homePrice) * 100),
    ltv: round2(ltv),
    monthly: {
      principalInterest: base.payment,
      propertyTax: round2(tax / 12),
      insurance: round2(ins / 12),
      hoa: round2(hoa),
      pmi: round2(pmiMonthly),
      total: round2(base.payment + tax / 12 + ins / 12 + hoa + pmiMonthly),
    },
    pmiMonthsRemaining: pmiMonths,
    base,
  };
  if (i.extraMonthly && i.extraMonthly > 0) {
    const w = amortize(loan, i.annualRate, months, { extraMonthly: i.extraMonthly, startDate: i.startDate });
    result.withExtra = { ...w, interestSaved: round2(base.totalInterest - w.totalInterest), monthsSaved: base.months - w.months };
  }
  return result;
}

export interface AffordabilityInput {
  annualIncome: number;
  monthlyDebts?: number;
  downPayment: number;
  annualRate: number;
  termYears?: number;
  propertyTaxPercent?: number;
  insuranceYearly?: number;
  hoaMonthly?: number;
  frontRatio?: number; // housing / gross income
  backRatio?: number; // (housing + debts) / gross income
}

export interface AffordabilityResult {
  maxPrice: number;
  maxLoan: number;
  monthlyHousingBudget: number;
  limitingRule: "front" | "back";
  monthly: { principalInterest: number; propertyTax: number; insurance: number; hoa: number; pmi: number; total: number };
  conservative: { maxPrice: number; monthlyTotal: number };
  assumptions: { frontRatio: number; backRatio: number; termYears: number; propertyTaxPercent: number; insuranceYearly: number };
}

export function affordability(i: AffordabilityInput): AffordabilityResult {
  if (i.annualIncome <= 0) throw new Error("annualIncome must be positive");
  const front = i.frontRatio ?? 0.28;
  const back = i.backRatio ?? 0.36;
  const term = i.termYears ?? 30;
  const taxPct = i.propertyTaxPercent ?? 1.1;
  const ins = i.insuranceYearly ?? 1500;
  const hoa = i.hoaMonthly ?? 0;
  const debts = i.monthlyDebts ?? 0;
  const gross = i.annualIncome / 12;
  const frontBudget = gross * front;
  const backBudget = gross * back - debts;
  const budget = Math.max(0, Math.min(frontBudget, backBudget));
  const limitingRule = frontBudget <= backBudget ? "front" : "back";

  const solve = (housingBudget: number) => {
    // Iterate because tax (and PMI) scale with price, which depends on the loan.
    let price = i.downPayment + maxPrincipal(Math.max(0, housingBudget - ins / 12 - hoa), i.annualRate, term * 12);
    for (let k = 0; k < 30; k++) {
      const loan = Math.max(0, price - i.downPayment);
      const pmi = loan / price > 0.8 ? (loan * 0.6) / 100 / 12 : 0;
      const pi = Math.max(0, housingBudget - (price * taxPct) / 100 / 12 - ins / 12 - hoa - pmi);
      const next = i.downPayment + maxPrincipal(pi, i.annualRate, term * 12);
      if (Math.abs(next - price) < 1) { price = next; break; }
      price = next;
    }
    price = Math.max(i.downPayment, price);
    const loan = Math.max(0, price - i.downPayment);
    const pmi = price > 0 && loan / price > 0.8 ? (loan * 0.6) / 100 / 12 : 0;
    const pi = loan > 0 ? monthlyPayment(loan, i.annualRate, term * 12) : 0;
    return { price, loan, monthly: { principalInterest: round2(pi), propertyTax: round2((price * taxPct) / 100 / 12), insurance: round2(ins / 12), hoa: round2(hoa), pmi: round2(pmi), total: round2(pi + (price * taxPct) / 100 / 12 + ins / 12 + hoa + pmi) } };
  };
  const main = solve(budget);
  const cons = solve(Math.max(0, Math.min(gross * 0.25, backBudget)));
  return {
    maxPrice: Math.round(main.price / 1000) * 1000,
    maxLoan: Math.round(main.loan),
    monthlyHousingBudget: round2(budget),
    limitingRule,
    monthly: main.monthly,
    conservative: { maxPrice: Math.round(cons.price / 1000) * 1000, monthlyTotal: cons.monthly.total },
    assumptions: { frontRatio: front, backRatio: back, termYears: term, propertyTaxPercent: taxPct, insuranceYearly: ins },
  };
}

export interface RefinanceInput {
  currentBalance: number;
  currentRate: number;
  remainingMonths: number;
  newRate: number;
  newTermMonths?: number;
  closingCosts?: number;
  rollClosingCostsIntoLoan?: boolean;
}

export function refinance(i: RefinanceInput) {
  const newTerm = i.newTermMonths ?? i.remainingMonths;
  const closing = i.closingCosts ?? 0;
  const newPrincipal = i.currentBalance + (i.rollClosingCostsIntoLoan ? closing : 0);
  const current = amortize(i.currentBalance, i.currentRate, i.remainingMonths);
  const next = amortize(newPrincipal, i.newRate, newTerm);
  const monthlySavings = round2(current.payment - next.payment);
  const upfront = i.rollClosingCostsIntoLoan ? 0 : closing;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(upfront / monthlySavings) : null;
  const lifetimeSavings = round2(current.totalPaid - next.totalPaid - upfront);
  return { current, next, monthlySavings, breakEvenMonths, lifetimeSavings, newPrincipal: round2(newPrincipal), closingCosts: closing };
}

export function money(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}
export function money2(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function scheduleCsv(a: Amortization, title: string): string {
  const lines = [title, "", "Month,Date,Payment,Principal,Interest,Extra,Balance"];
  for (const r of a.rows) lines.push([r.month, r.date, r.payment, r.principal, r.interest, r.extra, r.balance].join(","));
  lines.push("", `Total interest,${a.totalInterest}`, `Total paid,${a.totalPaid}`, `Payoff,${a.payoffDate}`);
  return lines.join("\r\n") + "\r\n";
}
