<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

/**
 * Проигрыватель Lottie-анимации.
 *
 * ЗАЧЕМ ОН ЕСТЬ. Заказчик просил две конкретные анимации с LottieFiles «один в
 * один». Повторить их вручную нельзя: файлы закрыты от автоматической загрузки
 * (страницы отдают 403), то есть увидеть их со стороны кода невозможно. Зато
 * можно приготовить место: положил .json в src/lottie — он и играет, ровно тот,
 * что нарисовал автор. Никакого «похоже на оригинал» здесь не остаётся.
 *
 * ПЛЕЕР ГРУЗИТСЯ ДИНАМИЧЕСКИ. lottie-web весит больше, чем весь остальной
 * интерфейс этого экрана, и нужен он только там, где файл действительно лежит.
 * Статический импорт утянул бы его в общий кусок и заставил бы ждать всех, в
 * том числе тех, у кого папка пустая и играет запасная svg-сцена.
 *
 * ДВИЖЕНИЕ И НАСТРОЙКА СИСТЕМЫ. При prefers-reduced-motion: reduce анимация
 * не запускается, но и не исчезает: плеер останавливается на кадре, где
 * рисунок уже собран. Пустое место вместо знака читалось бы как незагрузка,
 * а дёргающийся знак — ровно то, от чего человек защищается настройкой.
 *
 * ЗНАК ДЕКОРАТИВЕН: что происходит, сказано словами рядом (WCAG 1.4.1),
 * поэтому контейнер помечен aria-hidden.
 */
interface Props {
  /** Разобранный JSON анимации. Загрузку файла делает вызывающая сторона. */
  data: unknown
  /** Крутить бесконечно. Финальные знаки удобнее оставлять на последнем кадре. */
  loop?: boolean
}

const props = withDefaults(defineProps<Props>(), { loop: true })

const root = ref<HTMLElement | null>(null)
const motion = usePreferredReducedMotion()

/**
 * Экземпляр плеера. Тип намеренно широкий: собственные типы lottie-web тянут
 * за собой весь модуль, а он здесь грузится динамически — статический импорт
 * типа вернул бы его в общий кусок сборки.
 */
let player: { destroy: () => void; goToAndStop: (v: number, f?: boolean) => void } | null = null

/** Компонент могли снять, пока ехал кусок плеера. */
let alive = true

async function mount(): Promise<void> {
  const element = root.value
  if (!element || props.data === null || props.data === undefined) return

  const lottie = (await import('lottie-web')).default
  if (!alive || !root.value) return

  destroy()

  player = lottie.loadAnimation({
    container: element,
    renderer: 'svg',
    loop: props.loop,
    autoplay: motion.value !== 'reduce',
    animationData: props.data as Record<string, unknown>,
  })

  /* Без движения показываем собранный кадр, а не первый: на первом у
     большинства анимаций пусто, и знак выглядел бы потерянным. */
  if (motion.value === 'reduce') player.goToAndStop(0.99, false)
}

function destroy(): void {
  player?.destroy()
  player = null
}

watch(
  () => props.data,
  () => {
    void mount()
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  alive = false
  destroy()
})
</script>

<template>
  <div ref="root" class="vel-lottie" aria-hidden="true"></div>
</template>

<style scoped>
/* Плеер вставляет свой <svg> внутрь: растягиваем его по контейнеру, размер
   которого задаёт вызывающая сторона. */
.vel-lottie {
  inline-size: 100%;
  block-size: 100%;
}

.vel-lottie :deep(svg) {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}
</style>
