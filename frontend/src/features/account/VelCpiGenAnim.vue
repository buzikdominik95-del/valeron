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
 * Canvas-анимация выпуска CPI (порт cpi-certificate.html).
 * Крутится в цикле (несколько прогонов), пока progress < 1;
 * у финиша — финальный кадр. Пол/gender → персонаж m/f.
 */
const props = withDefaults(
  defineProps<{
    /** 0…1 прогресс генерации */
    progress?: number
    /** ФИО на сцене */
    holderName?: string
    /** male | female — стиль персонажа */
    gender?: string
  }>(),
  {
    progress: 0,
    holderName: '',
    gender: 'female',
  },
)

/** Кадров в секунду (как в HTML). Один цикл ≈ 11 с → несколько кругов за генерацию. */
const FPS = 30

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const reduced = usePreferredReducedMotion()

let raf = 0
let startedAt = 0
let running = false

function paintFrame(frame: number): void {
  const el = canvasRef.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  setCpiGenContext(ctx, props.holderName, props.gender)
  drawCpiGenFrame(frame)
}

function tick(now: number): void {
  if (!running) return
  if (startedAt <= 0) startedAt = now

  const p = Math.min(1, Math.max(0, props.progress))

  if (reduced.value === 'reduce' || p >= 0.995) {
    paintFrame(CPI_GEN_TOTAL)
    /* Держим финал, но продолжаем RAF пока компонент жив и progress < 1 не закончен */
    if (p < 0.995) {
      raf = requestAnimationFrame(tick)
    }
    return
  }

  /* Несколько циклов: время крутит сцену, progress только «разблокирует» финал. */
  const elapsedSec = (now - startedAt) / 1000
  const frameFloat = (elapsedSec * FPS) % CPI_GEN_TOTAL
  /* На последних ~5% прогресса плавно тянем к финалу */
  if (p >= 0.92) {
    const t = (p - 0.92) / 0.08
    const loopFrame = frameFloat
    const frame = Math.round(loopFrame + (CPI_GEN_TOTAL - loopFrame) * t)
    paintFrame(Math.min(CPI_GEN_TOTAL, frame))
  } else {
    paintFrame(Math.floor(frameFloat))
  }

  raf = requestAnimationFrame(tick)
}

function startLoop(): void {
  if (running) return
  running = true
  startedAt = 0
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tick)
}

function stopLoop(): void {
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
  startLoop()
})

onUnmounted(() => {
  stopLoop()
})

watch(
  () => [props.progress, props.holderName, props.gender, reduced.value] as const,
  () => {
    if (!running) startLoop()
    /* void — tick already reads props */
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
