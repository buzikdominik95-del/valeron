/**
 * Полный прогон кабинета и воронки комиссий (Playwright напрямую, без раннера).
 *
 * ЗАПУСК: node scripts/e2e-commission-flow.mjs
 * Адрес стенда: VEL_BASE. Без него пробуются localhost:5173 и 127.0.0.1:5173 —
 * см. pickBase(): vite слушает «localhost», а это на Node ≥17 сперва ::1, и
 * жёстко зашитый 127.0.0.1 давал ERR_CONNECTION_REFUSED на живом сервере.
 *
 * ГЛАВНОЕ СВОЙСТВО СЦЕНАРИЯ — ОН ОБЯЗАН ДОЙТИ ДО КОНЦА.
 *
 * Прежняя версия падала целиком на первом же невыполнимом действии: одна
 * click() по отсутствующей кнопке бросала TimeoutError, процесс умирал, и три
 * четверти проверок (подпись, реквизиты, уровни L2…L4, детали кредита) просто
 * не выполнялись. Регрессионная сетка при этом молчала не потому, что всё
 * хорошо, а потому, что до неё не дошли. Поэтому здесь каждая проверка
 * обёрнута в check(): своя ошибка ловится, записывается провалом и прогон
 * идёт дальше. Целый блок обёрнут в section() — падение внутри одного шага
 * не уносит соседние. Итог: сводка + ненулевой код возврата, если провалы есть.
 *
 * ОЖИДАНИЯ КОРОТКИЕ И ЯВНЫЕ. Умолчание Playwright — 30 с на действие; на
 * отсутствующем элементе это полминуты простоя на каждую проверку. Здесь
 * действия ограничены ACTION_MS, а долгие ожидания (анимация перевода) сделаны
 * опросом waitUntil() с собственным сроком — он завершается сразу по факту,
 * а не по «подождём на всякий случай 14 секунд».
 *
 * ─── ЧТО ПЕРЕЕХАЛО В ПРИЛОЖЕНИИ И ЧТО ИЗ-ЗА ЭТОГО ЗДЕСЬ ───────────────────
 *
 * 1. ПАНЕЛИ ДОКУМЕНТОВ И ДОГОВОРА УШЛИ С HOME В РАЗДЕЛ «Documenti»
 *    (?view=cabinet&tab=documents, см. VelAccount.vue → VelCabinetDocuments).
 *    На Home остались карточка суммы, воронка перевода и полис. Сценарий
 *    поэтому ходит по вкладкам: openTab() кликает настоящую ссылку меню (это
 *    и есть путь пользователя), а если ссылка недоступна — уходит на прямой
 *    адрес, чтобы блок проверок всё равно отработал.
 *
 * 2. ЭКРАН ДОКУМЕНТОВ ПЕРЕДЕЛАН: сперва выбирают ВИД удостоверения (три
 *    радиостроки VelDocKindChoice), и только потом появляются слоты под снимки —
 *    один у паспорта, два у карты и прав, — и кнопка «Carica il documento».
 *    Сценарий повторяет этот порядок: выбор вида → снимки по числу сторон →
 *    загрузка → «Verificato».
 *
 * СЕЛЕКТОРЫ: data-testid, роли и aria-имена. Классов нет ни одного: там, где
 * ни testid, ни роли не хватает, взяты атрибуты самих контролов
 * (input[type=radio][value=…]) — см. отчёт о недостающих testid.
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'e2e-artifacts')
mkdirSync(OUT, { recursive: true })

/** Срок обычного действия. Короткий намеренно: см. шапку. */
const ACTION_MS = 4000
/** Срок навигации: dev-сервер на холодную собирает модули дольше. */
const NAV_MS = 20000

/**
 * Куда стучаться. VEL_BASE перебивает всё; иначе пробуем оба написания
 * локального адреса — какое из них живое, решает pickBase() один раз.
 */
const BASE_CANDIDATES = process.env.VEL_BASE
  ? [process.env.VEL_BASE.replace(/\/+$/, '')]
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

let BASE = BASE_CANDIDATES[0]

/* ─── Учёт результатов ────────────────────────────────────────────────────── */

const findings = []

function ok(name, detail = '') {
  findings.push({ ok: true, name, detail })
  console.log(`  + ${name}${detail ? ' — ' + detail : ''}`)
}

function bad(name, detail = '') {
  findings.push({ ok: false, name, detail })
  console.log(`  - ${name}${detail ? ' — ' + detail : ''}`)
}

function oneLine(value, max = 220) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * Одна проверка. Бросок внутри fn — это провал ИМЕННО ЭТОЙ проверки, а не
 * конец прогона. Возврат строки идёт в подпись результата.
 */
