<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
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
import VelButton from '@/components/ui/VelButton.vue'

/** L2/L4: сцена перевода + кнопка «мои реквизиты» → модалка (не dropdown). */
const { t } = useI18n()
const { animationProgress, animationRemainingMs, isFailed, isRejectAnim } = useCommission()
const { approvedAmount, client, transferAccountTail } = useAccount()
const accountStore = useAccountStore()
const { gender } = storeToRefs(useSimulatorStore())

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const coordsOpen = ref(false)
const coordsDialog = useTemplateRef<HTMLDialogElement>('coordsDialog')
useNativeDialog(coordsDialog, coordsOpen)

const coordsTitleId = `vel-coords-title-${useId()}`

const recipientName = computed(() => client.value.fullName)
const personLook = computed<SceneLook>(() => (gender.value === 'male' ? 'crop' : 'bob'))

/** failed prop for canvas: hold after 100% or final fail */
const sceneFailed = computed(() => isRejectAnim.value || isFailed.value)

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

const userIban = computed(() => accountStore.ibanFull || transferAccountTail.value || '—')
const userHolder = computed(
  () =>
    accountStore.payoutHolder ||
    client.value.fullName ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ') ||
    '—',
)

function openCoords(): void {
  coordsOpen.value = true
}

function closeCoords(): void {
  coordsOpen.value = false
}
</script>

<template>
  <section
    ref="root"
    class="relative flex flex-col gap-3 overflow-hidden rounded-panel border bg-surface p-5 sm:p-6"
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
        :iban="transferAccountTail"
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
        <button
          type="button"
          class="vel-coords-dlg__x"
          :aria-label="t('common.close')"
          @click="closeCoords"
        >
          ×
        </button>

        <h2 :id="coordsTitleId" class="vel-coords-dlg__title m-0">
          {{ t('account.commission.anim.coordsTitle') }}
        </h2>

        <div class="vel-coords-dlg__card">
          <p class="m-0 text-base font-semibold text-fg">{{ userHolder }}</p>
          <p class="vel-num m-0 mt-2 text-base font-semibold text-fg" lang="en">
            {{ userIban }}
          </p>
        </div>

        <VelButton type="button" block size="lg" @click="closeCoords">
          {{ t('common.close') }}
        </VelButton>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.vel-transfer-title {
  font-size: clamp(1rem, 3.8vw, 1.35rem);
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
  .vel-transfer-scene-wrap--reject {
    animation: none;
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

/* Модалка «Le mie coordinate» */
.vel-coords-dlg {
  inline-size: min(100% - 2rem, 24rem);
  max-block-size: min(90dvh, 28rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

.vel-coords-dlg::backdrop {
  background: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-coords-dlg__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.35rem 1.4rem 1.5rem;
}

.vel-coords-dlg__x {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: var(--color-ground);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-coords-dlg__x:hover {
  border-color: var(--color-accent);
  background: var(--color-raised);
}

.vel-coords-dlg__title {
  padding-inline-end: 2.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.vel-coords-dlg__card {
  padding: 1rem 1.05rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
}

.vel-coords-dlg[open] {
  animation: vel-coords-in 200ms ease-out;
}

@keyframes vel-coords-in {
  from {
    opacity: 0;
    transform: translateY(0.65rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
