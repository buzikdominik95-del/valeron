<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useSimulatorStore } from '@/stores/simulator.store'
import type { SceneLook } from '@/features/account/scene/transfer-palette'
import { OPEN_COMMISSION_KEY } from '@/features/account/payout-panel'
import VelTransferScene from '@/features/account/VelTransferScene.vue'
import VelEuroclearScene from '@/features/account/VelEuroclearScene.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'
import VelScanLine from '@/components/magic/VelScanLine.vue'
import VelBlurFade from '@/components/magic/VelBlurFade.vue'
import VelTextAnimate from '@/components/magic/VelTextAnimate.vue'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * L2/L4: сцена перевода + «мои реквизиты».
 * L4 failed: красная ⇄ зелёная волной (clip-path), при закрытии модалки — обратно.
 */
const props = withDefaults(
  defineProps<{
    /** Модалка отказа открыта — при закрытии кнопка снова краснеет. */
    rejectOpen?: boolean
    /** Выбранная пользователем сумма вывода (если задана). */
    amountEuros?: number | null
  }>(),
  {
    rejectOpen: false,
    amountEuros: null,
  },
)

const emit = defineEmits<{
  'open-reject': []
}>()

const { t } = useI18n()
const {
  animationProgress,
  animationRemainingMs,
  isFailed,
  isRejectAnim,
  isSuspended,
  isPayFee,
  isMessenger,
  isWaiting,
  isTgFinal,
  level,
} = useCommission()
const { approvedAmount, loanBalanceEuros, client, transferAccountTail } = useAccount()
const accountStore = useAccountStore()
const { gender } = storeToRefs(useSimulatorStore())
/** L2 after fail: CTA opens commission payment (from AccountFlow). */
const openCommission = inject(OPEN_COMMISSION_KEY, null as null | (() => void))

/**
 * Сумма на сцене = баланс вывода (approvato + fee L2/L3), не только base.
 * Иначе L4 anim расходится с «Il tuo saldo» / Preleva.
 */
const sceneAmount = computed(() => {
  const selected = Number(props.amountEuros ?? 0)
  if (Number.isFinite(selected) ? selected > 0 : false) {
    return Math.round(selected)
  }
  const bal = Math.round(loanBalanceEuros.value)
  if (bal > 0) return bal
  return Math.max(0, Math.round(approvedAmount.value))
})

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const coordsOpen = ref(false)
const coordsDialog = useTemplateRef<HTMLDialogElement>('coordsDialog')
useNativeDialog(coordsDialog, coordsOpen)

const coordsTitleId = `vel-coords-title-${useId()}`

/**
 * red → to-green → green (модалка)
 * green → to-red → red (модалка закрыта)
 */
type ResolvePhase = 'red' | 'to-green' | 'green' | 'to-red'
const resolvePhase = ref<ResolvePhase>('red')
/** Длительность волны (синхрон с CSS --vel-resolve-wave-ms). */
const MORPH_MS = 820
let morphTimer: ReturnType<typeof setTimeout> | null = null

function clearMorphTimer(): void {
  if (morphTimer != null) {
    clearTimeout(morphTimer)
    morphTimer = null
  }
}

const recipientName = computed(() => client.value.fullName)
const personLook = computed<SceneLook>(() => (gender.value === 'male' ? 'crop' : 'bob'))

/**
 * Freeze / red-X: hold 100%, L4 failed/tg_final, L2 suspended/pay_fee.
 * L4 tg_final — сцена остаётся красной на фоне freeze-intro + Telegram.
 */
/** L5: никаких fail-визуалов — сцена Euroclear остаётся спокойной всегда. */
const isL5 = computed(() => Number(level.value) === 5)

const sceneFailed = computed(
  () =>
    !isL5.value &&
    (isRejectAnim.value ||
      isFailed.value ||
      isTgFinal.value ||
      isSuspended.value ||
      (Number(level.value) === 2 &&
        (isPayFee.value || isMessenger.value || isWaiting.value))),
)

/** CTA оплаты 280 снята — на L4 только TG, кнопку resolve не показываем. */
const showResolveCta = computed(() => false)

