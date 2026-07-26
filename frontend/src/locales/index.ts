import it from '@/locales/it'
import programs from '@/locales/sections/programs'
import transfers from '@/locales/sections/transfers'
import howWeWork from '@/locales/sections/how-we-work'
import mission from '@/locales/sections/mission'
import faq from '@/locales/sections/faq'
import siteEnd from '@/locales/sections/site-end'
import wizard from '@/locales/sections/wizard'
import account from '@/locales/sections/account'
import contract from '@/locales/sections/contract'
import notices from '@/locales/sections/notices'
import type { AppLocale } from '@/i18n/locales'

/**
 * Секционные модули раскладываются по локалям, каждый под своим префиксом —
 * ключ programs.title читается как t('programs.title').
 *
 * Имя свойства и есть префикс. Меняешь его — меняется и ключ в компонентах.
 *
 * ЯЗЫК ОДИН — ИТАЛЬЯНСКИЙ, и collect() читает у секции только ключ it.
 * Русские половины в самих модулях секций пока лежат нетронутыми: они больше
 * никуда не попадают, но и не мешают — по ним удобно сверять формулировки.
 * Убирать их следует одним отдельным проходом по @/locales/sections, а не
 * попутно с правкой сборщика: перепутанная запятая в файле на полторы тысячи
 * строк тут не роняет сборку, она молча меняет текст на экране.
 */
const SECTIONS = {
  programs,
  transfers,
  howWeWork,
  mission,
  faq,
  siteEnd,
  wizard,
  account,
  contract,
  notices,
}

type SectionName = keyof typeof SECTIONS

function collect(locale: AppLocale): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const name of Object.keys(SECTIONS) as SectionName[]) {
    out[name] = SECTIONS[name][locale]
  }
  return out
}

export const messages = {
  it: { ...it, ...collect('it') },
}
