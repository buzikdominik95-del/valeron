<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useSimulatorStore } from '@/stores/simulator.store'
import type { SceneLook } from '@/features/account/scene/transfer-palette'
import VelTransferScene from '@/features/account/VelTransferScene.vue'
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
  }>(),
  { rejectOpen: false },
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
  isTgFinal,
  level,
} = useCommission()
const { approvedAmount, client, transferAccountTail } = useAccount()
const accountStore = useAccountStore()
const { gender } = storeToRefs(useSimulatorStore())

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
const sceneFailed = computed(
  () =>
    isRejectAnim.value ||
    isFailed.value ||
    isTgFinal.value ||
    isSuspended.value ||
    (level.value === 2 && isPayFee.value),
)

/** CTA оплаты 280 снята — на L4 только TG, кнопку resolve не показываем. */
const showResolveCta = computed(() => false)

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
  const full = accountStore.ibanFull.replace(/\s+/g, '')
  if (full.length >= 4) return full.slice(-4)
  const masked = accountStore.ibanMasked.replace(/\s+/g, '')
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

    <p class="relative z-[1] m-0 text-sm text-muted">{{ lead }}</p>

    <div class="relative z-[1]" :class="{ 'vel-transfer-scene-wrap--reject': sceneFailed }">
      <VelTransferScene
        :progress="animationProgress"
        :amount="approvedAmount"
        :name="recipientName"
        :iban="sceneIbanTail"
        :remaining-ms="animationRemainingMs"
        :failed="sceneFailed"
        :look="personLook"
      />
      <!-- Отказ: soft pulse + badge + freeze chips — в стиле transfer-anim -->
      <div v-if="sceneFailed" class="vel-reject-overlay" aria-hidden="true">
        <span class="vel-reject-overlay__glow" />
        <span class="vel-reject-overlay__ring vel-reject-overlay__ring--a" />
        <span class="vel-reject-overlay__ring vel-reject-overlay__ring--b" />
        <span class="vel-reject-overlay__slash" />
        <span class="vel-reject-overlay__badge">
          <svg class="vel-reject-overlay__x" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7 7 17" />
          </svg>
        </span>
        <span class="vel-reject-overlay__chip vel-reject-overlay__chip--l">SEPA</span>
        <span class="vel-reject-overlay__chip vel-reject-overlay__chip--r">HOLD</span>
      </div>
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

    <!-- Кнопка → модалка с реквизитами (не inline-dropdown). -->
    <div class="relative z-[1] mt-1">
      <VelButton type="button" variant="outline" block @click="openCoords">
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

.vel-transfer-scene-wrap--reject {
  position: relative;
  border-radius: var(--radius-control);
  overflow: hidden;
  animation: vel-reject-shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.vel-reject-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 50% 48%,
      color-mix(in oklab, var(--color-danger) 22%, transparent) 0%,
      color-mix(in oklab, var(--color-danger) 8%, transparent) 42%,
      transparent 72%
    ),
    color-mix(in oklab, var(--color-fg) 18%, transparent);
  animation: vel-reject-fade 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  backdrop-filter: saturate(0.85) blur(0.5px);
}

.vel-reject-overlay__glow {
  position: absolute;
  width: 7.5rem;
  height: 7.5rem;
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-danger) 28%, transparent);
  filter: blur(18px);
  animation: vel-reject-glow 2.2s ease-in-out infinite;
}

.vel-reject-overlay__ring {
  position: absolute;
  width: 5.75rem;
  height: 5.75rem;
  border: 2.5px solid color-mix(in oklab, var(--color-danger) 55%, transparent);
  border-radius: var(--radius-round);
  animation: vel-reject-ring 1.7s ease-out infinite;
}

.vel-reject-overlay__ring--b {
  width: 4.35rem;
  height: 4.35rem;
  border-width: 2px;
  border-color: color-mix(in oklab, var(--color-danger) 40%, transparent);
  animation-delay: 0.35s;
  animation-duration: 1.9s;
}

.vel-reject-overlay__slash {
  position: absolute;
  width: 6.5rem;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklab, var(--color-danger) 85%, #fff),
    transparent
  );
  transform: rotate(-28deg) scaleX(0.2);
  opacity: 0;
  animation: vel-reject-slash 0.7s 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-reject-overlay__badge {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: var(--radius-round);
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-danger) 88%, #fff),
    var(--color-danger)
  );
  color: #fff;
  box-shadow:
    0 0 0 3px color-mix(in oklab, var(--color-surface) 90%, transparent),
    0 0.55rem 1.6rem color-mix(in oklab, var(--color-danger) 48%, transparent);
  animation: vel-reject-pop 0.58s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-reject-overlay__x {
  width: 1.35rem;
  height: 1.35rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
}

.vel-reject-overlay__chip {
  position: absolute;
  z-index: 2;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--color-danger) 35%, transparent);
  background: color-mix(in oklab, var(--color-surface) 92%, var(--color-danger));
  color: var(--color-danger);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1.2;
  box-shadow: 0 0.25rem 0.75rem color-mix(in oklab, var(--color-fg) 12%, transparent);
  animation: vel-reject-chip 0.55s 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-reject-overlay__chip--l {
  top: 18%;
  left: 12%;
  transform: rotate(-8deg);
}

.vel-reject-overlay__chip--r {
  right: 12%;
  bottom: 16%;
  transform: rotate(7deg);
  animation-delay: 0.32s;
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

@keyframes vel-reject-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes vel-reject-pop {
  0% {
    opacity: 0;
    transform: scale(0.45) rotate(-12deg);
  }

  70% {
    opacity: 1;
    transform: scale(1.08) rotate(2deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes vel-reject-ring {
  0% {
    transform: scale(0.82);
    opacity: 0.72;
  }

  100% {
    transform: scale(1.65);
    opacity: 0;
  }
}

@keyframes vel-reject-glow {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.95);
  }

  50% {
    opacity: 0.9;
    transform: scale(1.08);
  }
}

@keyframes vel-reject-slash {
  from {
    opacity: 0;
    transform: rotate(-28deg) scaleX(0.15);
  }

  to {
    opacity: 0.95;
    transform: rotate(-28deg) scaleX(1);
  }
}

@keyframes vel-reject-chip {
  from {
    opacity: 0;
    filter: blur(2px);
  }

  to {
    opacity: 1;
    filter: blur(0);
  }
}

@keyframes vel-reject-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  18% {
    transform: translateX(-3px);
  }

  36% {
    transform: translateX(3px);
  }

  54% {
    transform: translateX(-2px);
  }

  72% {
    transform: translateX(1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pulse-mark,
  .vel-reject-overlay__ring,
  .vel-reject-overlay__badge,
  .vel-reject-overlay,
  .vel-reject-overlay__glow,
  .vel-reject-overlay__slash,
  .vel-reject-overlay__chip,
  .vel-transfer-scene-wrap--reject,
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

  .vel-reject-overlay__slash {
    opacity: 0.9;
    transform: rotate(-28deg) scaleX(1);
  }

  .vel-reject-overlay__chip {
    opacity: 1;
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
