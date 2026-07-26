/**
 * Аудит мобильной вёрстки: измеряет, а не «смотрит глазами».
 *
 * Запуск:
 *   node scripts/audit-mobile.mjs                    # все сценарии
 *   node scripts/audit-mobile.mjs cabinet-home       # только совпадающие по id
 *   VEL_BASE=http://127.0.0.1:5273 node scripts/audit-mobile.mjs
 *   VEL_SHOTS=1 node scripts/audit-mobile.mjs        # + скриншоты
 *
 * Что ищет на каждой ширине:
 *   1. horizontal-scroll — документ шире окна (главный «съезд»);
 *   2. overflow-x        — конкретный элемент вылезает за правый край окна;
 *   3. clipped-x         — содержимое обрезано по горизонтали (overflow:hidden
 *                          без text-overflow:ellipsis) — текст «не помещается»;
 *   4. clipped-y         — содержимое обрезано по вертикали;
 *   5. tap-target        — интерактивный элемент меньше 44×44 (WCAG 2.5.5);
 *   6. under-fixed       — содержимое уезжает под фиксированную нижнюю панель;
 *   7. overlap           — два соседних блока налезают друг на друга.
 *
 * Результат: e2e-artifacts/mobile-audit.json + консольная сводка.
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.VEL_BASE || 'http://127.0.0.1:5273'
const OUT = join(process.cwd(), 'e2e-artifacts')
const SHOTS = process.env.VEL_SHOTS === '1'
mkdirSync(OUT, { recursive: true })
if (SHOTS) mkdirSync(join(OUT, 'mobile'), { recursive: true })

const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'))

/** Ширины: 320 — минимум, который обязан жить; 768 — планшет/поворот. */
const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '360', width: 360, height: 740 },
  { name: '390', width: 390, height: 844 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
]

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const file = (name = 'doc.png') => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_1PX, 'base64'),
})

/* ------------------------------------------------------------------ *
 * Сидирование состояния: без бэкенда кабинет живёт в localStorage.
 * ------------------------------------------------------------------ */

const SEED_FRESH = {}
const SEED_DOCS = {
  'velora:account:documents': 'true',
  'velora:account:step': 'signature',
  'velora:account:completed': '["simulation","approval","account","documents"]',
}
const SEED_DONE = {
  'velora:account:documents': 'true',
  'velora:account:signed': 'true',
  'velora:account:iban': 'true',
  'velora:account:step': 'signature',
  'velora:account:completed': '["simulation","approval","account","documents","signature"]',
}

async function seed(context, entries) {
  await context.addInitScript((data) => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('velora:')) localStorage.removeItem(k)
      }
      localStorage.setItem('velora:fastAnim', '1')
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      /*
        Заставка входа гасится заранее. Пока она на экране, оболочка ставит на
        кабинет inert — и зонд честно считает ВСЁ его содержимое невидимым,
        то есть проверка молча проходит вхолостую. На этом уже обожглись:
        первый прогон дал «0 замечаний» ровно потому, что мерил экран под
        шторкой. Ключ тот же, что у самого компонента.
      */
      sessionStorage.setItem('velora:cabinet:welcome-seen', 'true')
    } catch {
      /* приватный режим — состояние просто не переживёт перезагрузку */
    }
  }, entries)
}

/** Ждём, пока заставка уйдёт: страховка на случай, если ключ не сработал. */
async function settle(page) {
  await page
    .waitForFunction(
      () => {
        const splash = document.querySelector('.vel-splash')
        const frame = document.querySelector('.vel-cabinet__frame')
        return splash === null && (frame === null || !frame.hasAttribute('inert'))
      },
      { timeout: 8000 },
    )
    .catch(() => {})
}

/* ------------------------------------------------------------------ *
 * Сценарии.
 * ------------------------------------------------------------------ */

const byName = (page, re) => page.getByRole('button', { name: re }).first()

async function clickIf(page, re, { timeout = 2500 } = {}) {
  const btn = byName(page, re)
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ timeout }).catch(() => {})
    await page.waitForTimeout(450)
    return true
  }
  return false
}

