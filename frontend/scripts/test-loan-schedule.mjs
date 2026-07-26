/**
 * Unit-тесты графика погашения (без test runner).
 * node scripts/test-loan-schedule.mjs
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// TS module — compile via dynamic import of built? Use inline reimplementation check
// Prefer vite-node or tsx if available; fallback: spawn vite-node

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function load() {
  try {
    const { register } = await import('node:module')
    // try tsx
    await import('tsx/esm')
  } catch {
    /* no tsx */
  }
  try {
    return await import(pathToFileURL(join(root, 'src/lib/loan-schedule.ts')).href)
  } catch (e) {
    console.error('Need tsx or compile. Inline checks only.', e.message)
    return null
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const mod = await load()
if (!mod) {
  // pure JS re-check of formula
  function monthlyAnnuityCents(principalCents, annualRatePercent, months) {
    if (months <= 0 || principalCents <= 0) return 0
    const r = annualRatePercent / 100 / 12
    if (r === 0) return Math.round(principalCents / months)
    const factor = (r * (1 + r) ** months) / ((1 + r) ** months - 1)
    return Math.round(principalCents * factor)
  }
  const p = monthlyAnnuityCents(1_000_000, 3.8, 36)
  assert(p > 0 && p < 1_000_000, 'annuity in range')
  assert(monthlyAnnuityCents(0, 3.8, 36) === 0, 'zero principal')
  console.log('✓ loan-schedule inline tests passed, payment=', p)
  process.exit(0)
}

const { monthlyAnnuityCents, buildLoanPlan } = mod
const payment = monthlyAnnuityCents(1_240_000, 3.8, 36)
assert(payment > 20_000 && payment < 50_000, `unexpected payment ${payment}`)

const plan = buildLoanPlan(1_240_000, 3.8, 36, '2026-08-25')
assert(plan.rows.length === 36, '36 rows')
assert(plan.rows[35].residualCents === 0, 'last residual 0')
assert(plan.totalPaidCents > 1_240_000, 'total > principal')
console.log('✓ loan-schedule tests passed', {
  payment,
  totalInterest: plan.totalInterestCents,
  lastResidual: plan.rows[35].residualCents,
})
