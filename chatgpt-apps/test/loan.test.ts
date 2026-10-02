import { test } from "node:test";
import assert from "node:assert/strict";
import { affordability, amortize, monthlyPayment, mortgage, refinance } from "../src/apps/loan/lib.js";

const near = (a: number, b: number, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test("level payment formula matches textbook values", () => {
  near(monthlyPayment(200000, 6, 360), 1199.1);
  near(monthlyPayment(32000, 7.9, 60), 647.31);
  near(monthlyPayment(1200, 0, 12), 100);
});

test("amortization totals and extra payments", () => {
  const a = amortize(200000, 6, 360, { startDate: "2026-11-01" });
  assert.equal(a.months, 360);
  near(a.totalInterest, 231676.38, 1);
  assert.equal(a.rows[359].balance, 0);
  assert.equal(a.payoffDate, "2056-11");
  assert.equal(a.yearly.length, 30);
  const extra = amortize(200000, 6, 360, { extraMonthly: 200 });
  assert.ok(extra.months < 300);
  assert.ok(extra.totalInterest < a.totalInterest - 50000);
});

test("mortgage breakdown includes tax, insurance, HOA and PMI above 80% LTV", () => {
  const m = mortgage({ homePrice: 450000, downPaymentPercent: 10, annualRate: 6.5, termYears: 30, propertyTaxPercent: 1.2, insuranceYearly: 1800, hoaMonthly: 50, extraMonthly: 200 });
  assert.equal(m.loanAmount, 405000);
  assert.equal(m.ltv, 90);
  near(m.monthly.principalInterest, 2559.88, 0.05); // 405000 × r / (1 − (1+r)^−360), r = 0.065/12
  near(m.monthly.propertyTax, 450);
  near(m.monthly.insurance, 150);
  assert.ok(m.monthly.pmi > 0);
  assert.ok(m.pmiMonthsRemaining > 0 && m.pmiMonthsRemaining < 360);
  near(m.monthly.total, m.monthly.principalInterest + 450 + 150 + 50 + m.monthly.pmi, 0.05);
  assert.ok(m.withExtra!.monthsSaved > 0);
  const noPmi = mortgage({ homePrice: 450000, downPaymentPercent: 20, annualRate: 6.5, termYears: 30 });
  assert.equal(noPmi.monthly.pmi, 0);
});

test("affordability stays inside the DTI budget", () => {
  const a = affordability({ annualIncome: 120000, monthlyDebts: 600, downPayment: 60000, annualRate: 6.5 });
  assert.equal(a.monthlyHousingBudget, 2800); // 28% of 10k beats 36% - 600 = 3000
  assert.equal(a.limitingRule, "front");
  assert.ok(a.maxPrice > 300000 && a.maxPrice < 450000, String(a.maxPrice));
  assert.ok(a.monthly.total <= 2800 + 5);
  assert.ok(a.conservative.maxPrice < a.maxPrice);
});

test("refinance break-even", () => {
  const r = refinance({ currentBalance: 380000, currentRate: 7.25, remainingMonths: 324, newRate: 5.75, newTermMonths: 360, closingCosts: 6000 });
  assert.ok(r.monthlySavings > 400);
  assert.equal(r.breakEvenMonths, Math.ceil(6000 / r.monthlySavings));
  const worse = refinance({ currentBalance: 100000, currentRate: 5, remainingMonths: 120, newRate: 7, closingCosts: 1000 });
  assert.equal(worse.breakEvenMonths, null);
});