/** L5: сцена Euroclear (инспектор с лупой) вместо стандартной сцены перевода. */
const showEuroclearScene = computed(() => isL5.value)

/** IBAN для карточки клиента на сцене Euroclear. */
const euroclearIban = computed(() => {
  const masked = (accountStore.ibanMasked ?? '').trim()
  if (masked) return masked
  const full = (accountStore.ibanFull ?? '').trim()
  if (full) return full
  return `\u2022\u2022\u2022\u2022 ${sceneIbanTail.value}`
})

/**
 * L2: красная Paga на fail-анимации — и после messaggio (messenger/waiting),
 * чтобы снова открыть модалку комиссии.
 */
const showL2PagaCta = computed(
  () =>
    Number(level.value) === 2 &&
    (isSuspended.value ||
      isPayFee.value ||
      isMessenger.value ||
      isWaiting.value ||
      isFailed.value ||
      isRejectAnim.value),
)

/** L2 fail CTA: «Mostra dettagli» (не «Paga la copertura»). */
const l2PagaLabel = computed(() => t('account.commission.anim.viewDetailsCta'))

/**
 * L5: timer al 100% -> il bottone bianco diventa blu "Euroclear" (pulse)
 * e apre la modale della commissione. La scena non sparisce piu.
 */
const showL5EuroclearCta = computed(
  () =>
    isL5.value &&
    (isPayFee.value ||
      isMessenger.value ||
      isWaiting.value ||
      animationProgress.value >= 1),
)

function onL5EuroclearClick(): void {
  if (typeof openCommission === 'function') openCommission()
}

function onL2PagaClick(): void {
  if (typeof openCommission === 'function') openCommission()
}

const isGreenTone = computed(
  () => resolvePhase.value === 'green' || resolvePhase.value === 'to-green',
)
const isMorphing = computed(
  () => resolvePhase.value === 'to-green' || resolvePhase.value === 'to-red',
)

const overline = computed(() =>
  sceneFailed.value
    ? t('account.commission.anim.overlineFailed')
    : t('account.commission.anim.overline'),
)
const title = computed(() =>
  sceneFailed.value ? t('account.commission.anim.titleFailed') : t('account.commission.anim.title'),
)
const lead = computed(() =>
  sceneFailed.value ? t('account.commission.anim.leadFailed') : t('account.commission.anim.lead'),
)

const resolveLabel = computed(() =>
  isGreenTone.value
    ? t('account.commission.anim.resolveCtaReady')
    : t('account.commission.anim.resolveCta'),
)

const userIban = computed(() => accountStore.ibanFull || transferAccountTail.value || '—')
const userHolder = computed(
  () =>
    accountStore.payoutHolder ||
    client.value.fullName ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ') ||
    '—',
)

/**
 * Хвост IBAN для сцены (подпись «IBAN •• 4417» у получателя).
 * dossier.transfer.accountTail заполняется только после startTransfer —
 * при анимации комиссии его часто нет. Берём из сохранённого IBAN пользователя.
 */
const sceneIbanTail = computed(() => {
  const fromTransfer = (transferAccountTail.value ?? '').trim()
  if (fromTransfer) return fromTransfer
  const full = (accountStore.ibanFull ?? '').replace(/\s+/g, '')
  if (full.length >= 4) return full.slice(-4)
  const masked = (accountStore.ibanMasked ?? '').replace(/\s+/g, '')
  if (masked.length >= 4) {
    const visibleTail = masked.match(/([0-9A-Za-z]{1,4})$/)
    if (visibleTail?.[1]) return visibleTail[1]
  }
  return ''
})

function openCoords(): void {
  coordsOpen.value = true
}

function closeCoords(): void {
  coordsOpen.value = false
}

function morphToGreenThenOpen(): void {
  clearMorphTimer()
  resolvePhase.value = 'to-green'
  morphTimer = setTimeout(() => {
    morphTimer = null
    resolvePhase.value = 'green'
    emit('open-reject')
  }, MORPH_MS)
}

