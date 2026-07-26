<script setup lang="ts">
import { watch } from 'vue'
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'
import { fastAnimMs } from '@/lib/fast-anim'
import {
  ANALYSIS_MOTION_OK,
  ENTER_ITEM_MS,
  ENTER_LIFT_PX,
  ENTER_SPREAD_MS,
  WAVE_ITEM_MS,
  WAVE_LIFT_PX,
  WAVE_SPREAD_MS,
} from '@/features/wizard/analysis-motion'
import type { BankRow } from '@/composables/useBankAnalysis'
import VelBankRow from '@/features/wizard/VelBankRow.vue'

/**
 * Список опрашиваемых банков и его собственное движение: очередь появления
 * сверху вниз при входе и волна по всем строкам, когда проверен последний.
 *
 * Отдельный файл, потому что это отдельный хозяин: строка знает про себя одну,
 * а очередь и волна — про весь список сразу, и жить в строке они не могут.
 * Шагу (VelStepAnalysis) они тоже не принадлежат: там разметка результата,
 * статусы и переход, а не выборка по тринадцати узлам.
 *
 * Волна — не украшение и не задержка. Она отвечает на вопрос «это всё?»:
 * последняя галочка сама по себе неотличима от двенадцати предыдущих, и без
 * общего жеста список просто перестаёт двигаться. Поэтому она короткая и
 * укладывается в бюджет паузы перед сменой шага целиком — см. analysis-motion.
 *
 * ПОЧЕМУ ПОЯВЛЕНИЕ ПЕРЕЕХАЛО С CSS НА GSAP. Раньше очередь вёл VelRevealList
 * через animation-delay. Он остаётся правильным инструментом для секций
 * лендинга, но здесь на тех же строках уже работает GSAP — наклон при входе
 * в проверку, подъём в волне, — и два хозяина у одного transform дают
 * гонку: CSS-анимация появления доигрывает свой кадр поверх твина наклона
 * и роняет строку обратно. Теперь transform ведёт ровно один механизм.
 */
interface Props {
  banks: BankRow[]
  /** Проверены все. Волна идёт один раз, по фронту. */
  finished: boolean
}

const props = defineProps<Props>()

/*
 * Таймлайн волны собирается ОДИН раз при монтировании и лежит на паузе: строки
 * все тринадцать стоят в DOM с первого кадра (меняются только их статусы),
 * поэтому искать цели позже незачем.
 *
 * null при 'reduce': внутрь условия matchMedia не заходит, наблюдатель ниже
 * молча ничего не играет. Переход на следующий шаг это не трогает — его ведёт
 * таймер в VelStepAnalysis, а не onComplete волны.
 */
let wave: gsap.core.Timeline | null = null

const root = useGsapContext(() => {
  // Выборка от корня списка — та самая причина, по которой контексту передаётся
  // scopeElement: окажись на экране второй такой список, волна подняла бы
  // и чужие строки.
  const rows = root.value?.querySelectorAll<HTMLElement>('.vel-bank')
  if (!rows?.length) return

  gsap.matchMedia().add(ANALYSIS_MOTION_OK, () => {
    /*
     * Появление. from, а не fromTo: конечное состояние — обычная вёрстка, и
     * задавать его вторично значило бы держать две копии одного значения.
     * Тень флага ускорения здесь та же, что и у самой проверки, — иначе под
     * автопрогоном список въезжал бы дольше, чем опрашивался.
     */
    gsap.from(rows, {
      opacity: 0,
      y: ENTER_LIFT_PX,
      duration: fastAnimMs(ENTER_ITEM_MS) / 1000,
      ease: 'power2.out',
      stagger: { amount: fastAnimMs(ENTER_SPREAD_MS) / 1000 },
    })

    /*
     * Только y: подъём через top или margin пересчитывал бы раскладку всех
     * тринадцати строк на каждом кадре. yoyo + repeat: 1 возвращает строку
     * ровно в 0 — после волны на элементах не остаётся смещения.
     *
     * stagger.amount, а не stagger-число: amount задаёт время между ПЕРВОЙ и
     * ПОСЛЕДНЕЙ строкой, поэтому длина списка на длительность волны не влияет.
     * С числом на строку тринадцать банков дали бы одну волну, а тридцать —
     * втрое длиннее, и она уехала бы за смену шага.
     */
    wave = gsap.timeline({ paused: true }).to(rows, {
      y: -WAVE_LIFT_PX,
      duration: WAVE_ITEM_MS / 2000,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
      stagger: { amount: WAVE_SPREAD_MS / 1000 },
    })

    return () => {
      wave = null
    }
  })
})

watch(
  () => props.finished,
  (done) => {
    if (done) wave?.restart()
  },
)
</script>

<template>
  <!-- Обёртка нужна GSAP: контекст требует корневой элемент, а ref на
       компоненте отдал бы экземпляр, а не узел. Своих стилей у неё нет. -->
  <div ref="root">
    <!-- role=list вместо ul: preflight снимает маркеры, а с ними Safari теряет
         и саму роль списка. -->
    <div class="vel-banks" role="list">
      <VelBankRow v-for="bank in banks" :key="bank.id" :bank="bank" />
    </div>
  </div>
</template>

<style scoped>
/* Перспектива обязана лежать ЗДЕСЬ, на прямом родителе строк: она действует
   только на потомков, а наклоняется сама строка (VelBankRow при 'checking').
   Перенести её в компонент строки — значит схлопнуть rotateX в плоскость. */
.vel-banks {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  perspective: 900px;
}
</style>