const SCENARIOS = [
  { id: 'landing', url: '/', storage: SEED_FRESH },
  { id: 'landing-ru', url: '/?lang=ru', storage: SEED_FRESH },
  { id: 'email-sent', url: '/?view=email', storage: SEED_FRESH },

  { id: 'wizard-purpose', url: '/?step=purpose', storage: SEED_FRESH },
  {
    id: 'wizard-amount',
    url: '/?step=amount',
    storage: SEED_FRESH,
  },
  { id: 'wizard-duration', url: '/?step=duration', storage: SEED_FRESH },
  { id: 'wizard-identity', url: '/?step=identity', storage: SEED_FRESH },
  { id: 'wizard-analysis', url: '/?step=analysis&fastAnim=1', storage: SEED_FRESH },
  { id: 'wizard-result', url: '/?step=result&fastAnim=1', storage: SEED_FRESH },

  { id: 'cabinet-home', url: '/?view=cabinet&fastAnim=1', storage: SEED_FRESH },
  { id: 'cabinet-home-docs', url: '/?view=cabinet&fastAnim=1', storage: SEED_DOCS },
  { id: 'cabinet-home-done', url: '/?view=cabinet&fastAnim=1', storage: SEED_DONE },
  { id: 'cabinet-profile', url: '/?view=cabinet&tab=profile&fastAnim=1', storage: SEED_DONE },
  { id: 'cabinet-documents', url: '/?view=cabinet&tab=documents&fastAnim=1', storage: SEED_DONE },
  { id: 'cabinet-support', url: '/?view=cabinet&tab=support&fastAnim=1', storage: SEED_DONE },
  {
    id: 'cabinet-profile-ru',
    url: '/?view=cabinet&tab=profile&fastAnim=1&lang=ru',
    storage: SEED_DONE,
  },

  { id: 'comm-l2', url: '/?view=cabinet&commLevel=2&fastAnim=1', storage: SEED_DONE },
  { id: 'comm-l3', url: '/?view=cabinet&commLevel=3&fastAnim=1', storage: SEED_DONE },
  { id: 'comm-l4', url: '/?view=cabinet&commLevel=4&fastAnim=1', storage: SEED_DONE },

  {
    id: 'cabinet-upload',
    url: '/?view=cabinet&fastAnim=1',
    storage: SEED_FRESH,
    async act(page) {
      const input = page.locator('input[type=file]').first()
      if (await input.count()) {
        await input.setInputFiles(file('passaporto.png'))
        await page.waitForTimeout(600)
      }
    },
  },
  {
    id: 'cabinet-signature-dialog',
    url: '/?view=cabinet&fastAnim=1',
    storage: SEED_DOCS,
    async act(page) {
      await clickIf(page, /Firma il contratto|Подписать|^Firma$/i)
    },
  },
  {
    id: 'cabinet-payout-dialog',
    url: '/?view=cabinet&fastAnim=1',
    storage: SEED_DONE,
    async act(page) {
      await clickIf(page, /Preleva|Вывести/i)
    },
  },
  {
    id: 'cabinet-payout-sepa',
    url: '/?view=cabinet&fastAnim=1',
    storage: SEED_DONE,
    async act(page) {
      await clickIf(page, /Preleva|Вывести/i)
      await clickIf(page, /Conferma|Подтверд|Continua|Далее/i)
    },
  },
  {
    id: 'cabinet-loan-details',
    url: '/?view=cabinet&fastAnim=1',
    storage: SEED_DONE,
    async act(page) {
      await clickIf(page, /Prestito|Кредит|Dettagli/i)
    },
  },
  {
    id: 'cabinet-messenger',
    url: '/?view=cabinet&tab=support&fastAnim=1',
    storage: SEED_DONE,
    async act(page) {
      const ta = page.locator('textarea').first()
      if (await ta.isVisible().catch(() => false)) {
        await ta.fill(
          'Buongiorno, ho effettuato il pagamento della commissione — allego la ricevuta bancaria in formato PDF.',
        )
        await page.waitForTimeout(300)
      }
    },
  },
]

/* ------------------------------------------------------------------ *
 * Измерение в браузере.
 * ------------------------------------------------------------------ */

