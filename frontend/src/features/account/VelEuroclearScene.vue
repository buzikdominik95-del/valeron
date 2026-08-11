<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import {
  EU_SCENE_H,
  EU_SCENE_TOTAL,
  EU_SCENE_W,
  drawEuroclearSceneFrame,
  setEuroclearSceneContext,
} from '@/features/account/scene/euroclear-scene'

/**
 * L5: сцена «Verifica Euroclear» — инспектор с лупой проверяет кабинет клиента.
 * Canvas-порт animation.html + DOM-прогресс-бар (3 минуты, из пропов).
 * Данные клиента (имя, IBAN, сумма) приходят из VelTransferAnim.
 */
const props = withDefaults(
  defineProps<{
    /** Прогресс проверки, 0…1 (из useCommission.animationProgress). */
    progress: number
    /** Остаток времени, мс (из useCommission.animationRemainingMs). */
    remainingMs: number
    /** Полное имя клиента. */
    name: string
    /** IBAN клиента (маскированный или полный). */
    iban: string
    /** Выбранная сумма вывода, €. */
    amountEuros: number
  }>(),
  { progress: 0, remainingMs: 0, name: '', iban: '', amountEuros: 0 },
)

const clientName = computed(() => {
  const n = props.name.trim()
  return n ? n : 'Cliente Velora'
})

const initials = computed(() => {
  const parts = clientName.value.split(/\s+/).filter(Boolean).slice(0, 2)
  const joined = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return joined ? joined : 'CV'
})

const pct = computed(() => Math.round(Math.min(Math.max(props.progress, 0), 1) * 100))

const showBottomProgress = computed(() => props.progress < 1)

const italyTimeLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `Oggi · ${formatter.format(new Date())}`
})

const remainLabel = computed(() => {
  const totalSeconds = Math.ceil(Math.max(0, props.remainingMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const FPS = 30
const LOOP = EU_SCENE_TOTAL + 40

let raf = 0
let elapsed = 0
let prev = 0
let last = -1

function sceneData() {
  return {
    name: clientName.value,
    initials: initials.value,
    iban: props.iban,
    amountEuros: props.amountEuros,
    lastWithdrawalLabel: italyTimeLabel.value,
    attemptsLabel: '5 operazioni',
  }
}

function frameAt(sec: number): number {
  const f = (sec * FPS) % LOOP
  return Math.min(f, EU_SCENE_TOTAL)
}

function tick(now: number): void {
  const delta = Math.min(0.05, (now - prev) / 1000)
  prev = now
  elapsed += delta
  const frame = Math.round(frameAt(elapsed))
  if (frame !== last) {
    last = frame
    drawEuroclearSceneFrame(frame, sceneData())
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  const c = el.getContext('2d')
  if (!c) return
  setEuroclearSceneContext(c)
  prev = performance.now()
  drawEuroclearSceneFrame(12, sceneData())
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  setEuroclearSceneContext(null)
})
</script>

<template>
  <div class="vel-eu-scene">
    <div class="vel-eu-scene__stage">
      <canvas
        ref="canvas"
        :width="EU_SCENE_W"
        :height="EU_SCENE_H"
        class="vel-eu-scene__canvas"
        role="img"
        aria-label="Verifica Euroclear in corso"
      />
    </div>
    <div
      v-if="showBottomProgress"
      class="vel-eu-scene__bar"
      role="progressbar"
      :aria-valuenow="pct"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Avanzamento verifica Euroclear"
    >
      <div class="vel-eu-scene__bar-head">
        <span class="vel-eu-scene__bar-label">Verifica Euroclear in corso…</span>
        <span class="vel-eu-scene__bar-meta">{{ remainLabel }}</span>
      </div>
      <div class="vel-eu-scene__track">
        <div class="vel-eu-scene__fill" :style="{ inlineSize: pct + '%' }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vel-eu-scene {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 16:9 как у эталона (1920×1080); тот же приём, что в .vel-scene. */
.vel-eu-scene__stage {
  position: relative;
  inline-size: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-panel);
  border: 1px solid var(--color-line);
  background-color: #eef5fb;
}

.vel-eu-scene__canvas {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.vel-eu-scene__bar {
  inline-size: 100%;
}

.vel-eu-scene__bar-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-block-end: 0.375rem;
}

.vel-eu-scene__bar-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-fg);
}

.vel-eu-scene__bar-meta {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-muted);
}

.vel-eu-scene__track {
  block-size: 0.5rem;
  border-radius: 999px;
  background-color: var(--color-line);
  overflow: hidden;
}

.vel-eu-scene__fill {
  block-size: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #00a3a1, #0b6bcb);
  transition: inline-size 0.9s linear;
}

@media (max-width: 40rem) {
  .vel-eu-scene__stage {
    --vel-eu-max-h: min(18rem, 52vw);
    inline-size: 100%;
  }
}
</style>
