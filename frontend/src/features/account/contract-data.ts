import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { TERM_DEFAULT, useSimulatorStore } from '@/stores/simulator.store'
import { COMMISSION_FEE_BY_LEVEL, commissionAddsToLoanBalance } from '@/api/commission'
import { buildLoanPlan } from '@/lib/loan-schedule'
import type { LoanPlan } from '@/lib/loan-schedule'
import {
  ISSUED_AT,
  contractNumber,
  firstPaymentIso,
  fromIsoDate,
} from '@/features/account/contract-number'

/**
 * Все значения листа договора одним окном: стороны, деньги, срок, график.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ СКРИПТ КОМПОНЕНТА. Лист разложен на четыре
 * компонента (каркас, условия, график, подписи), и каждому нужен свой кусок
 * одних и тех же данных. Считай их каждый у себя — сумма в шапке и сумма
 * в графике однажды разойдутся, потому что кто-то один поправит округление.
 * Здесь источник ровно один, а компоненты остаются разметкой.
 *
 * НИЧЕГО НЕ ВЫДУМЫВАЕТСЯ. Сумма, ставка, срок, платёж и график берутся там же,
 * где их берёт остальной кабинет: useAccount() (решение банка из dossier.store),
 * simulator.store (что человек ввёл сам) и @/lib/loan-schedule — тот самый
 * расчёт, по которому кабинет уже показывает «Dettagli del prestito». Второго
 * калькулятора аннуитета в проекте нет и быть не должно.
 *
 * ФОРМАТИРУЕМ ЗДЕСЬ, А НЕ В ШАБЛОНАХ. Деньги в договоре печатаются с центами,
 * а numberFormats проекта (i18n/index.ts) настроен на интерфейс — там
 * maximumFractionDigits: 0, потому что «12.400 €» в карточке читается лучше
 * «12.400,00 €». В договоре наоборот: «€ 362,45» — это сумма платежа, а не
 * оценка. Поэтому здесь свои Intl-форматтеры, привязанные к текущей локали.
 *
 * НОМЕР И КАЛЕНДАРЬ ДОГОВОРА — В contract-number.ts. Там же объяснено, почему
 * дата берётся один раз на загрузку вкладки, а номер выводится из заявки
 * хэшем, а не случайным числом.
 */

export interface ContractScheduleRow {
  index: number
  date: string
  payment: string
  principal: string
  interest: string
  residual: string
}

export interface ContractField {
  key: string
  label: string
  /** Пустая строка — значения нет, на его месте останется пустая линия. */
  value: string
}

export interface ContractSignedAt {
  date: string
  time: string
}

export interface ContractView {
  /** «VLR-2026-1A2B3C4» — выведен из данных заявки, см. hashApplication. */
  number: ComputedRef<string>
  issuedDate: ComputedRef<string>
  fields: ComputedRef<ContractField[]>
  amountText: ComputedRef<string>
  monthlyText: ComputedRef<string>
  durationText: ComputedRef<string>
  rateText: ComputedRef<string>
  purposeText: ComputedRef<string>
  months: ComputedRef<number>
  rows: ComputedRef<ContractScheduleRow[]>
  totals: ComputedRef<ContractScheduleRow>
  signed: ComputedRef<boolean>
  /** null — подписи нет ИЛИ время подписи неизвестно (см. account.store). */
  signedAt: ComputedRef<ContractSignedAt | null>
}

