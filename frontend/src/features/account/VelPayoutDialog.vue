<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMaskedInput } from '@/composables/useMaskedInput'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { ibanExpectedLength, isValidIban } from '@/lib/iban'
import type { PayoutMethod } from '@/api/account.api'
import { HOLDER_MIN_LENGTH, PAYOUT_ACCOUNT_RULES } from '@/features/account/payout-fields'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'
import VelRange from '@/components/ui/VelRange.vue'
import VelPayoutMethods from '@/features/account/VelPayoutMethods.vue'

/**
 * Окно выбора способа получения денег.
 *
 * НАТИВНЫЙ <dialog> С showModal(). Он бесплатно даёт четыре вещи, которые иначе
 * пишутся руками и ломаются: ловушку фокуса, закрытие по Escape, инертность
 * всего под окном (фон не кликается и не читается скринридером) и вывод в
 * top layer — то есть окно не может быть обрезано overflow или сдвинуто
 * transform у предка, и Teleport ему не нужен. Возврат фокуса на кнопку, с
 * которой окно открыли, тоже его работа.
 *
 * Единственное, чего <dialog> НЕ делает, — не запирает прокрутку страницы под
 * собой: колесо над подложкой продолжает мотать документ. Это добираем
 * useScrollLock из VueUse, больше ничего вручную здесь не воспроизводится.
 *
 * Клик по подложке не закрывает — намеренно. Здесь набран IBAN из 27 знаков,
 * и промах мимо кнопки не должен его стирать. Выходы намеренные: Escape и
 * кнопка закрытия.
 *
 * СУММА. К получению ровно столько, сколько одобрено. Поле не редактируемое:
 * частичного вывода интерфейс не предлагает, а вводимая сумма обещала бы выбор,
 * которого нет. Удержаний и комиссий не показываем — таких данных нет.
 */
const open = defineModel<boolean>('open', { default: false })

/** Реквизиты + сумма: дальше воронка (как «Scegli il metodo di ricezione» на видео). */
const emit = defineEmits<{ submitted: [euros: number] }>()

const { t, n } = useI18n()
const { approvedAmount, canWithdraw, isAuthorizing } = useAccount()
const accountStore = useAccountStore()

const uid = useId()
const titleId = `vel-payout-dialog-title-${uid}`
const leadId = `vel-payout-dialog-lead-${uid}`

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

/* Связка модели с showModal/close и замок прокрутки — всё, чего нативный
   <dialog> не делает сам. Подробности в композабле. */
useNativeDialog(dialog, open)

/* ─── Форма ───────────────────────────────────────────────────────────────── */

const method = ref<PayoutMethod>('iban')
const accountValue = ref('')
const holder = ref('')
const minEuro = 100
const maxEuro = computed(() => Math.max(minEuro, Math.round(approvedAmount.value)))
const amountEuro = ref(maxEuro.value)

watch(open, (isOpen) => {
  if (!isOpen) return
  amountEuro.value = maxEuro.value
  if (accountStore.ibanProvided) {
    /* Счёт уже есть — поле не обязательно, но holder можно оставить. */
  }
})

const rule = computed(() => PAYOUT_ACCOUNT_RULES[method.value])

const accountInput = useTemplateRef<ComponentPublicInstance>('accountInput')

const { raw: accountRaw } = useMaskedInput(() => accountInput.value, {
  model: accountValue,
  maxLength: () => rule.value.max,
  allow: () => rule.value.allow,
  upper: () => rule.value.upper,
})

/*
 * Смена способа чистит поле. Правила маски у IBAN и карты разные, и огрызок
 * одних реквизитов в поле для других — не подсказка, а мусор: буквы из IBAN
 * в номере карты недопустимы, а цифры от карты не образуют начала IBAN.
 */
watch(method, () => {
  accountValue.value = ''
})

const accountLabel = computed(() => t(`account.payout.dialog.fields.${method.value}`))
const accountHint = computed(() =>
  t(`account.payout.dialog.hints.${method.value}`, {
    min: rule.value.min,
    max: rule.value.max,
  }),
)

const amountText = computed(() => n(amountEuro.value, 'currency'))
const maxText = computed(() => n(maxEuro.value, 'currency'))
const amountProgress = computed(() => {
  const span = maxEuro.value - minEuro
  if (span <= 0) return 1
  return (amountEuro.value - minEuro) / span
})
const percentText = computed(() =>
  n(amountProgress.value, { style: 'percent', maximumFractionDigits: 0 }),
)

