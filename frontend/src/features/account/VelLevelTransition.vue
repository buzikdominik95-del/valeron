<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import type { CommissionLevel } from '@/api/commission'
import VelLogo from '@/components/ui/VelLogo.vue'
import VelTextAnimate from '@/components/magic/VelTextAnimate.vue'
import VelBlurFade from '@/components/magic/VelBlurFade.vue'

/**
 * Прогрузка между этапами воронки (L1→L2…).
 * Полноэкранный «шторм» с логотипом, орбитами и shimmer-текстом —
 * чтобы смена UI не выглядела как прыжок карточек.
 */
const props = defineProps<{
  level: CommissionLevel
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const reducedMotion = usePreferredReducedMotion()

const HOLD_MS = 2000
const FADE_MS = 420
const FAST_MS = 220

const fading = ref(false)
const bootstrapped = ref(false)
/** Ключ remount анимаций текста при каждом play(). */
const playKey = ref(0)

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
  playKey.value += 1
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

const stepLabel = computed(() =>
  t('account.levelTransition.step', { n: props.level, total: 4 }),
)

const titleText = computed(() => t('account.levelTransition.title'))
const leadText = computed(() => t('account.levelTransition.text'))
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
        <!-- Фон: сетка + мягкие «авроры» -->
        <div class="vel-lvl__bg" aria-hidden="true">
          <span class="vel-lvl__aurora vel-lvl__aurora--a" />
          <span class="vel-lvl__aurora vel-lvl__aurora--b" />
          <span class="vel-lvl__grid" />
          <span class="vel-lvl__scan" />
        </div>

        <div class="vel-lvl__stage" :key="playKey">
          <!-- Орбиты вокруг логотипа -->
          <div class="vel-lvl__orbit-wrap" aria-hidden="true">
            <span class="vel-lvl__orbit vel-lvl__orbit--outer" />
            <span class="vel-lvl__orbit vel-lvl__orbit--mid" />
            <span class="vel-lvl__orbit vel-lvl__orbit--inner" />
            <span class="vel-lvl__spark vel-lvl__spark--1" />
            <span class="vel-lvl__spark vel-lvl__spark--2" />
            <span class="vel-lvl__spark vel-lvl__spark--3" />

            <div class="vel-lvl__mark">
              <span class="vel-lvl__mark-ring" />
              <VelLogo mark-only large class="vel-lvl__logo" />
            </div>
          </div>

          <VelBlurFade :delay-ms="120" :duration-ms="500" :offset-px="10">
            <p class="vel-lvl__step m-0">{{ stepLabel }}</p>
          </VelBlurFade>

          <VelTextAnimate
            as="p"
            class="vel-lvl__brand"
            animation="blurUp"
            :stagger-ms="36"
            :duration-ms="400"
            :delay-ms="160"
            :text="t('brand.name')"
          />

          <VelTextAnimate
            as="p"
            class="vel-lvl__title"
            animation="blurUp"
            :stagger-ms="40"
            :duration-ms="420"
            :delay-ms="280"
            :text="titleText"
          />

          <VelBlurFade :delay-ms="420" :duration-ms="480" :offset-px="12">
            <p class="vel-lvl__text m-0">{{ leadText }}</p>
          </VelBlurFade>

          <!-- Прогресс-бар «дыхание» -->
          <div class="vel-lvl__track" aria-hidden="true">
            <span class="vel-lvl__track-fill" />
            <span class="vel-lvl__track-glow" />
          </div>

          <div class="vel-lvl__dots" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>
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
  padding: 1.5rem;
  overflow: hidden;
  background: #0a162c;
  color: #fff;
  text-align: center;
  opacity: 1;
  transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-lvl--out {
  opacity: 0;
  pointer-events: none;
}

.vel-lvl__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.vel-lvl__aurora {
  position: absolute;
  border-radius: 999px;
  filter: blur(48px);
  opacity: 0.55;
}

.vel-lvl__aurora--a {
  inset-block-start: 12%;
  inset-inline-start: 18%;
  width: min(28rem, 70vw);
  height: min(18rem, 42vw);
  background: color-mix(in oklab, var(--color-accent) 55%, transparent);
  animation: vel-lvl-aurora 4.2s ease-in-out infinite;
}

.vel-lvl__aurora--b {
  inset-block-end: 8%;
  inset-inline-end: 12%;
  width: min(22rem, 55vw);
  height: min(16rem, 38vw);
  background: color-mix(in oklab, #5b8cff 40%, transparent);
  animation: vel-lvl-aurora 5.1s ease-in-out infinite reverse;
}

.vel-lvl__grid {
  position: absolute;
  inset: 0;
  opacity: 0.14;
  background-image:
    linear-gradient(color-mix(in oklab, #fff 22%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklab, #fff 22%, transparent) 1px, transparent 1px);
  background-size: 2.25rem 2.25rem;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 48%, #000 20%, transparent 75%);
}

.vel-lvl__scan {
  position: absolute;
  inset-inline: 0;
  block-size: 28%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in oklab, #fff 10%, transparent) 50%,
    transparent 100%
  );
  animation: vel-lvl-scan 2.6s linear infinite;
  opacity: 0.45;
}

.vel-lvl__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-inline-size: 22rem;
}

.vel-lvl__orbit-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 9.5rem;
  height: 9.5rem;
  margin-block-end: 0.35rem;
}

.vel-lvl__orbit {
  position: absolute;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, #fff 22%, transparent);
}

.vel-lvl__orbit--outer {
  inset: 0;
  animation: vel-lvl-spin 9s linear infinite;
  border-style: dashed;
  border-color: color-mix(in oklab, #fff 28%, transparent);
}

.vel-lvl__orbit--mid {
  inset: 0.85rem;
  animation: vel-lvl-spin 6.5s linear infinite reverse;
  border-color: color-mix(in oklab, var(--color-accent) 55%, #fff 20%);
  opacity: 0.85;
}

.vel-lvl__orbit--inner {
  inset: 1.65rem;
  border-color: color-mix(in oklab, #fff 18%, transparent);
  animation: vel-lvl-pulse-ring 2.2s ease-in-out infinite;
}

.vel-lvl__spark {
  position: absolute;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 12px 3px color-mix(in oklab, var(--color-accent) 70%, transparent);
}

.vel-lvl__spark--1 {
  top: 0.15rem;
  left: 50%;
  margin-left: -0.21rem;
  animation: vel-lvl-spin 9s linear infinite;
  transform-origin: 50% 4.6rem;
}

.vel-lvl__spark--2 {
  bottom: 1rem;
  right: 0.55rem;
  animation: vel-lvl-spin 6.5s linear infinite reverse;
  transform-origin: -2.8rem -2.2rem;
  background: color-mix(in oklab, #9ec0ff 80%, #fff);
}

.vel-lvl__spark--3 {
  bottom: 1.2rem;
  left: 0.7rem;
  width: 0.32rem;
  height: 0.32rem;
  animation: vel-lvl-spin 11s linear infinite;
  transform-origin: 3.5rem -2.4rem;
  opacity: 0.85;
}

.vel-lvl__mark {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 5.75rem;
  height: 5.75rem;
  border-radius: var(--radius-round);
  background:
    radial-gradient(
      circle at 35% 30%,
      color-mix(in oklab, #fff 28%, transparent),
      color-mix(in oklab, var(--color-accent) 35%, transparent) 55%,
      color-mix(in oklab, #0a162c 40%, transparent)
    );
  border: 1px solid color-mix(in oklab, #fff 32%, transparent);
  box-shadow:
    0 0.9rem 2.4rem color-mix(in oklab, #000 35%, transparent),
    0 0 0 6px color-mix(in oklab, var(--color-accent) 18%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 35%, transparent);
  animation: vel-lvl-pop 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-lvl__mark-ring {
  position: absolute;
  inset: -0.35rem;
  border-radius: inherit;
  border: 1.5px solid color-mix(in oklab, #fff 35%, transparent);
  opacity: 0.55;
  animation: vel-lvl-pulse-ring 1.8s ease-out infinite;
}

.vel-lvl__logo {
  filter: brightness(0) invert(1);
  transform: scale(1.4);
}

.vel-lvl__step {
  padding: 0.28rem 0.7rem;
  border: 1px solid color-mix(in oklab, #fff 28%, transparent);
  border-radius: var(--radius-round);
  background: color-mix(in oklab, #fff 10%, transparent);
  color: color-mix(in oklab, #fff 92%, transparent);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.vel-lvl__brand {
  margin: 0.15rem 0 0;
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.1;
  text-shadow: 0 0.35rem 1.2rem color-mix(in oklab, #000 35%, transparent);
}

.vel-lvl__title {
  margin: 0;
  max-width: 18rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: color-mix(in oklab, #fff 94%, transparent);
}

.vel-lvl__text {
  max-width: 17.5rem;
  color: color-mix(in oklab, #fff 72%, transparent);
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.45;
}

.vel-lvl__track {
  position: relative;
  width: min(14rem, 70vw);
  height: 0.28rem;
  margin-block-start: 0.55rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in oklab, #fff 14%, transparent);
}

.vel-lvl__track-fill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 42%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7eb0ff, #fff 55%, #9ec5ff);
  animation: vel-lvl-bar 1.35s ease-in-out infinite;
}

.vel-lvl__track-glow {
  position: absolute;
  inset-block: -0.35rem;
  inset-inline-start: 0;
  width: 42%;
  background: color-mix(in oklab, #9ec5ff 55%, transparent);
  filter: blur(8px);
  opacity: 0.65;
  animation: vel-lvl-bar 1.35s ease-in-out infinite;
}

.vel-lvl__dots {
  display: inline-flex;
  gap: 0.35rem;
  margin-block-start: 0.15rem;
}

.vel-lvl__dots span {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: #fff;
  opacity: 0.4;
  animation: vel-lvl-dot 1.1s ease-in-out infinite;
}

.vel-lvl__dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.vel-lvl__dots span:nth-child(3) {
  animation-delay: 0.3s;
}

.vel-lvl-enter-active,
.vel-lvl-leave-active {
  transition: opacity 0.32s ease;
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
    transform: scale(0.68);
    filter: blur(6px);
  }

  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}

@keyframes vel-lvl-pulse-ring {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }

  50% {
    opacity: 0.75;
    transform: scale(1.04);
  }
}

@keyframes vel-lvl-aurora {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.45;
  }

  50% {
    transform: translate(3%, -4%) scale(1.08);
    opacity: 0.7;
  }
}

@keyframes vel-lvl-scan {
  0% {
    transform: translateY(-120%);
  }

  100% {
    transform: translateY(320%);
  }
}

@keyframes vel-lvl-bar {
  0% {
    transform: translateX(-30%);
  }

  50% {
    transform: translateX(120%);
  }

  100% {
    transform: translateX(220%);
  }
}

@keyframes vel-lvl-dot {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-0.15rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-lvl__orbit,
  .vel-lvl__spark,
  .vel-lvl__mark,
  .vel-lvl__mark-ring,
  .vel-lvl__aurora,
  .vel-lvl__scan,
  .vel-lvl__track-fill,
  .vel-lvl__track-glow,
  .vel-lvl__dots span {
    animation: none;
  }

  .vel-lvl {
    transition-duration: 90ms;
  }

  .vel-lvl__track-fill,
  .vel-lvl__track-glow {
    width: 70%;
    transform: none;
  }
}
</style>
