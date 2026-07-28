<script setup lang="ts">
import { watch } from 'vue'
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

/**
 * Полноэкранный крестик при отказе / L2 freeze: вылетает на экран и через
 * ~1.4 с сам уходит. Дальше остаётся карточка suspended / freeze-сцена.
 */
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const reduced = usePreferredReducedMotion()

const HOLD_MS = 1400
const FAST_MS = 280

const { start: scheduleClose, stop: stopClose } = useTimeoutFn(
  () => {
    open.value = false
  },
  () => (reduced.value === 'reduce' ? FAST_MS : HOLD_MS),
  { immediate: false },
)

watch(open, (isOpen) => {
  stopClose()
  if (isOpen) scheduleClose()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-rx">
      <div
        v-if="open"
        class="vel-rx"
        role="status"
        aria-live="assertive"
        :aria-label="t('account.commission.anim.overlineFailed')"
      >
        <div class="vel-rx__scrim" aria-hidden="true" />
        <div class="vel-rx__burst" aria-hidden="true" />
        <div class="vel-rx__ring vel-rx__ring--a" aria-hidden="true" />
        <div class="vel-rx__ring vel-rx__ring--b" aria-hidden="true" />
        <div class="vel-rx__badge" aria-hidden="true">
          <svg class="vel-rx__x" viewBox="0 0 64 64" fill="none">
            <path
              class="vel-rx__stroke vel-rx__stroke--1"
              d="M18 18 L46 46"
            />
            <path
              class="vel-rx__stroke vel-rx__stroke--2"
              d="M46 18 L18 46"
            />
          </svg>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-rx {
  position: fixed;
  inset: 0;
  z-index: 75;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.vel-rx__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, var(--color-danger) 28%, #0a0a12 55%);
  animation: vel-rx-scrim 1.4s ease-out both;
}

.vel-rx__burst {
  position: absolute;
  width: min(22rem, 70vw);
  height: min(22rem, 70vw);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    color-mix(in oklab, var(--color-danger) 55%, transparent) 0%,
    transparent 68%
  );
  filter: blur(8px);
  animation: vel-rx-burst 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-rx__ring {
  position: absolute;
  border-radius: 999px;
  border: 3px solid color-mix(in oklab, var(--color-danger) 70%, #fff);
  animation: vel-rx-ring 1.15s ease-out both;
}

.vel-rx__ring--a {
  width: min(11rem, 42vw);
  height: min(11rem, 42vw);
}

.vel-rx__ring--b {
  width: min(15rem, 56vw);
  height: min(15rem, 56vw);
  border-width: 2px;
  opacity: 0.65;
  animation-delay: 0.08s;
}

.vel-rx__badge {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: min(7.5rem, 34vw);
  height: min(7.5rem, 34vw);
  border-radius: 999px;
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-danger) 75%, #fff),
    var(--color-danger)
  );
  box-shadow:
    0 0 0 6px color-mix(in oklab, #fff 18%, transparent),
    0 1.25rem 3rem color-mix(in oklab, var(--color-danger) 55%, transparent);
  animation: vel-rx-pop 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-rx__x {
  width: 58%;
  height: 58%;
}

.vel-rx__stroke {
  stroke: #fff;
  stroke-width: 5.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: vel-rx-draw 0.45s 0.18s cubic-bezier(0.65, 0, 0.35, 1) both;
}

.vel-rx__stroke--2 {
  animation-delay: 0.32s;
}

.vel-rx-enter-active,
.vel-rx-leave-active {
  transition: opacity 0.28s ease;
}

.vel-rx-enter-from,
.vel-rx-leave-to {
  opacity: 0;
}

@keyframes vel-rx-scrim {
  0% {
    opacity: 0;
  }

  18% {
    opacity: 1;
  }

  75% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

@keyframes vel-rx-burst {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }

  40% {
    opacity: 1;
    transform: scale(1.05);
  }

  100% {
    opacity: 0.35;
    transform: scale(1.25);
  }
}

@keyframes vel-rx-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.55);
  }

  100% {
    opacity: 0;
    transform: scale(1.55);
  }
}

@keyframes vel-rx-pop {
  0% {
    opacity: 0;
    transform: scale(0.35) rotate(-18deg);
  }

  55% {
    opacity: 1;
    transform: scale(1.12) rotate(4deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes vel-rx-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-rx__scrim,
  .vel-rx__burst,
  .vel-rx__ring,
  .vel-rx__badge,
  .vel-rx__stroke {
    animation: none;
  }

  .vel-rx__stroke {
    stroke-dashoffset: 0;
  }

  .vel-rx__scrim {
    opacity: 0.85;
  }
}
</style>
