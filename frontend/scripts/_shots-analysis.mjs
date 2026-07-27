import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const BASE = 'http://127.0.0.1:5273'
const OUT = 'e2e-artifacts/analysis'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ headless: true })
for (const vp of [{n:'320',w:320,h:800},{n:'390',w:390,h:844},{n:'1280',w:1280,h:900}]) {
  const ctx = await browser.newContext({ viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:2, isMobile:vp.w<768, hasTouch:vp.w<768, locale:'it-IT' })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  page.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()) })
  await page.goto(`${BASE}/?step=analysis`, { waitUntil:'domcontentloaded' })
  await page.waitForSelector('.vel-bank')
  const marks = []
  for (const [i, wait] of [300, 1200, 2500, 4500, 7000, 10500].entries()) {
    await page.waitForTimeout(i===0 ? wait : wait - [300,1200,2500,4500,7000,10500][i-1])
    await page.screenshot({ path:`${OUT}/${vp.n}-t${wait}.png`, fullPage:true })
    marks.push(await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.vel-bank')]
      const box = document.documentElement
      return {
        overflow: box.scrollWidth - box.clientWidth,
        rows: rows.length,
        tops: rows.map(r => Math.round(r.getBoundingClientRect().top)),
        statuses: rows.map(r => (r.querySelector('.vel-bank__status span:last-child')||{}).textContent),
        markBoxes: [...document.querySelectorAll('.vel-mark')].map(m => { const b=m.getBoundingClientRect(); return Math.round(b.width)+'x'+Math.round(b.height) }),
        shapes: [...document.querySelectorAll('.vel-mark')].map(m => m.className.replace('vel-mark ','')),
      }
    }))
  }
  console.log(vp.n, 'errors:', errs.length ? errs : 'нет')
  console.log('  overflow по кадрам:', marks.map(m=>m.overflow).join(','))
  console.log('  размеры знаков:', [...new Set(marks[5].markBoxes)].join(' '))
  console.log('  марки:', marks[5].shapes.join(' | '))
  const jitter = marks.map(m=>m.tops.join(',')) 
  console.log('  верх строк @t2500:', marks[2].tops.join(','))
  console.log('  верх строк @t10500:', marks[5].tops.join(','))
  await ctx.close()
}
await browser.close()