function morphToRed(): void {
  if (resolvePhase.value === 'red' || resolvePhase.value === 'to-red') return
  clearMorphTimer()
  resolvePhase.value = 'to-red'
  morphTimer = setTimeout(() => {
    morphTimer = null
    resolvePhase.value = 'red'
  }, MORPH_MS)
}

function onResolveClick(): void {
  if (isMorphing.value) return

  if (resolvePhase.value === 'green') {
    emit('open-reject')
    return
  }

  /* Красная → зелёная волной, затем окно. */
  morphToGreenThenOpen()
}

/*
 * Закрыли модалку → кнопка с той же плавностью снова красная.
 * Открытие без клика (первый автопоказ) не трогаем: кнопка остаётся red.
 */
watch(
  () => props.rejectOpen,
  (open, was) => {
    if (was === true && open === false) {
      morphToRed()
    }
  },
)

onBeforeUnmount(() => {
  clearMorphTimer()
})
</script>

<template>
  <section
    ref="root"
    class="vel-transfer relative flex flex-col overflow-hidden rounded-panel border bg-surface"
    :class="sceneFailed ? 'border-danger vel-transfer--reject' : 'border-line'"
  >
    <VelBorderBeam v-if="!sceneFailed" :duration-ms="4800" :size="72" />
    <VelScanLine class="absolute inset-x-0 bottom-0 z-[1]" />

    <div class="relative z-[1] flex items-start gap-3">
      <span
        class="vel-pulse-mark shrink-0"
        :class="sceneFailed ? 'text-danger' : 'text-accent-deep'"
      >
        <VelAccountSign sign="bank" size="lg" />
      </span>
      <div class="min-w-0">
        <p class="vel-label" :class="sceneFailed ? 'text-danger' : undefined">{{ overline }}</p>
        <h2
          class="vel-transfer-title m-0 font-semibold"
          :class="sceneFailed ? 'text-danger' : 'text-fg'"
        >
          {{ title }}
        </h2>
      </div>
    </div>

    <!-- leadFailed убран: на fail-сцене только title + diagram + CTA -->
    <p v-if="!sceneFailed" class="relative z-[1] m-0 text-sm text-muted">{{ lead }}</p>

    <div class="relative z-[1]">
      <VelEuroclearScene
        v-if="showEuroclearScene"
        :progress="animationProgress"
        :remaining-ms="animationRemainingMs"
        :name="recipientName"
        :iban="euroclearIban"
        :amount-euros="sceneAmount"
      />
      <VelTransferScene
        v-else
        :progress="animationProgress"
        :amount="sceneAmount"
        :name="recipientName"
        :iban="sceneIbanTail"
        :remaining-ms="animationRemainingMs"
        :failed="sceneFailed"
        :look="personLook"
      />
    </div>

    <!-- L4 failed: волна red ⇄ green. -->
    <div v-if="showResolveCta" class="relative z-[1] mt-1">
      <button
        type="button"
        class="vel-resolve-cta"
        :class="{
          'vel-resolve-cta--red': resolvePhase === 'red',
          'vel-resolve-cta--green': resolvePhase === 'green',
          'vel-resolve-cta--to-green': resolvePhase === 'to-green',
          'vel-resolve-cta--to-red': resolvePhase === 'to-red',
        }"
        data-testid="transfer-resolve-cta"
        :disabled="isMorphing"
        @click="onResolveClick"
      >
        <!-- Волна поверх базы: накрывает целевым цветом слева → направо -->
        <span class="vel-resolve-cta__wave" aria-hidden="true" />
        <span class="vel-resolve-cta__label">{{ resolveLabel }}</span>
      </button>
    </div>

    <!--
      L2 fail: красная Paga (пульс) на месте «Le mie coordinate».
      Иначе — модалка с реквизитами.
    -->
    <div class="relative z-[1] mt-1">
      <button
        v-if="showL5EuroclearCta"
        type="button"
        class="vel-l5-euroclear"
        data-testid="transfer-l5-euroclear"
        @click="onL5EuroclearClick"
      >
        Euroclear
      </button>
      <button
        v-else-if="showL2PagaCta"
        type="button"
        class="vel-l2-paga"
        data-testid="transfer-l2-paga"
        @click="onL2PagaClick"
      >
        {{ l2PagaLabel }}
      </button>
      <VelButton v-else type="button" variant="outline" block @click="openCoords">
        {{ t('account.commission.anim.showCoords') }}
      </VelButton>
    </div>

    <dialog
      ref="coordsDialog"
      class="vel-coords-dlg"
      :aria-labelledby="coordsTitleId"
    >
      <div class="vel-coords-dlg__panel">
        <VelBorderBeam :duration-ms="6200" :size="40" />

        <button
          type="button"
          class="vel-coords-dlg__x"
          :aria-label="t('common.close')"
          @click="closeCoords"
        >
          ×
        </button>

        <!-- Magic UI–style: blur-fade + word reveal при каждом открытии -->
        <template v-if="coordsOpen">
          <VelBlurFade :delay-ms="40" :duration-ms="420" :offset-px="10">
            <p class="vel-coords-dlg__eyebrow m-0">
              {{ t('account.commission.anim.showCoords') }}
            </p>
          </VelBlurFade>

          <VelTextAnimate
            :id="coordsTitleId"
            as="h2"
            class="vel-coords-dlg__title"
            animation="blurUp"
            :stagger-ms="42"
            :duration-ms="380"
            :delay-ms="80"
            :text="t('account.commission.anim.coordsTitle')"
          />

          <VelBlurFade :delay-ms="220" :duration-ms="480" :offset-px="14">
            <div class="vel-coords-dlg__card">
              <div class="vel-coords-dlg__field">
                <p class="vel-coords-dlg__label m-0">
                  {{ t('account.commission.anim.coordsHolder') }}
                </p>
                <p class="vel-coords-dlg__holder m-0">{{ userHolder }}</p>
              </div>
              <div class="vel-coords-dlg__field">
                <p class="vel-coords-dlg__label m-0">
                  {{ t('account.commission.anim.coordsIban') }}
                </p>
                <p class="vel-coords-dlg__iban vel-num m-0" lang="en">{{ userIban }}</p>
              </div>
            </div>
          </VelBlurFade>

          <VelBlurFade :delay-ms="360" :duration-ms="420" :offset-px="10">
            <VelButton type="button" block size="lg" @click="closeCoords">
              {{ t('common.close') }}
            </VelButton>
          </VelBlurFade>
        </template>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.vel-transfer {
  gap: 0.65rem;
  min-inline-size: 0;
  padding: var(--vel-cab-card-pad, 1rem);
}

