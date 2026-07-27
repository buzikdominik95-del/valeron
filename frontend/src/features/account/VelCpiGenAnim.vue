<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import {
  CPI_GEN_H,
  CPI_GEN_TOTAL,
  CPI_GEN_W,
  drawCpiGenFrame,
  setCpiGenContext,
} from '@/features/account/cpi-gen-scene'

/**
 * Canvas-анимация выпуска CPI.
 * Один проход 0→100%, кадр = progress × TOTAL (проценты = этап сцены).
 * gender: male/female → персонаж.
 */
const props = withDefaults(
  defineProps<{
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

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const reduced = usePreferredReducedMotion()

let raf = 0
/** Сглаживание кадра между тиками progress (250ms). */
let displayFrame = 0
let running = false

function targetFrame(): number {
  if (reduced.value === 'reduce') return CPI_GEN_TOTAL
  const p = Math.min(1, Math.max(0, props.progress))
  return Math.round(p * CPI_GEN_TOTAL)
}

function paint(frame: number): void {
  const el = canvasRef.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  setCpiGenContext(ctx, props.holderName, props.gender)
  drawCpiGenFrame(frame)
}

function tick(): void {
  if (!running) return
  const target = targetFrame()
  /* Плавно догоняем целевой кадр (progress), без «свободного» loop. */
  const delta = target - displayFrame
  if (Math.abs(delta) < 0.4) {
    displayFrame = target
  } else {
    displayFrame += delta * 0.22
  }
  paint(Math.round(displayFrame))
  raf = requestAnimationFrame(tick)
}

function start(): void {
  if (running) return
  running = true
  displayFrame = targetFrame()
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tick)
}

function stop(): void {
  running = false
  cancelAnimationFrame(raf)
  raf = 0
}

onMounted(() => {
  const el = canvasRef.value
  if (el) {
    el.width = CPI_GEN_W
    el.height = CPI_GEN_H
  }
  start()
})

onUnmounted(() => {
  stop()
})

watch(
  () => [props.progress, props.holderName, props.gender, reduced.value] as const,
  () => {
    if (!running) start()
  },
)
</script>

<template>
  <div class="vel-cpi-anim" data-testid="cpi-gen-anim" role="img" aria-hidden="true">
    <canvas ref="canvas" class="vel-cpi-anim__cv" />
  </div>
</template>

<style scoped>
.vel-cpi-anim {
  overflow: hidden;
  width: 100%;
  border-radius: var(--radius-control);
  border: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  background: #eef2fb;
  box-shadow: 0 0.35rem 1rem color-mix(in oklab, var(--color-accent-deep) 10%, transparent);
}

.vel-cpi-anim__cv {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: middle;
  aspect-ratio: 16 / 9;
}
</style>
