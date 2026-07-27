<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery, useEventListener } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { accountStepHref } from '@/features/account/account-anchors'
import type { AccountStep } from '@/stores/account.store'

/**
 * Подсказки новичку: карточка + анимированная стрелка к реальной цели.
 * Mobile: снизу над tabbar. Desktop (≥64rem): рядом с пунктом меню / блоком.
 */
const { t } = useI18n()
const { steps, allDone } = useAccount()
const account = useAccountStore()
const { tab, select: selectTab } = useCabinetTab()
const isDesktop = useMediaQuery('(min-width: 64rem)')

const visible = ref(false)
const cardEl = ref<HTMLElement | null>(null)

/** Позиция карточки (fixed). */
const cardStyle = ref<Record<string, string>>({})
/** SVG path стрелки (viewport coords). */
const arrowPath = ref('')
/** Точка «хвоста» стрелки у карточки и «наконечник» у цели. */
const arrowHead = ref({ x: 0, y: 0, angle: 0 })
/** Подсветка цели. */
const spot = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const hasTarget = ref(false)

onMounted(() => {
  if (allDone.value || account.coachSeen) return
  visible.value = true
  void nextTick(() => updateLayout())
})

const nextAction = computed(() => {
  const pending = steps.value.find((s) => s.status !== 'done' && s.needsAction)
  if (!pending) return null
  return pending.id as AccountStep
})

const tip = computed(() => {
  const id = nextAction.value
  if (!id) return t('account.coach.done')
  return t(`account.coach.tips.${id}`)
})

const tipTitle = computed(() => t('account.coach.title'))

/** Куда смотрит стрелка: DOM-цель по шагу. */
function resolveTarget(): HTMLElement | null {
  const id = nextAction.value
  if (!id) return null

  if (id === 'documents') {
    return (
      document.querySelector<HTMLElement>('[data-coach-tab="documents"]') ??
      document.getElementById('vel-account-documents')
    )
  }
  if (id === 'signature') {
    const panel = document.getElementById('vel-account-signature')
    if (panel && panel.getClientRects().length > 0) return panel
    return (
      document.querySelector<HTMLElement>('[data-coach-tab="documents"]') ??
      document.getElementById('vel-account-documents')
    )
  }
  if (id === 'account') {
    return (
      document.querySelector<HTMLElement>('[data-coach-tab="profile"]') ??
      document.querySelector<HTMLElement>('[data-coach-tab="home"]')
    )
  }
  return document.querySelector<HTMLElement>('[data-coach-tab="home"]')
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function updateLayout(): void {
  if (!visible.value || allDone.value) return

  const target = resolveTarget()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pad = 12
  const cardW = Math.min(isDesktop.value ? 320 : vw - pad * 2, 360)
  const cardH = cardEl.value?.offsetHeight || 160

  if (!target) {
    hasTarget.value = false
    spot.value = null
    arrowPath.value = ''
    /* fallback: низ по центру (mobile-friendly) */
    cardStyle.value = {
      position: 'fixed',
      left: `${(vw - cardW) / 2}px`,
      top: 'auto',
      bottom: isDesktop.value
        ? '2rem'
        : `calc(var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.5rem) * 2 + 0.75rem)`,
      width: `${cardW}px`,
      right: 'auto',
    }
    return
  }

  hasTarget.value = true
  const tr = target.getBoundingClientRect()
  spot.value = {
    top: tr.top - 6,
    left: tr.left - 6,
    width: tr.width + 12,
    height: tr.height + 12,
  }

  let left: number
  let top: number
  let fromX: number
  let fromY: number
  let toX: number
  let toY: number

  if (isDesktop.value) {
    /*
     * Desktop: карточка справа от сайдбара / цели.
     * Стрелка идёт от левого края карточки к центру цели.
     */
    const preferRight = tr.right + 16 + cardW + pad < vw
    if (preferRight) {
      left = tr.right + 20
      top = clamp(tr.top + tr.height / 2 - cardH / 2, pad, vh - cardH - pad)
      fromX = left
      fromY = top + cardH / 2
      toX = tr.right + 4
      toY = tr.top + tr.height / 2
    } else {
      /* карточка слева от цели */
      left = clamp(tr.left - cardW - 20, pad, vw - cardW - pad)
      top = clamp(tr.top + tr.height / 2 - cardH / 2, pad, vh - cardH - pad)
      fromX = left + cardW
      fromY = top + cardH / 2
      toX = tr.left - 4
      toY = tr.top + tr.height / 2
    }
  } else {
    /*
     * Mobile: карточка над нижней панелью, стрелка вниз к tabbar / цели.
     */
    left = (vw - cardW) / 2
    const aboveTarget = tr.top > cardH + 80
    if (aboveTarget && tr.bottom < vh - 100) {
      top = clamp(tr.top - cardH - 28, pad, vh - cardH - pad)
      fromX = left + cardW / 2
      fromY = top + cardH
      toX = tr.left + tr.width / 2
      toY = tr.top - 4
    } else {
      /* default: над tabbar, стрелка к нижней навигации */
      const bottomGap =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vel-tabbar-h')) ||
        64
      top = vh - bottomGap - 24 - cardH - 12
      top = clamp(top, pad, vh - cardH - pad)
      fromX = left + cardW / 2
      fromY = top + cardH
      toX = tr.left + tr.width / 2
      toY = tr.top + 4
    }
  }

  cardStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    bottom: 'auto',
    width: `${cardW}px`,
    right: 'auto',
  }

  /* Кривая Безье от карточки к цели */
  const dx = toX - fromX
  const dy = toY - fromY
  const midX = fromX + dx * 0.45
  const midY = fromY + dy * 0.45
  const c1x = fromX + dx * 0.2
  const c1y = fromY + (isDesktop.value ? dy * 0.05 : 20)
  const c2x = fromX + dx * 0.75
  const c2y = toY - (isDesktop.value ? dy * 0.1 : 24)

  arrowPath.value = `M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`
  arrowHead.value = {
    x: toX,
    y: toY,
    angle: (Math.atan2(toY - midY, toX - midX) * 180) / Math.PI,
  }
}

