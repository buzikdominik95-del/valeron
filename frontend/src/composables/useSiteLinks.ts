import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface LinkGroup {
  /** id заголовка колонки: список привязывается к нему через aria-labelledby */
  id: string
  title: string
  items: string[]
}

/**
 * Ссылки перелинковки и подвала. Списки ключей держим здесь, а не тянем через
 * tm() — так строки остаются типизированными в strict-режиме vue-tsc.
 * Композабл общий для VelSiteEnd и VelFooter, чтобы сборка групп не дублировалась.
 */
const SIMULATION_KEYS = ['credit', 'auto', 'works', 'personal', 'revolving', 'consolidation'] as const
const OFFER_KEYS = ['a4000', 'a5000', 'a10000', 'a15000', 'a20000', 'a22000'] as const
const PROGRAM_KEYS = ['rate', 'subsidies', 'patents', 'renovation'] as const
const PARTNER_KEYS = ['network', 'missions', 'how', 'contact'] as const
const LEGAL_KEYS = ['terms', 'privacy', 'sitemap', 'governance', 'guarantee'] as const

export function useSiteLinks() {
  const { t } = useI18n()

  function toGroup(group: string, keys: readonly string[]): LinkGroup {
    return {
      id: `site-end-${group}`,
      title: t(`siteEnd.${group}Title`),
      items: keys.map((key) => t(`siteEnd.${group}.${key}`)),
    }
  }

  const seoGroups = computed<LinkGroup[]>(() => [
    toGroup('simulations', SIMULATION_KEYS),
    toGroup('offers', OFFER_KEYS),
  ])

  const footerGroups = computed<LinkGroup[]>(() => [
    toGroup('programs', PROGRAM_KEYS),
    toGroup('partners', PARTNER_KEYS),
    toGroup('legal', LEGAL_KEYS),
  ])

  return { seoGroups, footerGroups }
}