export function useContractData(): ContractView {
  const { t, te, locale } = useI18n()
  const { client, approvedAmount, ratePercent } = useAccount()
  const { level } = useCommission()
  const accountStore = useAccountStore()
  const { contractSigned, contractSignedAt, ibanMasked, paidCommissionExpenses } =
    storeToRefs(accountStore)
  const { termMonths, purpose, docType, docNumber } = storeToRefs(useSimulatorStore())

  /* Форматтеры пересобираются только при смене языка: Intl-объект стоит дорого,
     а строк в графике до восьмидесяти четырёх. */
  const money = computed(
    () =>
      new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
  )

  const day = computed(
    () =>
      new Intl.DateTimeFormat(locale.value, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }),
  )

  const clock = computed(
    () => new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }),
  )

  const rate = computed(
    () =>
      new Intl.NumberFormat(locale.value, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }),
  )

  const months = computed(() => (termMonths.value > 0 ? termMonths.value : TERM_DEFAULT))

  /**
   * Тело кредита + комиссии L2…L4 (как в Prestito / балансе).
   * L1 base к кредиту не идёт. Fallback по level, если список ещё пуст.
   */
  const principalCents = computed(() => {
    let cents = Math.round(approvedAmount.value * 100)
    const fees = paidCommissionExpenses.value.filter((e) =>
      commissionAddsToLoanBalance(e.level),
    )
    if (fees.length > 0) {
      for (const exp of fees) cents += exp.amountCents
      return cents
    }
    if (level.value >= 3) cents += COMMISSION_FEE_BY_LEVEL[2].amountCents
    if (level.value >= 4) cents += COMMISSION_FEE_BY_LEVEL[3].amountCents
    return cents
  })

  /** Сумма оплаченных комиссий в центах (для итога totalPaid) — без L1 / L4. */
  const feesPaidCents = computed(() => {
    const list = paidCommissionExpenses.value.filter((e) =>
      commissionAddsToLoanBalance(e.level),
    )
    if (list.length > 0) {
      return list.reduce((s, e) => s + e.amountCents, 0)
    }
    let cents = 0
    if (level.value >= 3) cents += COMMISSION_FEE_BY_LEVEL[2].amountCents
    if (level.value >= 4) cents += COMMISSION_FEE_BY_LEVEL[3].amountCents
    return cents
  })

  const plan = computed<LoanPlan>(() =>
    buildLoanPlan(
      principalCents.value,
      ratePercent.value,
      months.value,
      firstPaymentIso(ISSUED_AT),
    ),
  )

  /* Зерно номера: всё, что отличает одну заявку от другой — кто, на сколько,
     на какой срок и под какой процент. Сам номер собирает contractNumber. */
  const number = computed(() =>
    contractNumber(
      [
        client.value.fullName,
        client.value.email,
        Math.round(approvedAmount.value * 100),
        months.value,
        ratePercent.value,
        purpose.value,
      ].join('|'),
    ),
  )

  const issuedDate = computed(() => day.value.format(ISSUED_AT))

  /*
   * Подпись вида документа берётся из словаря мастера — там она уже есть, и
   * второй набор названий означал бы два разных «Passaporto». te() страхует от
   * ключа с прошлой выкладки: t() напечатал бы на листе договора сам ключ.
   */
  const docTypeLabel = computed(() => {
    const stored = docType.value.trim()
    if (stored === '') return ''
    const key = `wizard.identity.docTypes.${stored}`
    return te(key) ? t(key) : ''
  })

  const fields = computed<ContractField[]>(() => [
    { key: 'name', label: t('contract.sheet.fields.name'), value: client.value.fullName },
    { key: 'email', label: t('contract.sheet.fields.email'), value: client.value.email },
    { key: 'docType', label: t('contract.sheet.fields.docType'), value: docTypeLabel.value },
    {
      key: 'docNumber',
      label: t('contract.sheet.fields.docNumber'),
      value: docNumber.value.trim(),
    },
    { key: 'iban', label: t('contract.sheet.fields.iban'), value: ibanMasked.value },
  ])

  /** Importo erogato = одобрено + комиссии (единый источник с балансом). */
  const amountText = computed(() => money.value.format(principalCents.value / 100))
  const monthlyText = computed(() => money.value.format(plan.value.monthlyPaymentCents / 100))
  const durationText = computed(() => t('contract.sheet.months', { count: months.value }))
  const rateText = computed(() => rate.value.format(ratePercent.value / 100))

  /*
   * Цель кредита — короткая подпись из калькулятора (simulator.purposes.*),
   * а не длинная подсказка мастера: в строке договора нужна «Prestito
   * personale», а не абзац про личные планы.
   */
  const purposeText = computed(() => {
    const key = purpose.value
    if (key === '') return t('contract.sheet.purposeUnset')
    const label = `simulator.purposes.${key}`
    return te(label) ? t(label) : t('contract.sheet.purposeUnset')
  })

  /**
   * Rate + строки комиссий L2…L4 (без L1 base).
   * Fallback по level — как principalCents, если store ещё пуст.
   */
  const feeExpenseRows = computed(() => {
    const stored = paidCommissionExpenses.value.filter((e) =>
      commissionAddsToLoanBalance(e.level),
    )
    if (stored.length > 0) {
      return stored.map((exp) => ({
        level: exp.level,
        amountCents: exp.amountCents,
        paidAt: exp.paidAt,
      }))
    }
    const list: { level: number; amountCents: number; paidAt: string }[] = []
    const today = new Date().toISOString().slice(0, 10)
    if (level.value >= 3) {
      list.push({ level: 2, amountCents: COMMISSION_FEE_BY_LEVEL[2].amountCents, paidAt: today })
    }
    if (level.value >= 4) {
      list.push({ level: 3, amountCents: COMMISSION_FEE_BY_LEVEL[3].amountCents, paidAt: today })
    }
    return list
  })

  const rows = computed<ContractScheduleRow[]>(() => {
    const installments = plan.value.rows.map((row) => ({
      index: row.index,
      date: day.value.format(fromIsoDate(row.date)),
      payment: money.value.format(row.paymentCents / 100),
      principal: money.value.format(row.principalCents / 100),
      interest: money.value.format(row.interestCents / 100),
      residual: money.value.format(row.residualCents / 100),
    }))

    const base = installments.length
    const zero = money.value.format(0)
    const fees = feeExpenseRows.value.map((exp, i) => ({
      index: base + i + 1,
      date: day.value.format(fromIsoDate(exp.paidAt)),
      payment: money.value.format(exp.amountCents / 100),
      principal: money.value.format(exp.amountCents / 100),
      interest: zero,
      residual: zero,
    }))

    return [...installments, ...fees]
  })

  /*
   * Строка итога: rate + комиссии в count и totalPaid;
   * principal — полное тело (одобрено + комиссии).
   */
  const totals = computed<ContractScheduleRow>(() => {
    const rowCount = months.value + feeExpenseRows.value.length
    const totalPaidCents = plan.value.totalPaidCents + feesPaidCents.value
    return {
      index: rowCount,
      date: t('contract.sheet.total', { count: rowCount }),
      payment: money.value.format(totalPaidCents / 100),
      principal: amountText.value,
      interest: money.value.format(plan.value.totalInterestCents / 100),
      residual: money.value.format(0),
    }
  })

  const signed = computed(() => contractSigned.value === true)

  const signedAt = computed<ContractSignedAt | null>(() => {
    if (!signed.value) return null

    const stored = contractSignedAt.value
    if (stored === '') return null

    const moment = new Date(stored)
    // Испорченная запись в localStorage дала бы «Invalid Date» прямо в договоре.
    if (Number.isNaN(moment.getTime())) return null

    return {
      date: new Intl.DateTimeFormat(locale.value, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(moment),
      time: clock.value.format(moment),
    }
  })

  return {
    number,
    issuedDate,
    fields,
    amountText,
    monthlyText,
    durationText,
    rateText,
    purposeText,
    months,
    rows,
    totals,
    signed,
    signedAt,
  }
}
