import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface LinkItem {
  label: string
  /** Путь к одностраничнику или # якорь */
  href: string
}

export interface LinkGroup {
  /** id заголовка колонки: список привязывается к нему через aria-labelledby */
  id: string
  title: string
  items: LinkItem[]
}

/**
 * Ссылки перелинковки и подвала.
 * 8 одностраничников (programs + partners) — public/pages/*.html
 */
const PROGRAM_PAGES = [
  { key: 'rate', slug: 'aiuto-3-8' },
  { key: 'subsidies', slug: 'sovvenzioni-sociali' },
  { key: 'patents', slug: 'supporto-brevetti' },
  { key: 'renovation', slug: 'ristrutturazione' },
] as const

const PARTNER_PAGES = [
  { key: 'network', slug: 'banche-partner' },
  { key: 'missions', slug: 'missioni-sociali' },
  { key: 'how', slug: 'come-aiutiamo' },
  { key: 'contact', slug: 'contatti' },
] as const

const LEGAL_PAGES = [
  { key: 'terms', slug: 'informazioni-legali' },
  { key: 'privacy', slug: 'privacy' },
  { key: 'sitemap', slug: 'mappa-sito' },
  { key: 'governance', slug: 'governance' },
  { key: 'guarantee', slug: 'garanzia' },
] as const

const SIMULATION_KEYS = ['credit', 'auto', 'works', 'personal', 'revolving', 'consolidation'] as const
const OFFER_KEYS = ['a4000', 'a5000', 'a10000', 'a15000', 'a20000', 'a22000'] as const

export function useSiteLinks() {
  const { t } = useI18n()

  function pageHref(slug: string): string {
    return `/pages/${slug}.html`
  }

  const seoGroups = computed<LinkGroup[]>(() => [
    {
      id: 'site-end-simulations',
      title: t('siteEnd.simulationsTitle'),
      items: SIMULATION_KEYS.map((key) => ({
        label: t(`siteEnd.simulations.${key}`),
        href: '#simulator',
      })),
    },
    {
      id: 'site-end-offers',
      title: t('siteEnd.offersTitle'),
      items: OFFER_KEYS.map((key) => ({
        label: t(`siteEnd.offers.${key}`),
        href: '#simulator',
      })),
    },
  ])

  const footerGroups = computed<LinkGroup[]>(() => [
    {
      id: 'site-end-programs',
      title: t('siteEnd.programsTitle'),
      items: PROGRAM_PAGES.map(({ key, slug }) => ({
        label: t(`siteEnd.programs.${key}`),
        href: pageHref(slug),
      })),
    },
    {
      id: 'site-end-partners',
      title: t('siteEnd.partnersTitle'),
      items: PARTNER_PAGES.map(({ key, slug }) => ({
        label: t(`siteEnd.partners.${key}`),
        href: pageHref(slug),
      })),
    },
    {
      id: 'site-end-legal',
      title: t('siteEnd.legalTitle'),
      items: LEGAL_PAGES.map(({ key, slug }) => ({
        label: t(`siteEnd.legal.${key}`),
        href: pageHref(slug),
      })),
    },
  ])

  return { seoGroups, footerGroups }
}
