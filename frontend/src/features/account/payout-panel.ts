import type { InjectionKey, Ref } from 'vue'

/** Панель «Scegli il metodo» открыта под балансом (не модалка). */
export const PAYOUT_PANEL_KEY: InjectionKey<Ref<boolean>> = Symbol('vel-payout-panel')

/** Suspension CTA → открыть drawer комиссии (AccountFlow). */
export const OPEN_COMMISSION_KEY: InjectionKey<() => void> = Symbol('vel-open-commission')