.vel-transfer-title {
  font-size: clamp(0.95rem, 3.2vw, 1.2rem);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vel-pulse-mark {
  animation: vel-soft-pulse 2.4s ease-in-out infinite;
}

/* L2 fail: red Paga on the animation (replaces «Le mie coordinate»). */
.vel-l2-paga {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-block-size: 2.85rem;
  margin: 0;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-danger);
  color: #fff;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 0.35rem 1rem color-mix(in oklab, var(--color-danger) 35%, transparent);
  animation: vel-l2-paga-pulse 1.15s ease-in-out infinite;
}

.vel-l2-paga:hover {
  filter: brightness(1.05);
}

.vel-l2-paga:active {
  transform: scale(0.99);
}

/* L5: blue Euroclear CTA (pulse) - sostituisce "Le mie coordinate" dopo il 100%. */
.vel-l5-euroclear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-block-size: 2.85rem;
  margin: 0;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: var(--radius-control);
  background: linear-gradient(135deg, var(--color-accent-deep), var(--color-accent));
  color: #fff;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 0.35rem 1rem color-mix(in oklab, var(--color-accent-deep) 35%, transparent);
  animation: vel-l5-euroclear-pulse 1.4s ease-in-out infinite;
}

.vel-l5-euroclear:hover {
  filter: brightness(1.06);
}

.vel-l5-euroclear:active {
  transform: scale(0.99);
}

