<script setup lang="ts">
import { watch } from 'vue'
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { wantsFastAnim } from '@/lib/fast-anim'

/**
 * Полноэкранная «заморозка счёта» перед TG-модалкой (финал L4).
 * Ледяной scrim + замок + подпись → ~2 с → emit done → модалка менеджера.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ done: [] }>()

const { t } = useI18n()
const reduced = usePreferredReducedMotion()

const HOLD_MS = wantsFastAnim() ? 520 : 2200
const FAST_MS = 320

const { start: scheduleDone, stop: stopDone } = useTimeoutFn(
  () => {
    open.value = false
    emit('done')
  },
  () => (reduced.value === 'reduce' ? FAST_MS : HOLD_MS),
  { immediate: false },
)

watch(open, (isOpen) => {
  stopDone()
  if (isOpen) scheduleDone()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-fi">
      <div
        v-if="open"
        class="vel-fi"
        role="status"
        aria-live="assertive"
        data-testid="account-freeze-intro"
        :aria-label="t('account.commission.freezeIntro.aria')"
      >
        <div class="vel-fi__scrim" aria-hidden="true" />
        <div class="vel-fi__frost vel-fi__frost--a" aria-hidden="true" />
        <div class="vel-fi__frost vel-fi__frost--b" aria-hidden="true" />
        <div class="vel-fi__shards" aria-hidden="true">
          <span v-for="n in 8" :key="n" class="vel-fi__shard" :style="{ '--i': n }" />
        </div>

        <div class="vel-fi__core">
          <div class="vel-fi__ring" aria-hidden="true" />
          <div class="vel-fi__badge" aria-hidden="true">
            <svg class="vel-fi__lock" viewBox="0 0 32 32" fill="none">
              <rect
                class="vel-fi__lock-body"
                x="7"
                y="14"
                width="18"
                height="13"
                rx="2.5"
                stroke="currentColor"
                stroke-width="2.2"
              />
              <path
                class="vel-fi__lock-shackle"
                d="M11 14V11a5 5 0 0 1 10 0v3"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              />
              <circle class="vel-fi__lock-dot" cx="16" cy="20.5" r="1.6" fill="currentColor" />
            </svg>
          </div>
          <p class="vel-fi__title">{{ t('account.commission.freezeIntro.title') }}</p>
          <p class="vel-fi__sub">{{ t('account.commission.freezeIntro.sub') }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-fi {
  position: fixed;
  inset: 0;
  z-index: 78;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.vel-fi__scrim {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 90% 70% at 50% 40%,
      color-mix(in oklab, #7ec8ff 22%, transparent),
      color-mix(in oklab, #0b1a2e 78%, #000) 72%
    );
  animation: vel-fi-scrim 2.1s ease-out both;
}

.vel-fi__frost {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  opacity: 0.55;
  background-image:
    radial-gradient(circle at 20% 30%, color-mix(in oklab, #fff 35%, transparent) 0 1px, transparent 1.5px),
    radial-gradient(circle at 70% 60%, color-mix(in oklab, #cfefff 40%, transparent) 0 1px, transparent 1.5px),
    radial-gradient(circle at 45% 80%, color-mix(in oklab, #fff 30%, transparent) 0 1px, transparent 1.5px);
  background-size: 48px 48px, 36px 36px, 52px 52px;
  animation: vel-fi-frost 2s ease-out both;
  mix-blend-mode: screen;
}

.vel-fi__frost--b {
  animation-delay: 0.12s;
  opacity: 0.35;
  transform: scale(1.05);
}

.vel-fi__shards {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.vel-fi__shard {
  --i: 1;
  position: absolute;
  left: calc(8% + (var(--i) * 10%));
  top: calc(12% + (var(--i) * 7%));
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 1px;
  background: linear-gradient(
    135deg,
    color-mix(in oklab, #fff 90%, #9ad4ff),
    color-mix(in oklab, #7ec8ff 70%, transparent)
  );
  box-shadow: 0 0 12px color-mix(in oklab, #9ad4ff 55%, transparent);
  animation: vel-fi-shard 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i) * 40ms);
  opacity: 0;
}

.vel-fi__core {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 1.25rem;
  text-align: center;
  animation: vel-fi-core 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-fi__ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(11rem, 48vw);
  height: min(11rem, 48vw);
  margin: calc(min(11rem, 48vw) / -2) 0 0 calc(min(11rem, 48vw) / -2);
  border: 2px solid color-mix(in oklab, #9ad4ff 65%, #fff);
  border-radius: 999px;
  animation: vel-fi-ring 1.6s ease-out both;
}

.vel-fi__badge {
  display: grid;
  place-items: center;
  width: min(6.5rem, 32vw);
  height: min(6.5rem, 32vw);
  border-radius: 999px;
  color: #eaf6ff;
  background: linear-gradient(
    150deg,
    color-mix(in oklab, #9ad4ff 55%, #1a3a5c),
    color-mix(in oklab, #2a5f8f 70%, #0b1a2e)
  );
  box-shadow:
    0 0 0 5px color-mix(in oklab, #9ad4ff 22%, transparent),
    0 1.1rem 2.5rem color-mix(in oklab, #0b1a2e 55%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 35%, transparent);
  animation: vel-fi-badge 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-fi__lock {
  width: 48%;
  height: 48%;
}

.vel-fi__lock-shackle {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: vel-fi-draw 0.55s 0.25s cubic-bezier(0.65, 0, 0.35, 1) both;
}

.vel-fi__lock-body {
  stroke-dasharray: 70;
  stroke-dashoffset: 70;
  animation: vel-fi-draw 0.5s 0.38s cubic-bezier(0.65, 0, 0.35, 1) both;
}

.vel-fi__lock-dot {
  opacity: 0;
  animation: vel-fi-dot 0.3s 0.75s ease-out both;
}

.vel-fi__title {
  margin: 0.35rem 0 0;
  color: #f2f8ff;
  font-size: clamp(1.05rem, 3.8vw, 1.35rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-shadow: 0 2px 16px color-mix(in oklab, #0b1a2e 60%, transparent);
}

.vel-fi__sub {
  margin: 0;
  max-inline-size: 18rem;
  color: color-mix(in oklab, #d6ebff 88%, #fff);
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.35;
  opacity: 0.92;
}

.vel-fi-enter-active,
.vel-fi-leave-active {
  transition: opacity 0.32s ease;
}

.vel-fi-enter-from,
.vel-fi-leave-to {
  opacity: 0;
}

@keyframes vel-fi-scrim {
  0% {
    opacity: 0;
  }

  15% {
    opacity: 1;
  }

  78% {
    opacity: 1;
  }

  100% {
    opacity: 0.88;
  }
}

@keyframes vel-fi-frost {
  from {
    opacity: 0;
    filter: blur(6px);
  }

  to {
    opacity: 0.55;
    filter: blur(0);
  }
}

@keyframes vel-fi-shard {
  0% {
    opacity: 0;
    transform: translateY(-1.2rem) rotate(0deg) scale(0.4);
  }

  35% {
    opacity: 1;
  }

  100% {
    opacity: 0.55;
    transform: translateY(1.4rem) rotate(48deg) scale(1);
  }
}

@keyframes vel-fi-core {
  from {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.94);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-fi-badge {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }

  55% {
    opacity: 1;
    transform: scale(1.1);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes vel-fi-ring {
  0% {
    opacity: 0.85;
    transform: scale(0.55);
  }

  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

@keyframes vel-fi-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes vel-fi-dot {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-fi__scrim,
  .vel-fi__frost,
  .vel-fi__shard,
  .vel-fi__core,
  .vel-fi__badge,
  .vel-fi__ring,
  .vel-fi__lock-shackle,
  .vel-fi__lock-body,
  .vel-fi__lock-dot {
    animation: none;
  }

  .vel-fi__lock-shackle,
  .vel-fi__lock-body {
    stroke-dashoffset: 0;
  }

  .vel-fi__lock-dot {
    opacity: 1;
  }

  .vel-fi__scrim {
    opacity: 0.92;
  }
}
</style>