const PROBE = () => {
  const vw = document.documentElement.clientWidth
  const issues = []
  const seen = new Set()

  const path = (el) => {
    const parts = []
    let node = el
    while (node && node.nodeType === 1 && parts.length < 4) {
      let s = node.tagName.toLowerCase()
      const cls = (node.getAttribute('class') || '')
        .split(/\s+/)
        .filter((c) => c && !/^(is-|has-)/.test(c))
        .slice(0, 2)
        .join('.')
      if (cls) s += '.' + cls
      parts.unshift(s)
      node = node.parentElement
    }
    return parts.join(' > ')
  }

  const push = (type, el, detail, extra = {}) => {
    const key = type + '|' + path(el) + '|' + detail
    if (seen.has(key)) return
    seen.add(key)
    issues.push({ type, selector: path(el), detail, text: (el.innerText || '').trim().slice(0, 70), ...extra })
  }

  const visible = (el, r) => {
    if (r.width === 0 || r.height === 0) return false
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') return false
    if (Number(cs.opacity) === 0) return false
    if (el.closest('[hidden],[aria-hidden="true"],[inert]')) return false
    // .sr-only и прочие «только для скринридера»
    if (r.width <= 1 && r.height <= 1) return false
    if (cs.clipPath === 'inset(50%)') return false
    return true
  }

  /*
   * Предок, который обрезает по горизонтали: прокрутка (auto/scroll) или
   * обрезка (hidden/clip). В обоих случаях вылет наружу законен — карусель,
   * полоса шагов, «вылет» фотографии за край секции сделаны именно так, и
   * документ они не расширяют.
   */
  const clippedByAncestor = (el) => {
    let node = el.parentElement
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node)
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true
      node = node.parentElement
    }
    return false
  }

  /* Обрезку текста ищем только там, где текст есть: у картинки, холста и
     видео «содержимое шире рамки» — это кадрирование, а не поломка. */
  const NON_TEXT = new Set(['IMG', 'CANVAS', 'SVG', 'VIDEO', 'PICTURE', 'FIGURE', 'IFRAME'])
  const holdsText = (el) => {
    if (NON_TEXT.has(el.tagName)) return false
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.nodeValue.trim() !== '') return true
    }
    return false
  }

  const all = [...document.querySelectorAll('body *')]

  /* 1 + 2. Горизонтальный вылет. */
  const docOverflow = Math.round(document.documentElement.scrollWidth - vw)
  if (docOverflow > 1) {
    issues.push({ type: 'horizontal-scroll', selector: 'html', detail: `+${docOverflow}px`, text: '' })
  }

  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (!visible(el, r)) continue

    const overRight = Math.round(r.right - vw)
    const overLeft = Math.round(-r.left)
    if ((overRight > 1 || overLeft > 1) && !clippedByAncestor(el)) {
      const cs = getComputedStyle(el)
      // Декоративные слои с overflow:hidden у предка обрезаются законно.
      if (cs.position !== 'fixed') {
        push(
          'overflow-x',
          el,
          overRight > 1 ? `right +${overRight}px (w=${Math.round(r.width)})` : `left -${overLeft}px`,
          { over: Math.max(overRight, overLeft) },
        )
      }
    }

    /* 3 + 4. Обрезанный ТЕКСТ — то самое «не помещается». */
    const cs = getComputedStyle(el)
    if (!holdsText(el)) continue

    const clipX = Math.round(el.scrollWidth - el.clientWidth)
    if (
      clipX > 1 &&
      /(hidden|clip)/.test(cs.overflowX) &&
      cs.textOverflow !== 'ellipsis' &&
      el.clientWidth > 0
    ) {
      push('clipped-x', el, `scrollW ${el.scrollWidth} > clientW ${el.clientWidth}`, { over: clipX })
    }

    const clipY = Math.round(el.scrollHeight - el.clientHeight)
    if (clipY > 2 && /(hidden|clip)/.test(cs.overflowY) && el.clientHeight > 0) {
      push('clipped-y', el, `scrollH ${el.scrollHeight} > clientH ${el.clientHeight}`, { over: clipY })
    }
  }

  /*
   * 3b. ОБРЕЗАННАЯ ГРУППА КОНТРОЛОВ — слепое пятно, которое зонд пропускал.
   *
   * Проверка выше требует, чтобы обрезающий элемент САМ держал текст
   * (holdsText). Это отсекало шум от карусели и кадрированных фотографий, но
   * заодно пропускало настоящий дефект: у переключателя языка текст лежит в
   * кнопках, а обрезает их РОДИТЕЛЬСКАЯ группа с overflow: hidden. На 320px
   * ей не хватало 16px, и подпись «RU» разрезало пополам вместе с рамкой —
   * зонд при этом рапортовал «0 замечаний», потому что сама группа текста
   * не содержит, а кнопки внутри не обрезаны.
   *
   * Отсюда отдельное правило: обрезающий элемент, ВНУТРИ которого есть
   * интерактивные потомки, обязан вмещать их целиком. Клипу без контролов
   * (фотография, полоса, декоративный слой) правило не мешает.
   */
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (!visible(el, r)) continue

    const cs = getComputedStyle(el)
    if (!/(hidden|clip)/.test(cs.overflowX)) continue

    const clipX = Math.round(el.scrollWidth - el.clientWidth)
    if (clipX <= 1 || el.clientWidth === 0) continue

    // Прокручиваемым контейнерам это законно: они для того и сделаны.
    if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflowY)) continue

    /*
     * Мало того, что контейнер обрезает и внутри есть контролы, — нужно, чтобы
     * за край уходил ИМЕННО КОНТРОЛ. Иначе правило ловит совсем другое:
     * бегущую по периметру искру border-beam и прочие декоративные слои,
     * которые за край выходят намеренно и ради этого и обрезаны. Проверено:
     * без этого условия зонд поднимал два ложных срабатывания — на карточке
     * полиса и на экране результата мастера.
     */
    const inner = r.left + (parseFloat(cs.borderLeftWidth) || 0)
    const outer = r.right - (parseFloat(cs.borderRightWidth) || 0)

    const cut = [
      ...el.querySelectorAll('a[href],button,input,select,textarea,[role="button"]'),
    ].filter((control) => {
      const cr = control.getBoundingClientRect()
      if (cr.width === 0 || cr.height === 0) return false
      return cr.right > outer + 1 || cr.left < inner - 1
    })

    if (cut.length === 0) continue

    push(
      'clipped-controls',
      el,
      `обрезано контролов: ${cut.length} (scrollW ${el.scrollWidth} > clientW ${el.clientWidth})`,
      { over: clipX },
    )
  }

  /* 5. Цели нажатия. */
  const TAPS = 'a[href],button,input,select,textarea,summary,[role="button"],[role="tab"],[role="switch"],[role="link"]'
  for (const el of document.querySelectorAll(TAPS)) {
    const r = el.getBoundingClientRect()
    if (!visible(el, r)) continue
    if (el.disabled) continue
    const cs = getComputedStyle(el)
    if (cs.pointerEvents === 'none') continue
    // Ссылка внутри абзаца — часть текста, к ней правило 44px не применяют.
    if (el.tagName === 'A' && el.closest('p,li')) continue
    if (el.type === 'file') continue
    // Отладочная панель уровней комиссии в production не монтируется.
    if (el.closest('[data-testid="dev-commission-bar"]')) continue
    const w = Math.round(r.width)
    const h = Math.round(r.height)
    if (w < 44 || h < 44) {
      push('tap-target', el, `${w}×${h}`, { w, h })
    }
  }

  /* 6. Содержимое под фиксированной нижней панелью. */
  const fixedBottom = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed') return false
    const r = el.getBoundingClientRect()
    // Именно ПАНЕЛЬ у нижнего края, а не полноэкранная шторка: у последней
    // содержимое под ней перекрыто намеренно.
    return (
      visible(el, r) &&
      r.bottom >= window.innerHeight - 4 &&
      r.height > 20 &&
      r.height < window.innerHeight * 0.4 &&
      r.width > vw * 0.5
    )
  })
  for (const bar of fixedBottom) {
    const br = bar.getBoundingClientRect()
    const main = document.querySelector('main') || document.body
    const docBottom = main.getBoundingClientRect().bottom
    const scrolledToEnd =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
    if (scrolledToEnd && docBottom > br.top + 2) {
      push('under-fixed', main, `content bottom ${Math.round(docBottom)} > bar top ${Math.round(br.top)}`)
    }
  }

  return { vw, docScrollWidth: document.documentElement.scrollWidth, issues }
}