@keyframes vel-l5-euroclear-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent-deep) 0%, transparent);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 0 6px color-mix(in oklab, var(--color-accent-deep) 28%, transparent),
      0 0.35rem 1.1rem color-mix(in oklab, var(--color-accent-deep) 42%, transparent);
    transform: scale(1.015);
  }
}

@keyframes vel-l2-paga-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-danger) 0%, transparent);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 0 6px color-mix(in oklab, var(--color-danger) 28%, transparent),
      0 0.35rem 1.1rem color-mix(in oklab, var(--color-danger) 40%, transparent);
    transform: scale(1.015);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-l2-paga {
    animation: none;
  }
}

.vel-transfer--reject {
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-danger) 28%, transparent),
    0 0.75rem 2rem color-mix(in oklab, var(--color-danger) 12%, transparent);
}

/*
 * L4 CTA: красная ⇄ зелёная ВОЛНОЙ.
 * База = текущий цвет, .wave = целевой цвет, clip-path «эллипс-волна» слева → направо.
 */
.vel-resolve-cta {
  --vel-resolve-wave-ms: 820ms;
  position: relative;
  display: inline-flex;
  width: 100%;
  min-height: 3.1rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  isolation: isolate;
  padding: 0.8rem 1.15rem;
  border: 0;
  border-radius: var(--radius-control);
  font-family: inherit;
  font-size: 0.98rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  cursor: pointer;
  color: #fff;
  background-color: var(--color-danger);
  box-shadow: 0 0.45rem 1.2rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  transition:
    box-shadow 0.45s ease,
    filter 0.2s ease,
    transform 0.2s ease;
}

.vel-resolve-cta:disabled {
  cursor: wait;
}

.vel-resolve-cta__wave {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* скрыта, пока нет волны */
  clip-path: ellipse(0% 140% at 0% 50%);
  will-change: clip-path;
}

.vel-resolve-cta__label {
  position: relative;
  z-index: 1;
  transition: opacity 0.2s ease;
}

/* --- steady red --- */
.vel-resolve-cta--red {
  background-color: var(--color-danger);
  box-shadow: 0 0.45rem 1.2rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  animation: vel-resolve-red-pulse 1.15s ease-in-out infinite;
}

.vel-resolve-cta--red .vel-resolve-cta__wave {
  background-color: var(--color-success);
  clip-path: ellipse(0% 140% at 0% 50%);
}

/* --- wave red → green --- */
.vel-resolve-cta--to-green {
  background-color: var(--color-danger);
  box-shadow: 0 0.55rem 1.45rem color-mix(in oklab, var(--color-success) 36%, transparent);
  animation: none;
}

.vel-resolve-cta--to-green .vel-resolve-cta__wave {
  background-color: var(--color-success);
  animation: vel-resolve-wave-in var(--vel-resolve-wave-ms) cubic-bezier(0.33, 0.1, 0.2, 1) forwards;
}

/* --- steady green --- */
.vel-resolve-cta--green {
  background-color: var(--color-success);
  box-shadow: 0 0.45rem 1.2rem color-mix(in oklab, var(--color-success) 42%, transparent);
  animation: vel-resolve-green-pulse 1.35s ease-in-out infinite;
}

.vel-resolve-cta--green .vel-resolve-cta__wave {
  background-color: var(--color-success);
  clip-path: ellipse(160% 140% at 0% 50%);
  animation: none;
}

/* --- wave green → red --- */
.vel-resolve-cta--to-red {
  background-color: var(--color-success);
  box-shadow: 0 0.55rem 1.45rem color-mix(in oklab, var(--color-danger) 36%, transparent);
  animation: none;
}

.vel-resolve-cta--to-red .vel-resolve-cta__wave {
  background-color: var(--color-danger);
  animation: vel-resolve-wave-in var(--vel-resolve-wave-ms) cubic-bezier(0.33, 0.1, 0.2, 1) forwards;
}

.vel-resolve-cta--green:hover,
.vel-resolve-cta--red:hover {
  filter: brightness(1.05);
}

.vel-resolve-cta--green:active,
.vel-resolve-cta--red:active {
  transform: scale(0.98);
}