async function check(name, fn) {
  try {
    const detail = await fn()
    ok(name, typeof detail === 'string' ? detail : '')
    return true
  } catch (error) {
    bad(name, oneLine(error instanceof Error ? error.message : error))
    return false
  }
}

/** Блок проверок. Ловит то, что не поймал check(), — подготовку состояния. */
async function section(title, fn) {
  console.log(`\n=== ${title} ===`)
  try {
    await fn()
  } catch (error) {
    bad(`section «${title}» aborted`, oneLine(error instanceof Error ? error.message : error))
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Опрос до истины. Заменяет и waitForTimeout «на всякий случай», и
 * бесконечное ожидание Playwright: срок свой, сообщение своё.
 */
async function waitUntil(probe, { timeout = ACTION_MS, interval = 120, what = 'condition' } = {}) {
  const deadline = Date.now() + timeout
  for (;;) {
    let hit = false
    try {
      hit = Boolean(await probe())
    } catch {
      hit = false
    }
    if (hit) return true
    if (Date.now() >= deadline) throw new Error(`timeout ${timeout}ms waiting for ${what}`)
    await sleep(interval)
  }
}

/** Снимок экрана. Сам по себе провалом не считается: артефакт, а не проверка. */
async function shot(page, name) {
  try {
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true, timeout: 10000 })
  } catch (error) {
    console.log(`  · screenshot ${name} skipped — ${oneLine(error?.message)}`)
  }
}

/* ─── Строки экрана (it — язык по умолчанию, ru — на случай переключения) ──── */

const RE = {
  withdraw: /Preleva i fondi|Вывести средства/i,
  docSubmit: /Carica il documento|Загрузить документ/i,
  docVerified: /Verificato|Проверен/i,
  slotEmpty: /Nessuna foto scelta|Снимок не выбран/i,
  sign: /Firma il contratto|Подписать договор/i,
  signed: /Contratto firmato|Договор подписан/i,
  signConfirm: /Conferma firma|Подтвердить подпись/i,
  signName: /Nome e cognome|Имя и фамилия/i,
  payoutSubmit: /Avvia il trasferimento|Начать перевод/i,
  holder: /Intestatario|Владелец/i,
  sepa: /SEPA/i,
  beneficiary: /Beneficiario|Получатель/i,
  sendMessage: /Invia al consulente|Отправить консультанту/i,
  waiting: /Richiesta inviata|Заявка отправлена/i,
  animating: /Trasferimento fondi in elaborazione|Обработка перевода средств/i,
  bankNotice: /Dati inviati alla banca|Данные отправлены в банк/i,
  bankNoticeCta: /Continua|Продолжить/i,
  suspended:
    /Dati trasmessi|Данные переданы|Autorizzazione non completata|Авторизация не завершена/i,
  suspensionCta:
    /Paga la copertura assicurativa|Погасить страховку|Dettagli della sospensione|Подробности приостановки/i,
  policyBuild:
    /Ottenimento del certificato CPI|Получение сертификата CPI|Creazione del certificato|Создание сертификата/i,
  cpiReady: /Certificato pronto|Сертификат готов/i,
  cpiConsult: /Consulta il contratto|Проконсультироваться/i,
  cpiViewConfirm: /Confermo di aver consultato|Подтверждаю, что просмотрел/i,
  cpiPay: /Fondi di verifica|Проверочные средства/i,
  amlCta: /Paga i fondi di verifica|Оплатить проверочные средства|Paga la commissione AML|Оплатить комиссию AML/i,
  failed:
    /Operazione di prelievo rifiutata|В выводе средств отказано|Rifiuto del server|Отказ сервера|Il bonifico non è andato a buon fine|Банковский перевод не выполнен/i,
  managerCta: /Scrivi al manager|Написать менеджеру|Обратиться к менеджеру/i,
  supportTitle: /^(Assistenza|Поддержка)$/,
  loanButton: /^(Prestito|Кредит)$/,
  amortization: /Piano di ammortamento|График погашения|Ammortamento/i,
  openPdf: /Apri PDF|Открыть PDF/i,
  /* Полоса шагов в шапке кабинета (VelTrackerBar) */
  trackerNav: /Avanzamento della tua pratica|Ход вашей заявки/i,
  /* Ссылка шага в полосе. Её доступное имя — не название шага, а вся фраза
     «Vai al passaggio: Documenti» (account.progress.goStep), поэтому якорей
     ^…$ здесь быть не может — в отличие от пунктов меню разделов. */
  trackerDocuments: /Documenti|Документы/i,
  /* Меню разделов кабинета (VelCabinetNav). Апостроф в «dell’area» —
     типографский, поэтому обрываем строку до него. */
  cabinetNav: /Sezioni dell|Разделы личного кабинета/i,
}

