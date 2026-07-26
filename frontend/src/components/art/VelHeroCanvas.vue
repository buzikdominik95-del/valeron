<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'
import {
  useDocumentVisibility,
  useIntersectionObserver,
  usePreferredReducedMotion,
  useRafFn,
  useResizeObserver,
  useTimeoutFn,
  tryOnScopeDispose,
} from '@vueuse/core'
import {
  createHeroScene,
  disposeHeroScene,
  renderHeroFrame,
  resizeHeroScene,
} from '@/features/hero/hero-canvas-scene'
import type { HeroSceneState } from '@/features/hero/hero-canvas-scene'

/**
 * Амбиентный 3D-фон первого экрана: сетка точек, идущая волной, и поверх неё
 * каркас знака Velora — «V» с восходящим штрихом, разложенная на несколько
 * слоёв по глубине и связанная рёбрами.
 * Ставится ВНУТРЬ элемента с position: relative — сам растягивается по inset: 0.
 * Чистая декорация: aria-hidden, событий не ловит, текста не содержит. Рендер
 * идёт, только пока вкладка активна И контейнер в зоне видимости: крутить
 * WebGL в фоне — это разряженный ноутбук.
 *
 * Сама сцена — three, материалы, порядок кадра и уборка — лежит в модуле
 * hero-canvas-scene, её числа в hero-canvas-geometry, оба в @/features/hero.
 * Здесь остались только «когда»: когда сцену строить, когда крутить кадры и
 * когда сносить.
 */

const root = ref<HTMLElement | null>(null)
// shallowRef обязателен: reactive-прокси на объектах three ломает сцену (внутри
// они сравнивают ссылки) и делает каждый кадр дороже.
const state = shallowRef<HeroSceneState | null>(null)
const onScreen = ref(false)

const visibility = useDocumentVisibility()
const motion = usePreferredReducedMotion()

/** Компонент могли размонтировать, пока грузился чанк three. */
let alive = true
/** Секунды анимации; копятся из delta, поэтому пауза не даёт скачка фазы. */
let elapsed = 0

function resize(): void {
  const current = state.value
  const element = root.value
  if (!current || !element) return
  resizeHeroScene(current, element)
}

async function createScene(): Promise<void> {
  const element = root.value
  if (!element || state.value) return

  // Пока едет чанк three, компонент мог исчезнуть — сцена об этом спросит сама.
  const created = await createHeroScene(element, () => alive && root.value !== null)
  if (!created) return

  state.value = created
  resize()
}

function destroy(): void {
  raf.pause()
  const current = state.value
  state.value = null
  if (!current) return
  disposeHeroScene(current)
}

const raf = useRafFn(
  ({ delta }) => {
    const current = state.value
    if (!current) return

    elapsed += delta / 1000
    renderHeroFrame(current, elapsed)
  },
  { immediate: false },
)

useResizeObserver(root, resize)

useIntersectionObserver(root, (entries) => {
  onScreen.value = entries[0]?.isIntersecting ?? false
})

watchEffect(() => {
  const shouldRun = state.value !== null && onScreen.value && visibility.value === 'visible'
  if (shouldRun) raf.resume()
  else raf.pause()
})

/**
 * Стоит ли вообще тратить трафик на фон.
 *
 * Чанк three весит больше, чем всё остальное приложение вместе взятое, а даёт
 * он украшение — не текст, не расчёт, не кнопку. На экономии трафика и на
 * медленной связи это первое, чем нужно пожертвовать: без фона сайт полностью
 * работоспособен, с фоном на 2G — нет.
 *
 * Network Information API есть не везде, поэтому его отсутствие толкуем в
 * пользу фона: не знаем — значит связь обычная.
 */
function connectionAllowsCanvas(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (!connection) return true
  if (connection.saveData) return false
  return connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g'
}

onMounted(() => {
  // При reduce сцену не создаём вовсе: чанк three не грузится, память и
  // контекст WebGL не занимаются.
  if (motion.value === 'reduce') return
  if (!connectionAllowsCanvas()) return

  /*
   * Ждём простоя, а не монтирования.
   *
   * Фон декоративен, а загрузка и разбор three конкурируют за тот же поток, на
   * котором браузер рисует первый экран: текст, кнопку расчёта и цифру ставки.
   * Запрос в простое пропускает их вперёд и стоит фону доли секунды, которых на
   * фоне появления страницы не видно.
   *
   * requestIdleCallback есть не во всех браузерах (в Safari его нет), поэтому
   * запасной путь — обычный таймер: без него в этих браузерах фона не было бы
   * вовсе. Отменяем оба, если компонент исчез раньше, чем дождался простоя.
   */
  const start = (): void => {
    if (!alive) return
    void createScene()
  }

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(start, { timeout: 2000 })
    tryOnScopeDispose(() => window.cancelIdleCallback(id))
    return
  }

  const { stop } = useTimeoutFn(start, 200)
  tryOnScopeDispose(stop)
})

// Настройку могут переключить на лету: сцену сносим. Обратно не поднимаем —
// это редкий случай, и перезагрузка страницы вернёт фон.
watch(motion, (value) => {
  if (value === 'reduce') destroy()
})

onBeforeUnmount(() => {
  alive = false
  destroy()
})
</script>

<template>
  <div ref="root" class="vel-hero-canvas" aria-hidden="true"></div>
</template>

<style scoped>
.vel-hero-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* Декор не должен перехватывать клики и выделение текста героя */
  pointer-events: none;

  /*
    Края гасим маской, чтобы сетка не обрывалась ступенькой у заголовка.
    black здесь не цвет из палитры, а трафарет: маску читают по альфе.
  */
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 22%, black 74%, transparent);
  mask-image: linear-gradient(to bottom, transparent, black 22%, black 74%, transparent);
}

/* Канвас создаёт three уже после компиляции стилей, атрибута scope на нём нет */
.vel-hero-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