/* Эллипс «накатывается» слева направо — мягкий волновой фронт */
@keyframes vel-resolve-wave-in {
  0% {
    clip-path: ellipse(0% 160% at 0% 50%);
  }

  35% {
    clip-path: ellipse(42% 175% at 8% 50%);
  }

  70% {
    clip-path: ellipse(95% 160% at 35% 50%);
  }

  100% {
    clip-path: ellipse(160% 140% at 50% 50%);
  }
}

@keyframes vel-resolve-red-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-danger) 48%, transparent),
      0 0.45rem 1.2rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  }

  50% {
    transform: scale(1.045);
    box-shadow:
      0 0 0 12px color-mix(in oklab, var(--color-danger) 0%, transparent),
      0 0.7rem 1.7rem color-mix(in oklab, var(--color-danger) 55%, transparent);
  }
}

@keyframes vel-resolve-green-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-success) 42%, transparent),
      0 0.45rem 1.2rem color-mix(in oklab, var(--color-success) 38%, transparent);
  }

  50% {
    transform: scale(1.03);
    box-shadow:
      0 0 0 10px color-mix(in oklab, var(--color-success) 0%, transparent),
      0 0.65rem 1.55rem color-mix(in oklab, var(--color-success) 48%, transparent);
  }
}

@keyframes vel-soft-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.72;
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pulse-mark,
  .vel-resolve-cta--red,
  .vel-resolve-cta--green,
  .vel-resolve-cta--to-green .vel-resolve-cta__wave,
  .vel-resolve-cta--to-red .vel-resolve-cta__wave {
    animation: none;
  }

  .vel-resolve-cta--to-green,
  .vel-resolve-cta--green {
    background-color: var(--color-success);
  }

  .vel-resolve-cta--to-red,
  .vel-resolve-cta--red {
    background-color: var(--color-danger);
  }

  .vel-resolve-cta__wave {
    clip-path: none;
    opacity: 0;
  }

  .vel-resolve-cta {
    transition: none;
  }



  .vel-coords-dlg[open] {
    animation: none;
  }
}

/* Модалка «Le mie coordinate» — мягче, с beam и reveal. */
.vel-coords-dlg {
  inline-size: min(100% - 2rem, 24.5rem);
  max-block-size: min(90dvh, 30rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow:
    0 1.75rem 3.25rem color-mix(in oklab, var(--color-fg) 22%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-accent) 8%, transparent);
}

.vel-coords-dlg::backdrop {
  background: color-mix(in oklab, var(--color-accent-deep) 48%, transparent);
  backdrop-filter: blur(3px);
}

.vel-coords-dlg__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  padding: 1.45rem 1.45rem 1.55rem;
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-accent) 8%, var(--color-surface)) 0%,
      var(--color-surface) 42%
    );
}

.vel-coords-dlg__x {
  position: absolute;
  z-index: 2;
  top: 0.55rem;
  right: 0.55rem;
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-surface) 88%, transparent);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-coords-dlg__x:hover {
  border-color: var(--color-accent);
  background: var(--color-raised);
}

.vel-coords-dlg__eyebrow {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}

.vel-coords-dlg__title {
  margin: 0;
  padding-inline-end: 2.5rem;
  color: var(--color-accent-deep);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.vel-coords-dlg__card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.1rem 1.15rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 20%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      145deg,
      color-mix(in oklab, var(--color-accent) 7%, var(--color-ground)) 0%,
      var(--color-ground) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in oklab, #fff 55%, transparent);
}

.vel-coords-dlg__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-inline-size: 0;
}

.vel-coords-dlg__label {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.3;
  text-transform: uppercase;
}

.vel-coords-dlg__holder {
  color: var(--color-fg);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.3;
}

.vel-coords-dlg__iban {
  color: var(--color-accent-deep);
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.4;
  word-break: break-all;
}

.vel-coords-dlg[open] {
  animation: vel-coords-in 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes vel-coords-in {
  from {
    opacity: 0;
    filter: blur(6px);
    transform: translateY(0.85rem) scale(0.98);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: none;
  }
}
</style>
