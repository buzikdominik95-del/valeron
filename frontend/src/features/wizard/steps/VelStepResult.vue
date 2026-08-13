<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApprovalReveal } from '@/composables/useApprovalReveal'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import VelBadge from '@/components/ui/VelBadge.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'
import VelNumberTicker from '@/components/magic/VelNumberTicker.vue'
import {
  ANNUAL_RATE_PERCENT,
  MONTHLY_FORMAT,
  annuityPayment,
  approvedFromRequested,
} from '@/features/wizard/offer-terms'

/**
 * Финальный экран мастера. Считает только показательные условия и ничего не
 * решает за пользователя: одобренная сумма равна запрошенной, срок и ставка —
 * объявленные константы. Когда появится бэкенд, эти три значения придут из
 * ответа, а разметка и формулы останутся прежними.
 */
const { t, n } = useI18n()
const { amount, termMonths } = useCreditSimulator()

/** Единственное действие экрана: куда вести дальше — решает родитель. */
const emit = defineEmits<{ cta: [] }>()

function onCtaClick(): void {
  emit('cta')
}

/**
 * Одобрено меньше запрошенного на 15…20% — так работает частичное одобрение,
 * и правило одно на весь проект (approvedFromRequested в offer-terms). Карточка
 * кабинета считает по той же функции: разойдись они, человек увидел бы в
 * мастере одну сумму, а в кабинете другую по одной и той же заявке.
 */
const approvedAmount = computed(() => approvedFromRequested(amount.value))

const monthlyPayment = computed(() =>
  annuityPayment(approvedAmount.value, ANNUAL_RATE_PERCENT, termMonths.value),
)

const approvedAmountText = computed(() => n(approvedAmount.value, 'currency'))

const termsText = computed(() =>
  t('wizard.result.terms', {
    monthly: n(monthlyPayment.value, MONTHLY_FORMAT),
    months: termMonths.value,
  }),
)

/* Момент одобрения — галочка, показ суммы и конфетти — живёт в композабле:
   там одна временная шкала GSAP, и разбирать её обратно по компоненту значит
   вернуть очередь кадров в файл, который про неё ничего не решает. Корень
   остаётся здесь: к нему привязан ref="root" в шаблоне, а композабл берёт его
   как область видимости для своих селекторов. */
const root = ref<HTMLElement | null>(null)
const amountRevealed = useApprovalReveal(root)

/**
 * Сумму показываем не раньше, чем дорисуется галочка. Тикер заводится сам,
 * стоит подать ему ненулевую цель, — своей анимации цифр здесь не заводим,
 * она уже есть в VelNumberTicker.
 */
const tickerValue = computed(() => (amountRevealed.value ? approvedAmount.value : 0))
</script>

<template>
  <div ref="root" class="relative rounded-panel">
    <section
      class="flex flex-col items-center gap-7 rounded-panel border border-line bg-surface p-6 text-center sm:p-9"
    >
      <span class="vel-check text-accent" aria-hidden="true">
        <svg class="size-14" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="24" fill="currentColor" />
          <path class="vel-check__mark" d="M15 24.5 21.5 31 33 19" />
        </svg>
      </span>

      <div class="flex flex-col items-center gap-4">
        <h1 class="text-3xl sm:text-4xl">
          {{ t('wizard.result.title') }}<br />
          <span class="text-accent">{{ t('wizard.result.subtitle') }}</span>
        </h1>

        <VelBadge accent>{{ t('wizard.result.badge') }}</VelBadge>
      </div>

      <div class="flex w-full flex-col items-center gap-2 border-y border-line py-7">
        <h2 class="vel-label">{{ t('wizard.result.amountLabel') }}</h2>

        <p class="vel-num vel-amount">
          <!-- Бегущие цифры скринридеру бесполезны: он получает итог одной
               строкой, а анимация остаётся чисто визуальной. -->
          <span class="sr-only">{{ approvedAmountText }}</span>
          <span class="vel-amount__visual" aria-hidden="true">
            <!-- Цель подменяется на настоящую, когда галочка дорисована:
                 счёт запускает сама смена значения, см. amountRevealed. -->
            <VelNumberTicker :value="tickerValue" :duration-ms="1600" />
            <span class="vel-amount__currency">€</span>
          </span>
        </p>

        <p class="vel-num text-sm text-muted">{{ termsText }}</p>

      </div>

      <p
        class="w-full rounded-control border border-line-strong px-4 py-3 text-left text-xs text-muted"
      >
        {{ t('wizard.result.notice') }}
      </p>

      <!-- available + footnote убраны по брифу (зачёркнутые строки на фотке 5). -->
      <div class="flex w-full flex-col gap-3">
        <VelButton
            type="button"
            size="lg"
            block
            @click="onCtaClick"
          >
          {{ t('wizard.result.cta') }}
          <span aria-hidden="true">→</span>
        </VelButton>
      </div>
    </section>
    <VelBorderBeam :duration-ms="9000" />
  </div>
</template>

<style scoped>
/* Строчный элемент трансформации игнорирует. Флексом обёртка держит размер
   по знаку и остаётся законной целью для масштабирования. */
.vel-check {
  display: inline-flex;
}

.vel-check svg {
  display: block;
}

/* Галочка рисуется штрихом: пунктир длиннее самой линии, поэтому её можно
   убрать за край одним смещением. Смещение ведёт GSAP (см. MARK_DASH
   в useApprovalReveal), а состояние по умолчанию здесь — обычная видимая
   галочка: не отработал скрипт, не разрешено движение — знак всё равно
   на месте. */
.vel-check__mark {
  fill: none;
  stroke: var(--color-accent-ink);
  stroke-width: 4;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-dasharray: 32;
  stroke-dashoffset: 0;
}

.vel-amount {
  font-size: clamp(2.5rem, 13vw, 4.25rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--color-accent-deep);
}

.vel-amount__visual {
  display: inline-flex;
  align-items: baseline;
  gap: 0.1em;
}

.vel-amount__currency {
  color: var(--color-accent);
}

/* Отдельного правила для prefers-reduced-motion здесь нет намеренно:
   и прорисовкой знака, и запуском счёта, и конфетти заведует gsap.matchMedia
   в композабле useApprovalReveal. Гасить в стилях нечего — без разрешения
   на движение эти анимации просто не создаются. */
</style>
