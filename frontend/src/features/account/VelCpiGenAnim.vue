<script setup lang="ts">
/**
 * Canvas-анимация выпуска CPI — тот же принцип, что VelTransferScene (L2):
 * wall-clock 30 fps + loop, а не «кадр = progress» (тот лагал: progress
 * обновляется раз в 250 ms → за 30 с почти не двигается).
 *
 * Полоса % / remain — снаружи (VelMeter + loadProgress).
 * Сцена крутится плавно; при progress ≥ 1 — финальный кадр.
 */
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import {
  usePreferredReducedMotion,
  useRafFn,
  useIntersectionObserver,
  useDocumentVisibility,
} from '@vueuse/core'
import {
  CPI_GEN_H,
  CPI_GEN_TOTAL,
  CPI_GEN_W,
  drawCpiGenFrame,
  setCpiGenContext,
} from '@/features/account/cpi-gen-scene'

const props = withDefaults(
  defineProps<{
    /** 0…1 — только для финала; скорость сцены от времени, как L2. */
    progress?: number
    holderName?: string
    gender?: string
  }>(),
  {
    progress: 0,
    holderName: '',
    gender: 'female',
  },
)

const FPS = 30
/** Как L2: TOTAL + hold, потом loop. ~1.3 с пауза на финальном кадре. */
const LOOP_FRAMES = CPI_GEN_TOTAL + 40
const STATIC_FRAME = CPI_GEN_TOTAL

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const rootRef = useTemplateRef<HTMLElement>('root')
const reduced = usePreferredReducedMotion()
const visibility = useDocumentVisibility()

let elapsed = 0
let lastFrame = -1
let onScreen = true

function frameAt(sec: number): number {
  const f = (sec * FPS) % LOOP_FRAMES
  return Math.min(f, CPI_GEN_TOTAL)
}

function paint(frame: number): void {
  const el = canvasRef.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  setCpiGenContext(ctx, props.holderName, props.gender)
  drawCpiGenFrame(frame)
}

function paintStill(): void {
  lastFrame = STATIC_FRAME
  paint(STATIC_FRAME)
}

const raf = useRafFn(
  ({ delta }) => {
    const p = Math.min(1, Math.max(0, props.progress))
    /* Генерация закончена — держим финал, без loop. */
    if (p >= 0.995) {
      if (lastFrame !== STATIC_FRAME) paintStill()
      return
    }

    elapsed += delta / 1000
    const frame = frameAt(elapsed)
    /* 120 Hz экран: рисуем только когда сменился 30-fps кадр (как L2). */
    if (frame === lastFrame) return
    lastFrame = frame
    paint(frame)
  },
  { immediate: false },
)

useIntersectionObserver(rootRef, (entries) => {
  const entry = entries[0]
  if (!entry) return
  onScreen = entry.isIntersecting
  syncRun()
})

function syncRun(): void {
  const ready = (canvasRef.value?.width ?? 0) > 0
  const shouldRun =
    ready &&
    reduced.value !== 'reduce' &&
    onScreen &&
    visibility.value === 'visible' &&
    props.progress < 0.995

  if (shouldRun) raf.resume()
  else {
    raf.pause()
    if (ready && (reduced.value === 'reduce' || props.progress >= 0.995)) {
      paintStill()
    }
  }
}

onMounted(() => {
  const el = canvasRef.value
  if (el) {
    el.width = CPI_GEN_W
    el.height = CPI_GEN_H
  }
  elapsed = 0
  lastFrame = -1
  if (reduced.value === 'reduce') paintStill()
  else {
    paint(0)
    syncRun()
  }
})

onUnmounted(() => {
  raf.pause()
})

watch(
  () => [props.progress, props.holderName, props.gender, reduced.value, visibility.value] as const,
  () => {
    /* Смена имени/пола — перерисовать текущий кадр. */
    paint(lastFrame >= 0 ? lastFrame : 0)
    syncRun()
  },
)
</script>

<template>
  <div ref="root" class="vel-cpi-anim" data-testid="cpi-gen-anim" role="img" aria-hidden="true">
    <canvas ref="canvas" class="vel-cpi-anim__cv" />
  </div>
</template>

<style scoped>
.vel-cpi-anim {
  overflow: hidden;
  width: 100%;
  max-block-size: min(42vw, 16.5rem);
  border-radius: var(--radius-control);
  border: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  background: #eef2fb;
  box-shadow: 0 0.35rem 1rem color-mix(in oklab, var(--color-accent-deep) 10%, transparent);
}

.vel-cpi-anim__cv {
  display: block;
  width: 100%;
  height: auto;
  max-block-size: min(42vw, 16.5rem);
  vertical-align: middle;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
</style>