/** Заголовки разделов: по ним видно, что вкладка действительно сменилась. */
const TAB_HEADING = {
  home: /La tua pratica|Ваша заявка/i,
  profile: /Il tuo profilo|Ваш профиль/i,
  documents: /I tuoi documenti|Ваши документы/i,
  support: /^(Assistenza|Поддержка)$/,
}

/** Доступные имена пунктов меню кабинета. */
const TAB_LINK = {
  home: /^(Home|Главная)$/,
  profile: /^(Profilo|Профиль)$/,
  documents: /^(Documenti|Документы)$/,
  support: /Assistenza|Поддержка/i,
}

/** Вид документа → сколько снимков просит. Зеркало DOC_KIND_SIDES из приложения. */
const DOC_SIDES_BY_KIND = { passport: 1, idCard: 2, licence: 2 }

const ALL_STEPS = ['simulation', 'approval', 'account', 'documents', 'signature']

/** Однопиксельный PNG: содержимое снимка приложению безразлично, важен тип. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const photo = (name) => ({ name, mimeType: 'image/png', buffer: PNG_1PX })

/* ─── Локаторы ────────────────────────────────────────────────────────────── */

/* Якорь панели загрузки остался прежним (#vel-account-documents), но живёт он
   теперь в разделе «Documenti», а не на Home — см. VelCabinetDocuments.vue. */
const docsPanel = (page) => page.locator('#vel-account-documents')
const docSlots = (page) => docsPanel(page).locator('[data-testid="doc-slot"]')
const docKindRadios = (page) => docsPanel(page).locator('input[type="radio"]')
const docFileInputs = (page) => docsPanel(page).locator('[data-testid="doc-slot"] input[type="file"]')
const docSubmitBtn = (page) => docsPanel(page).getByRole('button', { name: RE.docSubmit })
const withdrawBtn = (page) => page.getByRole('button', { name: RE.withdraw }).first()
const signBtn = (page) => page.getByRole('button', { name: RE.sign }).first()
const signaturePanel = (page) => page.locator('[role="dialog"]:has(canvas)').first()
const payoutDialog = (page) => page.locator('dialog[open]').first()
const paymentPanel = (page) => page.locator('[data-testid="payment-coords"]').first()
const supportBadge = (page) => page.locator('[data-testid="support-badge"]').first()
const devBar = (page) => page.locator('[data-testid="dev-commission-bar"]').first()
const trackerNav = (page) => page.getByRole('navigation', { name: RE.trackerNav })
const cabinetNav = (page) => page.getByRole('navigation', { name: RE.cabinetNav })

const bodyText = (page) => page.locator('body').innerText()

async function textHas(page, re) {
  return re.test(await bodyText(page))
}

/**
 * Нажатие с предварительной прокруткой К ЦЕНТРУ окна.
 *
 * Playwright доводит элемент до края области видимости и на этом успокаивается,
 * а у кабинета к обоим краям приклеены свои панели: сверху залипающая шапка,
 * снизу — меню разделов и dev-бар уровней (fixed, z-80). Кнопка, оказавшаяся
 * под ними, честно «видима», но нажатие перехватывает панель. Центр окна
 * свободен всегда.
 *
 * center: false — для того, что живёт В САМОЙ шапке: прокрутка к центру увезла
 * бы страницу вниз, шапка сжалась бы (useHeaderCondense) и спрятала ряд шагов.
 */
async function tap(locator, { timeout = ACTION_MS, center = true } = {}) {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout })
    if (center) {
      await locator.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
    }
  } catch {
    /* Прокрутка — подготовка, а не проверка: не вышло — пусть click скажет сам. */
  }
  await locator.click({ timeout })
}

/* ─── Подготовка состояния ────────────────────────────────────────────────── */

/** Адрес кабинета: раздел и (по желанию) демо-уровень комиссии. */
function cabinetUrl({ tab = 'home', level } = {}) {
  const params = new URLSearchParams({ view: 'cabinet', fastAnim: '1', tab })
  if (level !== undefined) params.set('commLevel', String(level))
  return `${BASE}/?${params.toString()}`
}

async function openCabinet(page, options = {}) {
  await page.goto(cabinetUrl(options), { waitUntil: 'networkidle', timeout: NAV_MS })
}

/** Раздел, открытый прямо сейчас, по адресной строке. Умолчание — 'home'. */
function tabInUrl(page) {
  try {
    return new URL(page.url()).searchParams.get('tab') ?? 'home'
  } catch {
    return 'home'
  }
}

