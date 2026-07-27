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
 * Анимация выпуска CPI (canvas) — порт cpi-certificate.html.
 * progress 0…1 → кадр 0…TOTAL; имя — подпись оператора на сцене.
 */
const props = withDefaults(
  defineProps<{
    /** 0…1 прогресс генерации из useCpiBuild */
    progress?: number
    /** ФИО на карточке оператора */
    holderName?: string
  }>(),
  {
    progress: 0,
    holderName: '',
  },
)

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const reduced = usePreferredReducedMotion()

let raf = 0

function paint(): void {
  const el = canvasRef.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  setCpiGenContext(ctx, props.holderName)
  const p = Math.min(1, Math.max(0, props.progress))
  /* reduced: сразу финальный кадр «одобрено» */
  const frame =
    reduced.value === 'reduce' ? CPI_GEN_TOTAL : Math.round(p * CPI_GEN_TOTAL)
  drawCpiGenFrame(frame)
}

function schedule(): void {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    paint()
  })
}

onMounted(() => {
  const el = canvasRef.value
  if (el) {
    el.width = CPI_GEN_W
    el.height = CPI_GEN_H
  }
  paint()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
})

watch(
  () => [props.progress, props.holderName, reduced.value] as const,
  () => schedule(),
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
