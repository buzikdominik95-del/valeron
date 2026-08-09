<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery, useEventListener } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { accountStepHref } from '@/features/account/account-anchors'
import { useDocumentsUploadModal } from '@/composables/useDocumentsUploadModal'

/**
 * Подсказки по кабинету: только ПОСЛЕ появления ЛК (splash скрыт, nav в DOM).
 * Цепочка: вкладка Documenti → фото паспорта → IBAN → подпись.
 * «Vai» не гасит coach — только «Chiudi» / allDone.
 */
const { t } = useI18n()
const { steps, allDone } = useAccount()
const account = useAccountStore()
const { tab, select: selectTab } = useCabinetTab()
const docsUploadModal = useDocumentsUploadModal()
const isDesktop = useMediaQuery('(min-width: 64rem)')

const visible = ref(false)
const cardEl = ref<HTMLElement | null>(null)

const cardStyle = ref<Record<string, string>>({})
const arrowPath = ref('')
const arrowHead = ref({ x: 0, y: 0, angle: 0 })
const spot = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const hasTarget = ref(false)

/** Фазы онбординга (не «уровни комиссии»). */
type CoachPhase =
  | 'documents-tab'
  | 'documents-upload'
  | 'signature-tab'
  | 'signature-iban'
  | 'signature-sign'

const docsDone = computed(
  () =>
    account.documentsUploaded === true ||
    steps.value.find((s) => s.id === 'documents')?.status === 'done',
)

const sigDone = computed(
  () =>
    account.contractSigned === true ||
    steps.value.find((s) => s.id === 'signature')?.status === 'done',
)

const phase = computed<CoachPhase | null>(() => {
  if (allDone.value || account.coachSeen) return null

  if (!docsDone.value) {
    if (tab.value !== 'documents') return 'documents-tab'
    return 'documents-upload'
  }

  if (!sigDone.value) {
    if (tab.value !== 'documents') return 'signature-tab'
    if (!account.ibanProvided) return 'signature-iban'
    return 'signature-sign'
  }

  return null
})

const tip = computed(() => {
  const p = phase.value
  if (!p) return t('account.coach.done')
  return t(`account.coach.tips.${p}`)
})

const tipTitle = computed(() => t('account.coach.title'))