/**
 * Открыть раздел кабинета. Сперва ССЫЛКОЙ ИЗ МЕНЮ — это путь пользователя и
 * заодно проверка самого меню; вкладка живёт в ?tab=…, поэтому переход
 * подтверждаем по адресу и заголовку раздела.
 *
 * Запасной путь — прямой адрес. Он нужен не ради зелёного результата: без него
 * сломанное меню утащило бы за собой ВСЕ проверки раздела, а они про другое.
 * Чем именно открыли, видно в подписи проверки.
 */
async function openTab(page, tab) {
  if (tabInUrl(page) === tab) return 'already open'

  try {
    await tap(cabinetNav(page).getByRole('link', { name: TAB_LINK[tab] }).first())
    await waitUntil(() => tabInUrl(page) === tab, { timeout: 3000, what: `?tab=${tab}` })
    await waitUntil(() => textHas(page, TAB_HEADING[tab]), {
      timeout: 3000,
      what: `${tab} heading`,
    })
    return 'via nav'
  } catch (error) {
    await openCabinet(page, { tab })
    await waitUntil(() => textHas(page, TAB_HEADING[tab]), {
      timeout: 6000,
      what: `${tab} heading`,
    })
    return `via url (nav failed: ${oneLine(error?.message, 90)})`
  }
}

async function clearState(page) {
  await openCabinet(page)
  await page.evaluate(() => {
    const keys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith('velora:')) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
    localStorage.setItem('velora:fastAnim', '1')
  })
  await page.reload({ waitUntil: 'networkidle', timeout: NAV_MS })
}

/**
 * Пять шагов закрыты — иначе кнопка вывода заперта и вся воронка недостижима.
 * Пишем те же ключи, что и account.store: булевы в 'true'/'false', список
 * шагов JSON-ом, текущий шаг сырой строкой (сериализаторы VueUse).
 */
async function seedCompletedAccount(page, { iban = true } = {}) {
  await page.evaluate(
    ({ steps, iban }) => {
      localStorage.setItem('velora:fastAnim', '1')
      localStorage.setItem('velora:account:documents', 'true')
      localStorage.setItem('velora:account:signed', 'true')
      localStorage.setItem('velora:account:iban', iban ? 'true' : 'false')
      localStorage.setItem('velora:account:completed', JSON.stringify(steps))
      localStorage.setItem('velora:account:step', 'signature')
    },
    { steps: ALL_STEPS, iban },
  )
}

/** Кабинет на нужном уровне комиссии, с закрытыми пятью шагами, раздел Home. */
async function prepareFunnel(page, { level, iban = true } = {}) {
  await openCabinet(page, { tab: 'home', level })
  await seedCompletedAccount(page, { iban })
  await page.reload({ waitUntil: 'networkidle', timeout: NAV_MS })
  await waitUntil(async () => (await withdrawBtn(page).count()) > 0, {
    timeout: 6000,
    what: 'payout card',
  })
}

/* ─── Шаги экрана документов ──────────────────────────────────────────────── */

/**
 * Выбрать вид удостоверения.
 *
 * Жмём ПОДПИСЬ, а не сам input: он лежит под .sr-only (VelDocKindChoice), и
 * это ровно то, по чему попадает человек. check({force}) остаётся запасным
 * путём — на случай, если разметку строки однажды перестроят.
 */
async function selectDocKind(page, kind) {
  const radio = docsPanel(page).locator(`input[type="radio"][value="${kind}"]`).first()
  const row = docsPanel(page).locator(`label:has(input[type="radio"][value="${kind}"])`).first()

  try {
    await tap(row)
  } catch {
    await radio.check({ force: true, timeout: ACTION_MS })
  }

  await waitUntil(() => radio.isChecked(), { timeout: 2000, what: `radio ${kind} checked` })
  await waitUntil(async () => (await docSlots(page).count()) === DOC_SIDES_BY_KIND[kind], {
    timeout: 3000,
    what: `${DOC_SIDES_BY_KIND[kind]} slot(s) for ${kind}`,
  })
}

/** Положить снимок в каждый открытый слот. Возвращает число заполненных. */
async function attachAllPhotos(page) {
  const inputs = docFileInputs(page)
  const count = await inputs.count()
  if (count === 0) throw new Error('no file inputs inside doc slots')
  for (let i = 0; i < count; i += 1) {
    await inputs.nth(i).setInputFiles(photo(`documento-${i + 1}.png`), { timeout: ACTION_MS })
  }
  return count
}

/* ─── Диагностика страницы ────────────────────────────────────────────────── */

const consoleErrors = new Map()