/* ------------------------------------------------------------------ */

const results = []

const browser = await chromium.launch({ headless: true })

for (const sc of SCENARIOS) {
  if (ONLY.length && !ONLY.some((o) => sc.id.includes(o))) continue

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.width < 768,
      hasTouch: vp.width < 768,
      locale: 'it-IT',
    })
    await seed(context, sc.storage || {})
    const page = await context.newPage()

    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') pageErrors.push('console: ' + m.text())
    })

    try {
      await page.goto(BASE + sc.url, { waitUntil: 'networkidle', timeout: 30000 })
      await settle(page)
      await page.waitForTimeout(700)
      if (sc.act) await sc.act(page)
      await page.waitForTimeout(400)

      // Контрольная проверка: содержимое действительно доступно для замера.
      const measurable = await page.evaluate(() => {
        const frame = document.querySelector('.vel-cabinet__frame')
        const inert = frame !== null && frame.hasAttribute('inert')
        const nodes = document.querySelectorAll('main *').length
        return { inert, nodes }
      })
      if (measurable.inert || measurable.nodes < 5) {
        pageErrors.push(
          `ЗОНД ВХОЛОСТУЮ: inert=${measurable.inert}, узлов в main=${measurable.nodes}`,
        )
      }

      // Первый замер — верх страницы.
      const top = await page.evaluate(PROBE)

      // Второй — низ: там всплывают «под фиксированной панелью» и длинные списки.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(500)
      const bottom = await page.evaluate(PROBE)

      const merged = []
      const key = (i) => i.type + '|' + i.selector + '|' + i.detail
      const seen = new Set()
      for (const i of [...top.issues, ...bottom.issues]) {
        if (seen.has(key(i))) continue
        seen.add(key(i))
        merged.push(i)
      }

      if (SHOTS) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(200)
        await page
          .screenshot({ path: join(OUT, 'mobile', `${sc.id}-${vp.name}.png`), fullPage: true })
          .catch(() => {})
      }

      results.push({
        scenario: sc.id,
        url: sc.url,
        viewport: vp.name,
        docScrollWidth: top.docScrollWidth,
        vw: top.vw,
        pageErrors,
        issues: merged,
      })

      const bad = merged.length
      const mark = bad === 0 ? '✓' : '✗'
      console.log(`${mark} ${sc.id.padEnd(26)} ${vp.name.padEnd(4)} issues=${bad}${pageErrors.length ? ' err=' + pageErrors.length : ''}`)
    } catch (e) {
      results.push({ scenario: sc.id, viewport: vp.name, error: String(e).slice(0, 300), issues: [] })
      console.log(`! ${sc.id} ${vp.name} — ${String(e).slice(0, 120)}`)
    } finally {
      await context.close()
    }
  }
}

