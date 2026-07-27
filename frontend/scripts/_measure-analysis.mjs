/** Замер длительности проверки одного банка на экране опроса. */
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5273'

const TRACK = () => {
  const t0 = performance.now()
  const log = []
  const seen = new Map()
  const timer = setInterval(() => {
    const rows = document.querySelectorAll('.vel-bank')
    rows.forEach((row, i) => {
      const label = row.querySelector('.vel-bank__status span:last-child')
      const text = label ? label.textContent.trim() : ''
      const prev = seen.get(i)
      if (prev !== text) {
        seen.set(i, text)
        log.push({ row: i, text, at: Math.round(performance.now() - t0) })
      }
    })
  }, 20)
  window.__stop = () => {
    clearInterval(timer)
    return log
  }
}

async function run(fast) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'it-IT' })
  const page = await context.newPage()
  await page.addInitScript(TRACK)
  await page.goto(`${BASE}/?step=analysis${fast ? '&fastAnim=1' : ''}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vel-bank')
  await page.waitForTimeout(fast ? 6000 : 20000)
  const log = await page.evaluate(() => window.__stop())
  await browser.close()

  const start = new Map()
  const durations = []
  let firstCheck = null
  let lastVerify = 0
  let maxParallel = 0
  const events = []
  for (const e of log) {
    if (e.text === 'Verifica in corso') {
      start.set(e.row, e.at)
      if (firstCheck === null) firstCheck = e.at
      events.push({ at: e.at, d: 1 })
    }
    if (e.text === 'Verificata') {
      const s = start.get(e.row)
      if (s !== undefined) durations.push(e.at - s)
      lastVerify = Math.max(lastVerify, e.at)
      events.push({ at: e.at, d: -1 })
    }
  }
  events.sort((a, b) => a.at - b.at)
  let cur = 0
  for (const e of events) {
    cur += e.d
    maxParallel = Math.max(maxParallel, cur)
  }
  durations.sort((a, b) => a - b)
  const avg = Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
  return {
    mode: fast ? 'fastAnim=1' : 'обычный',
    banks: durations.length,
    min: durations[0],
    max: durations[durations.length - 1],
    avg,
    maxParallel,
    firstCheckAt: firstCheck,
    totalMs: lastVerify - firstCheck,
  }
}

console.log(JSON.stringify(await run(false), null, 2))
console.log(JSON.stringify(await run(true), null, 2))