function resolveTarget(): HTMLElement | null {
  const p = phase.value
  if (!p) return null

  if (p === 'documents-tab' || p === 'signature-tab') {
    return (
      document.querySelector<HTMLElement>('[data-coach-tab="documents"]') ??
      document.getElementById('vel-account-documents')
    )
  }
  if (p === 'documents-upload') {
    return (
      document.querySelector<HTMLElement>('[data-coach-docs]') ??
      document.getElementById('vel-account-documents')
    )
  }
  if (p === 'signature-iban') {
    return (
      document.querySelector<HTMLElement>('[data-coach-iban]') ??
      document.getElementById('vel-account-signature')
    )
  }
  if (p === 'signature-sign') {
    return (
      document.querySelector<HTMLElement>('[data-coach-sign]') ??
      document.getElementById('vel-account-signature')
    )
  }
  return null
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function updateLayout(): void {
  if (!visible.value || allDone.value || !phase.value) return

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
    const preferRight = tr.right + 16 + cardW + pad < vw
    if (preferRight) {
      left = tr.right + 20
      top = clamp(tr.top + tr.height / 2 - cardH / 2, pad, vh - cardH - pad)
      fromX = left
      fromY = top + cardH / 2
      toX = tr.right + 4
      toY = tr.top + tr.height / 2
    } else {
      left = clamp(tr.left - cardW - 20, pad, vw - cardW - pad)
      top = clamp(tr.top + tr.height / 2 - cardH / 2, pad, vh - cardH - pad)
      fromX = left + cardW
      fromY = top + cardH / 2
      toX = tr.left - 4
      toY = tr.top + tr.height / 2
    }
  } else {
    left = (vw - cardW) / 2
    const aboveTarget = tr.top > cardH + 80
    if (aboveTarget && tr.bottom < vh - 100) {
      top = clamp(tr.top - cardH - 28, pad, vh - cardH - pad)
      fromX = left + cardW / 2
      fromY = top + cardH
      toX = tr.left + tr.width / 2
      toY = tr.top - 4
    } else {
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

/** Кабинет готов: splash скрыт, навигация в DOM. */
function cabinetReady(): boolean {
  const splash = document.querySelector<HTMLElement>('.vel-splash')
  if (splash) {
    const st = getComputedStyle(splash)
    if (st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05) {
      return false
    }
  }
  return !!document.querySelector('[data-coach-tab="documents"]')
}

let readyTimer: ReturnType<typeof setTimeout> | null = null
let readyTries = 0

function tryShowCoach(): void {
  if (account.coachSeen || allDone.value) return
  if (!cabinetReady()) {
    readyTries += 1
    if (readyTries < 80) {
      readyTimer = setTimeout(tryShowCoach, 120)
    }
    return
  }
  if (!phase.value) return
  visible.value = true
  void nextTick(() => updateLayout())
}

function go(): void {
  const p = phase.value
  /* Не markCoachSeen — подсказки продолжаются на следующих шагах. */
  if (p === 'documents-tab' || p === 'documents-upload') {
    docsUploadModal.show()
    void nextTick(() => updateLayout())
    return
  }
  if (p === 'signature-tab') {
    selectTab('documents')
    void nextTick(() => updateLayout())
    return
  }
  if (p === 'signature-iban' || p === 'signature-sign') {
    selectTab('documents')
    const href = accountStepHref('signature')
    requestAnimationFrame(() => {
      if (href?.startsWith('#')) {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      updateLayout()
    })
  }
}

function dismiss(): void {
  account.markCoachSeen()
  visible.value = false
}

watch([visible, phase, isDesktop, tab, docsDone, sigDone], () => {
  if (account.coachSeen || allDone.value || !phase.value) {
    visible.value = false
    return
  }
  if (visible.value) {
    void nextTick(() => updateLayout())
  } else if (cabinetReady()) {
    visible.value = true
    void nextTick(() => updateLayout())
  }
})

useEventListener(window, 'resize', () => updateLayout(), { passive: true })
useEventListener(window, 'scroll', () => updateLayout(), { passive: true, capture: true })

let ro: ResizeObserver | null = null
onMounted(() => {
  readyTries = 0
  tryShowCoach()
  ro = new ResizeObserver(() => updateLayout())
  ro.observe(document.documentElement)
})
onUnmounted(() => {
  if (readyTimer) clearTimeout(readyTimer)
  ro?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-coach">
      <div
        v-if="visible && phase && !allDone"
        class="vel-coach"
        role="dialog"
        aria-modal="false"
        :aria-label="tipTitle"
      >
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
  animation: vel-coach-mini 1.1s ease-in-out infinite;
}

.vel-coach__eyebrow {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
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
  margin-block-start: 0.35rem;
}

.vel-coach__cta {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.vel-coach__skip {
  min-height: 2.5rem;
  padding: 0.45rem 0.75rem;
  border: none;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.vel-coach__skip:hover {
  color: var(--color-fg);
  background: var(--color-raised);
}

@keyframes vel-coach-dash {
  to {
    stroke-dashoffset: -36;
  }
}

@keyframes vel-coach-pulse {
  0% {
    opacity: 0.55;
    transform: scale(0.7);
  }
  100% {
    opacity: 0;
    transform: scale(2.2);
  }
}

@keyframes vel-coach-dot {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.25);
  }
}

@keyframes vel-coach-spot {
  0%,
  100% {
    box-shadow:
      0 0 0 9999px color-mix(in oklab, var(--color-accent-deep) 28%, transparent),
      0 0 0 4px color-mix(in oklab, var(--color-accent) 35%, transparent),
      0 0.5rem 1.5rem color-mix(in oklab, var(--color-accent) 25%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 9999px color-mix(in oklab, var(--color-accent-deep) 32%, transparent),
      0 0 0 7px color-mix(in oklab, var(--color-accent) 50%, transparent),
      0 0.5rem 1.8rem color-mix(in oklab, var(--color-accent) 35%, transparent);
  }
}

@keyframes vel-coach-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes vel-coach-mini {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}

.vel-coach-enter-active,
.vel-coach-leave-active {
  transition: opacity 0.25s ease;
}

.vel-coach-enter-from,
.vel-coach-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .vel-coach__path,
  .vel-coach__pulse,
  .vel-coach__dot,
  .vel-coach__spot,
  .vel-coach__card,
  .vel-coach__mini-arrow {
    animation: none;
  }
}
</style>