/*
 * ГОТОВНОСТЬ РЕКВИЗИТОВ.
 * Если IBAN уже сохранён — поле можно не трогать (повторный Preleva).
 */
const accountReady = computed(() => {
  if (accountStore.ibanProvided && accountRaw.value === '') return true
  if (accountRaw.value.length < rule.value.min) return false
  return method.value === 'iban' ? isValidIban(accountRaw.value) : true
})

const holderReady = computed(
  () => accountStore.ibanProvided || holder.value.trim().length >= HOLDER_MIN_LENGTH,
)

/**
 * Можно ли отправлять.
 *
 * isAuthorizing здесь не для красоты: второй перевод по состоянию не заводится
 * (dossier.startTransfer возвращает false, пока идёт первый), и без этой
 * проверки кнопка оставалась бы живой, а нажатие на неё — молчаливым.
 * Отказ обязан быть виден ДО нажатия, а не вместо реакции на него.
 */
const canSubmit = computed(
  () => canWithdraw.value && !isAuthorizing.value && accountReady.value && holderReady.value,
)

/** Что мешает отправке — одной строкой перед кнопкой. */
const blockedReason = computed(() =>
  isAuthorizing.value ? t('account.payout.inProgress') : t('account.payout.dialog.incomplete'),
)

/**
 * Почему кнопка заперта — словами и только когда есть что сказать.
 *
 * Пока IBAN набирают, ошибку не показываем: «IBAN неверен» под наполовину
 * введённой строкой — это не помощь, а придирка. Ждём, пока наберётся длина,
 * которую реестр ISO 13616 предписывает выбранной стране; для страны вне
 * реестра — пока не наберётся общий минимум.
 */
const accountError = computed(() => {
  if (method.value !== 'iban' || accountRaw.value === '') return null

  const expected = ibanExpectedLength(accountRaw.value) ?? rule.value.min
  if (accountRaw.value.length < expected) return null

  return accountReady.value ? null : t('account.payout.dialog.errors.iban')
})

function submit(): void {
  // Кнопка заблокирована, но submit мог прийти по Enter до перерисовки.
  if (!canSubmit.value) return

  /*
   * Реквизиты + сумма: как на эталоне «Avvia il trasferimento».
   * Комиссии / банк дальше — VelAccountFlow, не startTransfer.
   */
  if (accountRaw.value !== '') {
    accountStore.setIbanFromRaw(accountRaw.value)
  }

  const euros = amountEuro.value
  accountValue.value = ''
  holder.value = ''
  open.value = false
  emit('submitted', euros)
}

function onSubmit(): void {
  submit()
}

function close(): void {
  open.value = false
}
</script>

<template>
  <!-- role="dialog" и aria-modal здесь не нужны: у <dialog>, открытого через
       showModal(), они и так есть. Дублировать их значит спорить с браузером. -->
  <dialog
    ref="dialog"
    class="vel-payout-dialog"
    :aria-labelledby="titleId"
    :aria-describedby="leadId"
  >
    <form class="vel-payout-dialog__form" @submit.prevent="onSubmit">
      <button
        type="button"
        class="vel-payout-dialog__close"
        :aria-label="t('account.payout.dialog.close')"
        @click="close"
      >
        <svg class="size-4" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M4 4 12 12M12 4 4 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="square"
          />
        </svg>
      </button>

      <div class="flex flex-col gap-2">
        <h2 :id="titleId" class="pr-10 text-2xl">{{ t('account.payout.dialog.title') }}</h2>
        <p :id="leadId" class="text-sm text-muted">{{ t('account.payout.dialog.lead') }}</p>
      </div>

      <VelPayoutMethods v-model="method" />

      <!-- Поле реквизитов одно на оба способа: меняются подпись, маска и
           клавиатура, а не сам контрол. Перемонтирование стёрло бы связку
           маски с элементом и подпись из VelField, поэтому :key здесь нет. -->
      <VelField :label="accountLabel" :hint="accountHint" :error="accountError ?? undefined">
        <VelInput
          ref="accountInput"
          v-model="accountValue"
          :inputmode="rule.inputMode"
          :autocomplete="rule.autocomplete"
          spellcheck="false"
        />
      </VelField>

      <VelField :label="t('account.payout.dialog.fields.holder')">
        <VelInput
          v-model="holder"
          :placeholder="t('account.payout.dialog.holderPlaceholder')"
          :autocomplete="rule.holderAutocomplete"
          spellcheck="false"
        />
      </VelField>

      <div class="vel-payout-dialog__amount">
        <p class="vel-label">{{ t('account.payout.dialog.amountLabel') }}</p>
        <output class="vel-num vel-payout-dialog__sum">
          {{ amountText }}
          <span class="vel-payout-dialog__max">/ {{ maxText }}</span>
        </output>
        <p class="text-xs text-accent-deep font-semibold">
          {{ t('account.payout.dialog.amountShare', { percent: percentText }) }}
        </p>
        <VelRange
          v-model="amountEuro"
          :min="minEuro"
          :max="maxEuro"
          :step="100"
          :progress="amountProgress"
          :label="t('account.payout.dialog.amountLabel')"
          :value-text="amountText"
        />
      </div>

      <!-- Причина недоступной кнопки стоит перед ней: серая кнопка без
           объяснения читается как поломка. -->
      <p v-if="!canSubmit" class="text-xs text-muted">
        {{ blockedReason }}
      </p>

      <VelButton type="submit" size="lg" block :disabled="!canSubmit">
        {{ t('account.payout.dialog.submit') }}
        <span aria-hidden="true">→</span>
      </VelButton>
    </form>
  </dialog>
