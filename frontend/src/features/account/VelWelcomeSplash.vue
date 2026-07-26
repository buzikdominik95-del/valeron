<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion, useSessionStorage, useTimeoutFn } from '@vueuse/core'

/**
 * Заставка входа в кабинет: «BENVENUTO» и под ней имя клиента.
 *
 * ЧТО ОНА ПРИКРЫВАЕТ. Кабинет под ней к моменту растворения уже отрисован —
 * заставка ничего не ждёт и ничего не грузит, она только прикрывает первый
 * кадр. Отсюда все решения ниже.
 *
 * УХОД ПО ТАЙМЕРУ, А НЕ ПО КОНЦУ АНИМАЦИИ. Единственный способ уйти отсюда —
 * useTimeoutFn. Повесить закрытие на animationend или onComplete значило бы:
 * анимация не запустилась (вкладка в фоне, отключённые анимации, сбой) —
 * человек остался на тёмном экране навсегда, и выхода с него нет.
 *
 * ПРИ prefers-reduced-motion НЕ ПОКАЗЫВАЕМ ВОВСЕ. Заставка целиком состоит из
 * движения: без проявления и растворения это просто тёмный экран, который
 * почему-то отнимает две с половиной секунды. Тот, кто просил систему убрать
 * анимацию, попадает прямо в кабинет.
 *
 * ОДИН РАЗ ЗА СЕССИЮ. Флаг в sessionStorage, а не в памяти компонента: без
 * него заставка возвращалась бы при каждом повторном входе в кабинет — вышел
 * на сайт, вернулся, и снова здравствуйте. И не localStorage: «сессия» здесь
 * ровно то, что понимает под ней браузер, — новая вкладка это новый приход.
 *
 * ФОКУС. Пока заставка на экране, кабинет под ней выключен из работы (оболочка
 * ставит на него inert), а фокус стоит на самой заставке — иначе клавиатура и
 * скринридер гуляли бы по невидимому экрану под ней.
 */
interface Props {
  /** Имя и фамилия клиента. Пустое — остаётся одна строка «BENVENUTO». */
  name: string
}

defineProps<Props>()

/**
 * Видимость наружу: оболочке она нужна, чтобы выключить кабинет под заставкой.
 * Значение выставляется синхронно в setup, до первого кадра, — иначе кабинет
 * успел бы мигнуть.
 */
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()

/** Удержание до начала растворения и само растворение, мс. */
const HOLD_MS = 2200
const FADE_MS = 400

const reducedMotion = usePreferredReducedMotion()
const seen = useSessionStorage('velora:cabinet:welcome-seen', false)

/** Растворение: класс на корне, переход только по opacity. */
const fading = ref(false)
const root = ref<HTMLElement | null>(null)

const shows = reducedMotion.value !== 'reduce' && !seen.value

const { start: startFade } = useTimeoutFn(
  () => {
    fading.value = true
  },
  HOLD_MS,
  { immediate: false },
)

const { start: startClose } = useTimeoutFn(
  () => {
    open.value = false
  },
  HOLD_MS + FADE_MS,
  { immediate: false },
)

if (shows) {
  seen.value = true
  open.value = true
  startFade()
  startClose()
}

onMounted(() => {
  root.value?.focus()
})
</script>

<template>
  <div
    v-if="open"
    ref="root"
    class="vel-splash"
    :class="{ 'vel-splash--out': fading }"
    tabindex="-1"
  >
    <p class="vel-splash__hello">{{ t('account.splash.welcome') }}</p>
    <p v-if="name !== ''" class="vel-splash__name">{{ name }}</p>
  </div>
</template>

<style scoped>
.vel-splash {
  position: fixed;
  inset: 0;
  /* Выше шапки (40) и нижней панели (30): заставка перекрывает всё */
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 1.5rem;
  background-color: var(--color-accent-deep);
  text-align: center;
  /* Растворение — только прозрачность: раскладку она не пересчитывает */
  opacity: 1;
  transition: opacity 400ms ease;
}

/* Фокус сюда приходит программно, рамка была бы шумом. Клавиатурный фокус
   (:focus-visible из base) при этом остаётся видимым. */
.vel-splash:focus:not(:focus-visible) {
  outline: none;
}

.vel-splash--out {
  opacity: 0;
}

.vel-splash__hello {
  margin: 0;
  /* Верхний регистр даёт CSS, а не локаль: скринридер прочитает «Benvenuto»
     словом, а не по буквам. */
  text-transform: uppercase;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.32em;
  /* Приглушённая светлая на тёмном: 8.4 к accent-deep при норме 4.5 */
  color: color-mix(in oklab, var(--color-accent-ink) 72%, var(--color-accent-deep));
  animation: vel-splash-in 420ms ease both;
}

.vel-splash__name {
  margin: 0;
  font-size: clamp(1.75rem, 6vw, 2.4rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-accent-ink);
  /* Имя проступает следом за строкой приветствия, как в эталоне */
  animation: vel-splash-in 520ms ease 480ms both;
}

@keyframes vel-splash-in {
  from {
    opacity: 0;
    transform: translate3d(0, 0.4rem, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>