/**
 * Стенд жив? Проверяем ДО браузера: иначе каждая из четырёх десятков проверок
 * упирается в собственный таймаут, и на выходе — четыре минуты одинаковых
 * «Timeout 4000ms» вместо одной внятной строки про недоступный сервер.
 */
async function pickBase() {
  for (const candidate of BASE_CANDIDATES) {
    try {
      const response = await fetch(`${candidate}/`, { signal: AbortSignal.timeout(4000) })
      if (response.ok) return candidate
    } catch {
      /* следующий кандидат */
    }
  }
  return null
}

/* ─── Прогон ──────────────────────────────────────────────────────────────── */

let browser = null

try {
  const alive = await pickBase()

  if (alive === null) {
    bad('dev server unreachable', `tried ${BASE_CANDIDATES.join(', ')} — run "npm run dev"`)
  } else {
    BASE = alive
    console.log(`base: ${BASE}`)

    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 420, height: 900 } })
    page.setDefaultTimeout(ACTION_MS)
    page.setDefaultNavigationTimeout(NAV_MS)

    page.on('pageerror', (error) => bad('pageerror', oneLine(error.message)))
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = oneLine(msg.text())
      consoleErrors.set(text, (consoleErrors.get(text) ?? 0) + 1)
    })

    await section('1. Вход в кабинет (Home)', async () => {
      /* Подготовка состояния — тоже проверка, а не молчаливая преамбула: упади
         она вне check(), и весь блок ушёл бы одной строкой «section aborted»,
         скрыв за собой семь отдельных результатов. */
      await check('clean state loaded', () => clearState(page))
      await shot(page, '01-cabinet-entry')

      await check('cabinet opens on home', async () => {
        await waitUntil(() => textHas(page, TAB_HEADING.home), {
          timeout: 8000,
          what: 'home heading',
        })
        return `tab=${tabInUrl(page)}`
      })

      await check('step counter visible', async () => {
        const text = await bodyText(page)
        const hit = text.match(/[0-5]\s*\/\s*5/)
        if (!hit) throw new Error(oneLine(text, 160))
        return hit[0]
      })

      await check('tracker steps present', async () => {
        const count = await trackerNav(page).getByRole('link').count()
        if (count < 3) throw new Error(`links = ${count}`)
        return String(count)
      })

      await check('cabinet nav has 4 sections', async () => {
        const count = await cabinetNav(page).getByRole('link').count()
        if (count !== 4) throw new Error(`links = ${count}`)
        return '4'
      })

      await check('badge NUOVO', async () => {
        const badge = page.locator('[data-testid="badge-nuovo"]').first()
        if (!(await badge.isVisible())) throw new Error('not visible')
      })

      await check('TAN rate on payout', async () => {
        if (!(await textHas(page, /TAN\s*3[,.]8/))) throw new Error('TAN 3,8 not found')
      })

      await check('withdraw locked before 5/5', async () => {
        if (await withdrawBtn(page).isEnabled()) throw new Error('enabled at 3/5')
      })

      await check('docs panel is NOT on home', async () => {
        const count = await docsPanel(page).count()
        if (count !== 0) throw new Error(`#vel-account-documents on home = ${count}`)
      })
    })

    await section('2. Раздел «Documenti»: вид → снимки → загрузка', async () => {
      await check('documents section opens', async () => openTab(page, 'documents'))

      await check('documents panel present', async () => {
        await docsPanel(page).first().waitFor({ state: 'visible', timeout: ACTION_MS })
      })

      await check('doc kind choice — 3 options', async () => {
        const count = await docKindRadios(page).count()
        if (count !== 3) throw new Error(`radios = ${count}`)
        return '3'
      })

      await check('no slots before kind chosen', async () => {
        const count = await docSlots(page).count()
        if (count !== 0) throw new Error(`slots = ${count}`)
      })

      await check('submit hidden before kind chosen', async () => {
        const count = await docSubmitBtn(page).count()
        if (count !== 0) throw new Error(`buttons = ${count}`)
      })

      await check('passaporto → 1 slot', async () => {
        await selectDocKind(page, 'passport')
        return '1 slot'
      })

      await check('photo lands in the passport slot', async () => {
        const count = await attachAllPhotos(page)
        if (count !== 1) throw new Error(`inputs = ${count}`)
        await waitUntil(async () => !RE.slotEmpty.test(await docSlots(page).first().innerText()), {
          timeout: 2000,
          what: 'slot filled',
        })
      })

      await check('patente → 2 slots', async () => {
        await selectDocKind(page, 'licence')
        return '2 slots'
      })

      await check('kind switch drops the previous photo', async () => {
        const text = await docsPanel(page).innerText()
        const empties = text.match(new RegExp(RE.slotEmpty.source, 'gi')) ?? []
        if (empties.length !== 2) throw new Error(`empty slots = ${empties.length}`)
      })

      await check('submit disabled until photos chosen', async () => {
        const submit = docSubmitBtn(page).first()
        await submit.waitFor({ state: 'visible', timeout: ACTION_MS })
        if (await submit.isEnabled()) throw new Error('enabled with empty slots')
      })

      await check('photos attached to every side', async () => {
        const count = await attachAllPhotos(page)
        return `${count} file`
      })

      await check('submit enabled when set is complete', async () => {
        await waitUntil(() => docSubmitBtn(page).first().isEnabled(), {
          timeout: 3000,
          what: 'submit enabled',
        })
      })

      await check('firma unlocked after documents', async () => {
        await waitUntil(() => signBtn(page).isEnabled(), {
          timeout: 3000,
          what: 'firma button enabled',
        })
      })

      await shot(page, '02-docs-filled')

      await check('document verified after submit', async () => {
        await tap(docSubmitBtn(page).first())
        await waitUntil(async () => RE.docVerified.test(await docsPanel(page).innerText()), {
          timeout: 8000,
          what: 'verified badge',
        })
      })

      await shot(page, '03-docs-verified')
    })

    await section('3. Подпись договора (раздел «Documenti»)', async () => {
      await check('signature pad opens', async () => {
        await tap(signBtn(page))
        await signaturePanel(page).waitFor({ state: 'visible', timeout: ACTION_MS })
      })

      await check('signature drawn and confirmed', async () => {
        const panel = signaturePanel(page)
        const confirm = panel.getByRole('button', { name: RE.signConfirm }).first()
        const canvas = panel.locator('canvas').first()

        const box = await canvas.boundingBox()
        if (box) {
          await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.35)
          await page.mouse.down()
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.7, { steps: 8 })
          await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 })
          await page.mouse.up()
        }

        let how = 'draw'
        if (!(await confirm.isEnabled())) {
          /* Клавиатурная альтернатива панели: набрать имя вместо росчерка. */
          await panel.locator('input[type="radio"][value="type"]').first().check({ force: true })
          await panel.getByLabel(RE.signName).first().fill('Marco Rossi')
          how = 'type'
        }

        await waitUntil(() => confirm.isEnabled(), { timeout: 3000, what: 'confirm enabled' })
        await confirm.click({ timeout: ACTION_MS })
        await signaturePanel(page).waitFor({ state: 'hidden', timeout: ACTION_MS })
        return how
      })

      await check('contract marked as signed', async () => {
        await waitUntil(() => textHas(page, RE.signed), { timeout: 3000, what: 'signed state' })
      })

      await shot(page, '04-after-sign')

      await check('back to home', async () => openTab(page, 'home'))

      await check('withdraw enabled after 5/5', async () => {
        await waitUntil(() => withdrawBtn(page).isEnabled(), {
          timeout: 4000,
          what: 'withdraw enabled',
        })
      })
    })

    await section('4. Уровень 1: реквизиты → комиссия → чат → ожидание', async () => {
      await check('payout dialog opens', async () => {
        await tap(withdrawBtn(page))
        await payoutDialog(page).waitFor({ state: 'visible', timeout: ACTION_MS })
      })

      await check('IBAN accepted and transfer started', async () => {
        const dialog = payoutDialog(page)
        await dialog.getByLabel(/^IBAN$/).first().fill('IT60X0542811101000000123456')
        await dialog.getByLabel(RE.holder).first().fill('Marco Rossi')

        const submit = dialog.getByRole('button', { name: RE.payoutSubmit }).first()
        await waitUntil(() => submit.isEnabled(), { timeout: 3000, what: 'payout submit enabled' })
        await submit.click({ timeout: ACTION_MS })
        await payoutDialog(page).waitFor({ state: 'hidden', timeout: ACTION_MS })
      })

      await shot(page, '05-after-payout-dialog')

      await check('L1 payment coords panel', async () => {
        await paymentPanel(page).waitFor({ state: 'visible', timeout: ACTION_MS })
      })

      await check('SEPA fields visible', async () => {
        const text = await paymentPanel(page).innerText()
        if (!RE.sepa.test(text)) throw new Error('no SEPA')
        if (!RE.beneficiary.test(text)) throw new Error('no beneficiary')
        if (!/IBAN/.test(text)) throw new Error('no IBAN row')
      })

      await check('payment confirmed → messenger', async () => {
        await tap(page.locator('[data-testid="payment-confirm"]').first())
        await waitUntil(
          async () => (await page.getByRole('button', { name: RE.sendMessage }).count()) > 0,
          { timeout: 5000, what: 'messenger panel' },
        )
      })

      await shot(page, '06-messenger')

      await check('message sent to consultant', async () => {
        const send = page.getByRole('button', { name: RE.sendMessage }).first()
        if (!(await send.isEnabled())) throw new Error('send button disabled')
        await tap(send)
      })

      await check('assistenza badge after message', async () => {
        await waitUntil(() => supportBadge(page).isVisible(), {
          timeout: 4000,
          what: 'support badge',
        })
        return oneLine(await supportBadge(page).innerText(), 8)
      })

      await check('waiting-for-admin phase', async () => {
        await waitUntil(() => textHas(page, RE.waiting), {
          timeout: 5000,
          what: 'waiting screen',
        })
      })

      await shot(page, '07-waiting')
    })

    await section('5. Уровень 2: анимация → приостановка → комиссия', async () => {
      await check('L2 funnel prepared', () => prepareFunnel(page, { level: 2 }))

      await check('L2 withdraw → bank notice → animation', async () => {
        await waitUntil(() => withdrawBtn(page).isEnabled(), {
          timeout: 4000,
          what: 'withdraw enabled',
        })
        await tap(withdrawBtn(page))
        /* Этап 2: окно «данные в банк, 5–10 мин» до 7-минутной анимации. */
        await waitUntil(() => textHas(page, RE.bankNotice), {
          timeout: 5000,
          what: 'bank notice dialog',
        })
        await tap(page.locator('[data-testid="bank-notice-continue"]').first())
        await waitUntil(() => textHas(page, RE.animating), {
          timeout: 5000,
          what: 'transfer animation',
        })
      })

      await shot(page, '08-l2-animating')

      await check('L2 suspension after animation', async () => {
        /* fastAnim сжимает 7 минут до 12 с; ждём опросом, а не глухой паузой. */
        await waitUntil(() => textHas(page, RE.suspended), {
          timeout: 25000,
          interval: 400,
          what: 'suspension screen',
        })
      })

      await check('suspended badge on payout card', async () => {
        const badge = page.locator('[data-testid="badge-sospesa"]').first()
        if (!(await badge.isVisible())) throw new Error('badge-sospesa not visible')
      })

      await check('suspension details → insurance cover', async () => {
        await tap(page.locator('[data-testid="suspension-cta"]').first())
        await paymentPanel(page).waitFor({ state: 'visible', timeout: ACTION_MS })
        const cover = page.locator('[data-testid="insurance-cover"]').first()
        if (!(await cover.isVisible())) throw new Error('insurance-cover not visible')
      })

      await shot(page, '09-l2-fee')
    })

    await section('6. Уровень 3: CPI → консультация → проверочная оплата', async () => {
      await check('L3 funnel prepared', () => prepareFunnel(page, { level: 3 }))

      await check('L3 CPI loading visible', async () => {
        await waitUntil(() => textHas(page, RE.policyBuild), {
          timeout: 5000,
          what: 'CPI loading card',
        })
        const stage = page.locator('[data-testid="cpi-stage"]').first()
        if (!(await stage.isVisible())) throw new Error('cpi-stage not visible')
      })

      await shot(page, '10-l3-policy')

      await check('L3 load → ready → activation → consult', async () => {
        /* fastAnim: load ~8s, activation ~5s */
        await waitUntil(() => textHas(page, RE.cpiReady), {
          timeout: 20000,
          interval: 400,
          what: 'certificate ready',
        })
        await tap(page.locator('[data-testid="cpi-start-activation"]').first())
        await waitUntil(() => textHas(page, RE.cpiConsult), {
          timeout: 15000,
          interval: 400,
          what: 'consult button',
        })
      })

      await check('L3 consult → view confirm → pay → messenger', async () => {
        await tap(page.locator('[data-testid="cpi-consult"]').first())
        await page.locator('[data-testid="cpi-consult-dialog"]').first().waitFor({
          state: 'visible',
          timeout: ACTION_MS,
        })
        await tap(page.locator('[data-testid="cpi-consult-close"]').first())
        await page.locator('[data-testid="cpi-view-check"]').first().check()
        await tap(page.locator('[data-testid="cpi-view-confirm"]').first())
        await waitUntil(() => textHas(page, RE.cpiPay), {
          timeout: 5000,
          what: 'verification funds',
        })
        await tap(page.locator('[data-testid="cpi-verify-pay"]').first())
        await tap(page.locator('[data-testid="cpi-pay-confirm"]').first())
        await waitUntil(
          async () => (await page.getByRole('button', { name: RE.sendMessage }).count()) > 0,
          { timeout: 5000, what: 'messenger after CPI pay' },
        )
      })

      await shot(page, '11-l3-after-pay')
    })

    await section('7. Уровень 4: отказ перевода → поддержка', async () => {
      await check('L4 funnel prepared', () => prepareFunnel(page, { level: 4 }))

      await check('L4 withdraw starts animation', async () => {
        await waitUntil(() => withdrawBtn(page).isEnabled(), {
          timeout: 4000,
          what: 'withdraw enabled',
        })
        await tap(withdrawBtn(page))
        await waitUntil(() => textHas(page, RE.animating), {
          timeout: 5000,
          what: 'transfer animation',
        })
      })

      await check('L4 failed screen', async () => {
        /* fastAnim: 6 минут → 10 с. */
        await waitUntil(() => textHas(page, RE.failed), {
          timeout: 25000,
          interval: 400,
          what: 'failed screen',
        })
        const card = page.locator('[data-testid="payout-failed"]').first()
        if (!(await card.isVisible())) throw new Error('payout-failed not visible')
      })

      await shot(page, '12-l4-failed')

      await check('L4 contact manager → support tab', async () => {
        await tap(page.locator('[data-testid="payout-failed-manager"]').first())
        await waitUntil(
          () => page.getByRole('heading', { name: RE.supportTitle }).first().isVisible(),
          { timeout: 5000, what: 'support section' },
        )
        if (!/tab=support/.test(page.url())) throw new Error(`url = ${page.url()}`)
      })

      await shot(page, '13-support')
    })

    await section('8. Кредит, трекер, договор, dev-бар', async () => {
      await check('L1 funnel prepared', () => prepareFunnel(page, {}))

      await check('loan details open', async () => {
        await tap(page.getByRole('button', { name: RE.loanButton }).first())
        await page.locator('[data-testid="loan-details"]').first().waitFor({
          state: 'visible',
          timeout: ACTION_MS,
        })
      })

      await check('amortization table', async () => {
        const text = await page.locator('[data-testid="loan-details"]').first().innerText()
        if (!RE.amortization.test(text)) throw new Error(oneLine(text, 160))
        const rows = await page.locator('[data-testid="loan-details"] tbody tr').count()
        if (rows === 0) throw new Error('no schedule rows')
        return `${rows} rows`
      })

      await shot(page, '14-loan')

      await check('tracker step «Documenti» opens the documents tab', async () => {
        /* Наверх — руками: ниже 96px шапка сжимается и прячет ряд шагов
           (VelTrackerRow под 48rem), и ссылка становится ненажимаемой. */
        await page.evaluate(() => window.scrollTo(0, 0))
        await waitUntil(() => page.evaluate(() => window.scrollY < 40), {
          timeout: 2000,
          what: 'page at top',
        })

        await tap(
          trackerNav(page).getByRole('link', { name: RE.trackerDocuments }).first(),
          { center: false },
        )
        await waitUntil(() => tabInUrl(page) === 'documents', {
          timeout: 4000,
          what: '?tab=documents',
        })
        await waitUntil(() => docsPanel(page).first().isVisible(), {
          timeout: 4000,
          what: 'documents panel after tracker click',
        })
      })

      await check('PDF button enabled (mock url)', async () => {
        const pdf = page.getByRole('button', { name: RE.openPdf }).first()
        await pdf.waitFor({ state: 'visible', timeout: ACTION_MS })
        if (!(await pdf.isEnabled())) throw new Error('still disabled')
      })

      await check('dev commission bar (DEV build)', async () => {
        if (!(await devBar(page).isVisible())) throw new Error('not visible')
        return oneLine(await devBar(page).innerText(), 40)
      })

      await shot(page, '15-final')
    })
  }
} catch (error) {
  bad('run aborted', oneLine(error instanceof Error ? error.stack ?? error.message : error))
} finally {
  if (browser) await browser.close().catch(() => undefined)
}

/* ─── Сводка ──────────────────────────────────────────────────────────────── */

for (const [text, count] of consoleErrors) {
  bad('console.error', count > 1 ? `${text} (×${count})` : text)
}

const passed = findings.filter((f) => f.ok)
const failed = findings.filter((f) => !f.ok)

writeFileSync(
  join(OUT, 'report.json'),
  JSON.stringify({ base: BASE, passed: passed.length, failed: failed.length, findings }, null, 2),
)

console.log('\n=== SUMMARY ===')
console.log(`passed: ${passed.length}  failed: ${failed.length}`)
console.log(`artifacts: ${OUT}`)
if (failed.length) {
  console.log('FAILURES:')
  failed.forEach((item) => console.log(` - ${item.name}${item.detail ? ': ' + item.detail : ''}`))
}

process.exit(failed.length ? 1 : 0)
