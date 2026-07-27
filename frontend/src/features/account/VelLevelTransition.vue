<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import type { CommissionLevel } from '@/api/commission'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Прогрузка с логотипом Velora между этапами воронки (L1→L2, L2→L3…).
 * Покрывает смену UI, чтобы не мелькал «прыжок» карточек.
 */
const props = defineProps<{
  level: CommissionLevel
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const reducedMotion = usePreferredReducedMotion()

const HOLD_MS = 1600
const FADE_MS = 380
const FAST_MS = 200

const fading = ref(false)
const bootstrapped = ref(false)

const { start: startFade, stop: stopFade } = useTimeoutFn(
  () => {
    fading.value = true
  },
  () => (reducedMotion.value === 'reduce' ? FAST_MS : HOLD_MS),
  { immediate: false },
)

const { start: startClose, stop: stopClose } = useTimeoutFn(
  () => {
    open.value = false
    fading.value = false
  },
  () =>
    reducedMotion.value === 'reduce' ? FAST_MS + 80 : HOLD_MS + FADE_MS,
  { immediate: false },
)

function play(): void {
  stopFade()
  stopClose()
  fading.value = false
  open.value = true
  startFade()
  startClose()
}

/*
 * Первый mount — не играем (это не «переход», а начальный уровень).
 * Дальше любое изменение level → прогрузка.
 */
watch(
  () => props.level,
  (next, prev) => {
    if (!bootstrapped.value) {
      bootstrapped.value = true
      return
    }
    if (next === prev) return
    play()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-lvl">
      <div
        v-if="open"
        class="vel-lvl"
        :class="{ 'vel-lvl--out': fading }"
        role="status"
        aria-live="polite"
        :aria-label="t('account.levelTransition.aria')"
      >
        <div class="vel-lvl__glow" aria-hidden="true" />
        <div class="vel-lvl__mark" aria-hidden="true">
          <VelLogo mark-only large class="vel-lvl__logo" />
        </div>
        <p class="vel-lvl__brand">{{ t('brand.name') }}</p>
        <p class="vel-lvl__text">{{ t('account.levelTransition.text') }}</p>
        <span class="vel-lvl__spinner" aria-hidden="true" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-lvl {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  padding: 1.5rem;
  background:
    radial-gradient(
      ellipse 70% 55% at 50% 42%,
      color-mix(in oklab, var(--color-accent) 28%, transparent),
      transparent 70%
    ),
    var(--color-accent-deep);
  color: #fff;
  text-align: center;
  opacity: 1;
  transition: opacity 380ms ease;
}

.vel-lvl--out {
  opacity: 0;
  pointer-events: none;
}

.vel-lvl__glow {
  position: absolute;
  width: min(22rem, 70vw);
  height: min(22rem, 70vw);
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 35%, transparent);
  filter: blur(40px);
  opacity: 0.55;
  animation: vel-lvl-glow 2.2s ease-in-out infinite;
}

.vel-lvl__mark {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: var(--radius-round);
  background: color-mix(in oklab, #fff 12%, transparent);
  border: 1px solid color-mix(in oklab, #fff 28%, transparent);
  box-shadow: 0 0.75rem 2rem color-mix(in oklab, #000 28%, transparent);
  animation: vel-lvl-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-lvl__logo {
  /* логотип светлый на тёмном фоне */
  filter: brightness(0) invert(1);
  transform: scale(1.35);
}

.vel-lvl__brand {
  position: relative;
  z-index: 1;
  margin: 0.35rem 0 0;
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  animation: vel-lvl-fade 0.5s 0.12s ease both;
}

.vel-lvl__text {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: 18rem;
  color: color-mix(in oklab, #fff 78%, transparent);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
  animation: vel-lvl-fade 0.5s 0.2s ease both;
}

.vel-lvl__spinner {
  position: relative;
  z-index: 1;
  width: 1.75rem;
  height: 1.75rem;
  margin-block-start: 0.65rem;
  border: 2.5px solid color-mix(in oklab, #fff 25%, transparent);
  border-top-color: #fff;
  border-radius: 999px;
  animation: vel-lvl-spin 0.75s linear infinite;
}

.vel-lvl-enter-active,
.vel-lvl-leave-active {
  transition: opacity 0.28s ease;
}

.vel-lvl-enter-from,
.vel-lvl-leave-to {
  opacity: 0;
}

@keyframes vel-lvl-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-lvl-pop {
  from {
    opacity: 0;
    transform: scale(0.72);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes vel-lvl-fade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes vel-lvl-glow {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-lvl__spinner,
  .vel-lvl__glow,
  .vel-lvl__mark,
  .vel-lvl__brand,
  .vel-lvl__text {
    animation: none;
  }

  .vel-lvl {
    transition-duration: 80ms;
  }
}
</style>
