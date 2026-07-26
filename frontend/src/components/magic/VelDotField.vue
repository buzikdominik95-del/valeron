<script setup lang="ts">
import { ref, watchEffect } from 'vue'

/**
 * Порт Magic UI Dot Pattern: разреженная точечная фактура фоном.
 *
 * ЧЕМ ОТЛИЧАЕТСЯ ОТ ОРИГИНАЛА И ПОЧЕМУ. В Magic UI это SVG, где на каждую
 * точку заводится отдельный <circle>, а их число считает JavaScript от
 * размеров контейнера через ResizeObserver. На ленте переписки высотой в
 * несколько экранов это тысячи узлов, которые пересчитываются на каждом
 * изменении размера — включая появление экранной клавиатуры на телефоне.
 *
 * Здесь та же картинка сделана одним radial-gradient, размноженным
 * background-size: узлов ноль, пересчитывать нечего, поведение при любом
 * размере одинаковое. Рисунок совпадает: точка радиусом cr в решётке
 * width × height со смещением cx / cy.
 *
 * Мигание точек (glow из оригинала) не переносил намеренно: на фоне
 * переписки движущийся фон отвлекает от текста, ради которого экран и открыт.
 *
 * Слой декоративный: клики не перехватывает, из дерева доступности убран.
 */
interface Props {
  /** Шаг решётки, px. */
  gap?: number
  /** Радиус точки, px. */
  radius?: number
  /** Прозрачность слоя целиком, 0…1. */
  opacity?: number
}

const props = withDefaults(defineProps<Props>(), {
  gap: 16,
  radius: 1,
  opacity: 0.5,
})

const root = ref<HTMLElement | null>(null)

/*
 * Числа уезжают переменными на корень — инлайн-стилей в шаблонах в проекте
 * нет. Тот же приём, что в VelRange и VelBorderBeam, и по той же причине там
 * не взят useCssVar: он рассчитан на чтение и затирает нашу запись.
 */
watchEffect(
  () => {
    const element = root.value
    if (element === null) return

    const gap = Number.isFinite(props.gap) && props.gap > 0 ? props.gap : 16
    const radius = Number.isFinite(props.radius) && props.radius > 0 ? props.radius : 1

    element.style.setProperty('--vel-dot-gap', `${gap}px`)
    element.style.setProperty('--vel-dot-radius', `${radius}px`)
    element.style.setProperty('--vel-dot-opacity', String(props.opacity))
  },
  { flush: 'post' },
)
</script>

<template>
  <span ref="root" class="vel-dots" aria-hidden="true"></span>
</template>

<style scoped>
.vel-dots {
  position: absolute;
  inset: 0;
  /*
    Одна точка в клетке решётки. Второй, полностью прозрачный упор нужен, чтобы
    градиент не растягивался: без него точка размывается по всей клетке.
  */
  background-image: radial-gradient(
    circle at center,
    currentColor 0,
    currentColor var(--vel-dot-radius, 1px),
    transparent var(--vel-dot-radius, 1px)
  );
  background-size: var(--vel-dot-gap, 16px) var(--vel-dot-gap, 16px);
  opacity: var(--vel-dot-opacity, 0.5);
  pointer-events: none;
}
</style>