</template>

<style scoped>
.vel-payout-dialog {
  width: min(100% - 2rem, 34rem);
  /* Низкое окно (ландшафт на телефоне) — окно прокручивается само,
     а не вылезает за экран. */
  max-height: min(90dvh, 46rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Нативные рамка и отступ у <dialog> свои — снимаем, отступ несёт форма. */
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
  /*
    Тень отделяет окно от страницы. Она не украшение: см. комментарий к
    ::backdrop ниже — в движке без наследования переменных в псевдоэлемент
    затемнения не будет, и тогда тень остаётся единственным признаком того,
    что окно лежит над содержимым. Цвет собран из токена.
  */
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

/*
  Затемнение фона. Значение берётся из токена — сырых цветов в проекте нет
  нигде, включая псевдоэлементы.

  ::backdrop наследует свойства от своего элемента только в свежих движках;
  там, где наследования нет, var(--color-fg) не разрешится и объявление
  отбросится. Деградация тихая и безопасная: окно останется белой панелью с
  тенью над страницей, а инертность фона даёт сам showModal(), а не заливка.
*/
.vel-payout-dialog::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-payout-dialog__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.75rem;
}

.vel-payout-dialog__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  /* 44×44 — норма WCAG 2.5.8. Крестик закрывает окно, промах по нему на
     телефоне попадает в поле реквизитов, поэтому размер тут не косметика.
     Значок остаётся 16px: растёт зона, а не рисунок. */
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  color: var(--color-muted);
  /* preflight Tailwind v4 оставляет кнопкам браузерное default, поэтому руку
     ставим руками — как и у остальных кнопок проекта. */
  cursor: pointer;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.vel-payout-dialog__close:hover {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

/* Отклик на касание: на тач-экране :hover не наступает, и без :active
   между нажатием и закрытием окна кнопка не отвечала ничем. */
.vel-payout-dialog__close:active {
  background-color: var(--color-track);
  color: var(--color-fg);
}

.vel-payout-dialog__amount {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1rem 1.125rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
}

.vel-payout-dialog__sum {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
  color: var(--color-accent-deep);
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.vel-payout-dialog__max {
  color: var(--color-muted);
  font-size: 1rem;
  font-weight: 600;
}

/* Появление: окно приподнимается, подложка гаснет. Анимация, а не переход:
   элемент приходит из display: none, и переходу не с чего стартовать. */
.vel-payout-dialog[open] {
  animation: vel-payout-dialog-in 200ms ease-out;
}

.vel-payout-dialog[open]::backdrop {
  animation: vel-payout-dialog-fade 160ms ease-out;
}

@keyframes vel-payout-dialog-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes vel-payout-dialog-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность: анимация всё равно
     проигралась бы, просто мгновенно. Здесь снимаем её целиком. */
  .vel-payout-dialog[open],
  .vel-payout-dialog[open]::backdrop {
    animation: none;
  }

  .vel-payout-dialog__close {
    transition: none;
  }
}
</style>
