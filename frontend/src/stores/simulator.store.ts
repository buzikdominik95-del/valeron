import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { CreditPurpose } from '@/types/velora'

/** Границы суммы взяты с боевого калькулятора: 1 000 € — 22 000 €. */
export const AMOUNT_MIN = 1000
export const AMOUNT_MAX = 22000
export const AMOUNT_STEP = 500
export const AMOUNT_DEFAULT = 10000

/** Границы срока взяты с боевого мастера: ползунок идёт от 12 до 84 месяцев. */
export const TERM_MIN = 12
export const TERM_MAX = 84
/*
 * Шаг в один месяц, а не в шесть. Шестёрка давала всего 13 положений ручки на
 * весь ход, и выбрать «сорок месяцев» было нельзя — ползунок перепрыгивал
 * с 36 на 42. Срок погашения человек подбирает под свой платёж, и округление
 * до полугода отнимало у него ровно ту точность, ради которой он двигает ручку.
 *
 * 73 положения на ход ползунка — это нормально: шаг клавишами остаётся один
 * месяц, а мышью и пальцем ручка идёт непрерывно.
 */
export const TERM_STEP = 1
export const TERM_DEFAULT = 36

/** Льготная ставка, вокруг которой построено всё предложение. */
export const ANNUAL_RATE_PERCENT = 3.8

/**
 * Состояние калькулятора. Бэкенда нет — выбор пользователя переживает
 * перезагрузку через localStorage (useLocalStorage из VueUse).
 */
export const useSimulatorStore = defineStore('simulator', () => {
  const amount = useLocalStorage<number>('velora:amount', AMOUNT_DEFAULT)
  const purpose = useLocalStorage<CreditPurpose | ''>('velora:purpose', '')
  const termMonths = useLocalStorage<number>('velora:term', TERM_DEFAULT)
  const calculated = useLocalStorage<boolean>('velora:calculated', false)

  /**
   * Личные данные мастера живут здесь, а не в локальных ref шага: иначе
   * возврат на предыдущий шаг размонтирует форму и стирает всё введённое.
   */
  const surname = useLocalStorage<string>('velora:surname', '')
  const firstName = useLocalStorage<string>('velora:firstName', '')
  /** Sesso: male | female — per l’animazione prelievo (uomo/donna). */
  const gender = useLocalStorage<string>('velora:gender', '')
  const docType = useLocalStorage<string>('velora:docType', '')
  const docNumber = useLocalStorage<string>('velora:docNumber', '')

  /**
   * Почта, указанная при создании кабинета (VelRegisterDialog).
   *
   * Хранится РЯДОМ с остальными полями анкеты и по той же причине: следующий
   * экран сообщает, куда ушло письмо, а кабинет показывает адрес в шапке — и
   * оба переживают перезагрузку страницы.
   *
   * ПАРОЛЯ ЗДЕСЬ НЕТ И НЕ БУДЕТ. Он остаётся в окне регистрации и уходит только
   * в запрос к серверу, когда тот появится: localStorage переживает вкладку и
   * читается любым скриптом на странице.
   */
  const email = useLocalStorage<string>('velora:email', '')

  function reset(): void {
    amount.value = AMOUNT_DEFAULT
    purpose.value = ''
    termMonths.value = TERM_DEFAULT
    calculated.value = false
    surname.value = ''
    firstName.value = ''
    gender.value = ''
    docType.value = ''
    docNumber.value = ''
    email.value = ''
  }

  return {
    amount,
    purpose,
    termMonths,
    calculated,
    surname,
    firstName,
    gender,
    docType,
    docNumber,
    email,
    reset,
  }
})