function go(): void {
  const id = nextAction.value
  account.markCoachSeen()
  visible.value = false
  if (id === 'documents') {
    selectTab('documents')
    return
  }
  if (id === 'signature') {
    selectTab('documents')
    const href = accountStepHref('signature')
    if (href?.startsWith('#')) {
      requestAnimationFrame(() =>
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
    }
    return
  }
  if (id === 'approval' || id === 'simulation' || id === 'account') {
    selectTab(id === 'account' ? 'profile' : 'home')
  }
}

function dismiss(): void {
  account.markCoachSeen()
  visible.value = false
}

watch([visible, nextAction, isDesktop, tab], () => {
  if (!visible.value) return
  void nextTick(() => updateLayout())
})

useEventListener(window, 'resize', () => updateLayout(), { passive: true })
useEventListener(window, 'scroll', () => updateLayout(), { passive: true, capture: true })

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(() => updateLayout())
  ro.observe(document.documentElement)
})
onUnmounted(() => {
  ro?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-coach">
      <div
        v-if="visible && !allDone"
        class="vel-coach"
        role="dialog"
        aria-modal="false"
        :aria-label="tipTitle"
      >
        <!-- Затемнение лёгкое + spotlight на цель -->
        <div class="vel-coach__scrim" aria-hidden="true" @click="dismiss" />
        <div
          v-if="spot"
          class="vel-coach__spot"
          aria-hidden="true"
          :style="{
            top: `${spot.top}px`,
            left: `${spot.left}px`,
            width: `${spot.width}px`,
            height: `${spot.height}px`,
          }"
        />

        <!-- Анимированная стрелка (SVG поверх всего) -->
        <svg
          v-if="hasTarget && arrowPath"
          class="vel-coach__svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="vel-coach-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.35" />
              <stop offset="100%" stop-color="var(--color-accent-deep)" stop-opacity="1" />
            </linearGradient>
            <marker
              id="vel-coach-head"
              markerWidth="12"
              markerHeight="12"
              refX="9"
              refY="6"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L12,6 L0,12 Z" fill="var(--color-accent-deep)" />
            </marker>
          </defs>
          <path
            class="vel-coach__path-glow"
            :d="arrowPath"
            fill="none"
            stroke="var(--color-accent)"
            stroke-width="6"
            stroke-linecap="round"
            opacity="0.22"
          />
          <path
            class="vel-coach__path"
            :d="arrowPath"
            fill="none"
            stroke="url(#vel-coach-grad)"
            stroke-width="2.75"
            stroke-linecap="round"
            stroke-dasharray="8 10"
            marker-end="url(#vel-coach-head)"
          />
          <!-- Пульсирующая точка у цели -->
          <g
            class="vel-coach__pulse-g"
            :style="{
              transform: `translate(${arrowHead.x}px, ${arrowHead.y}px)`,
            }"
          >
            <circle class="vel-coach__pulse" cx="0" cy="0" r="8" fill="var(--color-accent)" />
            <circle class="vel-coach__dot" cx="0" cy="0" r="3.5" fill="var(--color-accent-deep)" />
          </g>
        </svg>

        <!-- Карточка подсказки -->
        <div ref="cardEl" class="vel-coach__card" :style="cardStyle">
          <div class="vel-coach__card-arrow" aria-hidden="true">
            <svg class="vel-coach__mini-arrow" viewBox="0 0 24 32" fill="none">
              <path
                class="vel-coach__mini-shaft"
                d="M12 2 v22"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
              />
              <path
                class="vel-coach__mini-head"
                d="M5 18 L12 28 L19 18"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <p class="vel-coach__eyebrow">{{ tipTitle }}</p>
          <p class="vel-coach__text">{{ tip }}</p>
          <div class="vel-coach__actions">
            <button type="button" class="vel-coach__cta" @click="go">
              {{ t('account.coach.go') }}
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" class="vel-coach__skip" @click="dismiss">
              {{ t('account.coach.skip') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-coach {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
}

.vel-coach__scrim {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: color-mix(in oklab, var(--color-accent-deep) 18%, transparent);
}

.vel-coach__spot {
  position: fixed;
  z-index: 1;
  pointer-events: none;
  border: 2px solid var(--color-accent);
  border-radius: calc(var(--radius-control) + 4px);
  box-shadow:
    0 0 0 9999px color-mix(in oklab, var(--color-accent-deep) 28%, transparent),
    0 0 0 4px color-mix(in oklab, var(--color-accent) 35%, transparent),
    0 0.5rem 1.5rem color-mix(in oklab, var(--color-accent) 25%, transparent);
  animation: vel-coach-spot 1.8s ease-in-out infinite;
}

.vel-coach__svg {
  position: fixed;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.vel-coach__path {
  animation: vel-coach-dash 1.1s linear infinite;
}

.vel-coach__path-glow {
  filter: blur(1.5px);
}

.vel-coach__pulse-g {
  transform-box: fill-box;
  transform-origin: center;
}

.vel-coach__pulse {
  opacity: 0.4;
  transform-origin: center;
  animation: vel-coach-pulse 1.4s ease-out infinite;
}

.vel-coach__dot {
  animation: vel-coach-dot 1.4s ease-in-out infinite;
}

.vel-coach__card {
  z-index: 3;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.15rem 1.05rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 42%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-accent) 12%, transparent),
    0 1.1rem 2.6rem color-mix(in oklab, var(--color-fg) 20%, transparent);
  animation: vel-coach-bob 2.6s ease-in-out infinite;
}

.vel-coach__card-arrow {
  display: flex;
  align-self: center;
  color: var(--color-accent-deep);
  margin-block-end: 0.1rem;
}

.vel-coach__mini-arrow {
  width: 1.35rem;
  height: 1.75rem;
  animation: vel-coach-point 1.05s ease-in-out infinite;
}

.vel-coach__eyebrow {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.vel-coach__text {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
}

.vel-coach__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.vel-coach__cta {
  display: inline-flex;
  min-height: 2.75rem;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 1rem;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.vel-coach__cta:hover {
  background: var(--color-accent-dim);
}

.vel-coach__skip {
  min-height: 2.75rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.vel-coach__skip:hover {
  border-color: var(--color-line-strong);
  color: var(--color-fg);
}

/* Desktop: мини-стрелка на карточке смотрит вбок — path SVG главный */
@media (min-width: 64rem) {
  .vel-coach__card-arrow {
    display: none;
  }

  .vel-coach__scrim {
    background: color-mix(in oklab, var(--color-accent-deep) 12%, transparent);
  }
}

@keyframes vel-coach-bob {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

@keyframes vel-coach-point {
  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }

  50% {
    transform: translateY(6px);
    opacity: 0.55;
  }
}

@keyframes vel-coach-dash {
  to {
    stroke-dashoffset: -36;
  }
}

@keyframes vel-coach-pulse {
  0% {
    transform: scale(0.7);
    opacity: 0.5;
  }

  70% {
    transform: scale(2.2);
    opacity: 0;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

@keyframes vel-coach-dot {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

@keyframes vel-coach-spot {
  0%,
  100% {
    box-shadow:
      0 0 0 9999px color-mix(in oklab, var(--color-accent-deep) 28%, transparent),
      0 0 0 4px color-mix(in oklab, var(--color-accent) 30%, transparent),
      0 0.5rem 1.5rem color-mix(in oklab, var(--color-accent) 22%, transparent);
  }

  50% {
    box-shadow:
      0 0 0 9999px color-mix(in oklab, var(--color-accent-deep) 28%, transparent),
      0 0 0 7px color-mix(in oklab, var(--color-accent) 48%, transparent),
      0 0.65rem 1.75rem color-mix(in oklab, var(--color-accent) 32%, transparent);
  }
}

.vel-coach-enter-active,
.vel-coach-leave-active {
  transition: opacity 280ms ease;
}

.vel-coach-enter-active .vel-coach__card,
.vel-coach-leave-active .vel-coach__card {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.vel-coach-enter-from,
.vel-coach-leave-to {
  opacity: 0;
}

.vel-coach-enter-from .vel-coach__card,
.vel-coach-leave-to .vel-coach__card {
  opacity: 0;
  transform: translateY(14px);
}

@media (prefers-reduced-motion: reduce) {
  .vel-coach__card,
  .vel-coach__mini-arrow,
  .vel-coach__path,
  .vel-coach__pulse,
  .vel-coach__dot,
  .vel-coach__spot {
    animation: none;
  }
}
</style>