await browser.close()

/* ---------------------------- сводка ---------------------------- */

const flat = results.flatMap((r) => r.issues.map((i) => ({ ...i, scenario: r.scenario, viewport: r.viewport })))
const byType = {}
for (const i of flat) byType[i.type] = (byType[i.type] || 0) + 1

// Группируем по «селектор + тип»: одна причина обычно бьёт на многих ширинах.
const groups = new Map()
for (const i of flat) {
  const k = i.type + ' :: ' + i.selector
  if (!groups.has(k)) groups.set(k, { type: i.type, selector: i.selector, hits: [], text: i.text, worst: 0 })
  const g = groups.get(k)
  g.hits.push(`${i.scenario}@${i.viewport}`)
  g.worst = Math.max(g.worst, i.over || 0)
  if (!g.detail || (i.over || 0) >= g.worst) g.detail = i.detail
}
const ranked = [...groups.values()].sort((a, b) => b.hits.length - a.hits.length || b.worst - a.worst)

writeFileSync(
  join(OUT, 'mobile-audit.json'),
  JSON.stringify({ base: BASE, byType, total: flat.length, groups: ranked, results }, null, 2),
)

console.log('\n===== СВОДКА =====')
console.log(JSON.stringify(byType, null, 2))
console.log(`всего замечаний: ${flat.length}, уникальных причин: ${ranked.length}`)
console.log('\nТоп причин:')
for (const g of ranked.slice(0, 40)) {
  console.log(`  [${g.type}] ${g.selector}\n     ${g.detail} — ${g.hits.length}× (${g.hits.slice(0, 4).join(', ')}${g.hits.length > 4 ? ', …' : ''})`)
}
console.log(`\nJSON: ${join(OUT, 'mobile-audit.json')}`)

const pageErrCount = results.reduce((n, r) => n + (r.pageErrors?.length || 0), 0)
if (pageErrCount) console.log(`\n⚠ ошибок в консоли: ${pageErrCount}`)
