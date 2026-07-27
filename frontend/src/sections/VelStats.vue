<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelNumberTicker from '@/components/magic/VelNumberTicker.vue'
import { AMOUNT_MAX, ANNUAL_RATE_PERCENT } from '@/stores/simulator.store'

const { t } = useI18n()

/**
 * Показатели отсчитываются от нуля, когда полоса въезжает в кадр, — счёт ведёт
 * VelNumberTicker, ожидание кадра тоже его работа.
 *
 * Поэтому значения здесь ЧИСЛА, а не готовые строки локали, как было раньше.
 * Хвост («+», «%», « €», « min») — отдельное поле: он часть утверждения,
 * и тикер приклеивает его и к бегущему тексту, и к строке для скринридера.
 * Строку целиком («50+») отдать было нельзя — считать нечего.
 *
 * Два числа берутся из стора калькулятора: потолок суммы и ставка живут там,
 * и переписанные здесь руками они разъехались бы с самим калькулятором.
 * Остальные два — обещания витрины, у них своего места в коде нет.
 */
/** Столько банков в партнёрской сети */
const PARTNER_BANKS = 50
/** Столько минут занимает ответ по заявке */
const RESPONSE_MINUTES = 5

const stats = computed(() => [
  {
    name: t('stats.partnersName'),
    value: PARTNER_BANKS,
    decimals: 0,
    suffix: t('stats.partnersSuffix'),
  },
  {
    name: t('stats.rateName'),
    value: ANNUAL_RATE_PERCENT,
    // Ставка 3,8 — единственная дробная: без знака после запятой она
    // досчиталась бы до «4%», то есть до другого предложения.
    decimals: 1,
    suffix: t('stats.rateSuffix'),
  },
  {
    name: t('stats.speedName'),
    value: RESPONSE_MINUTES,
    decimals: 0,
    suffix: t('stats.speedSuffix'),
  },
  {
    name: t('stats.amountName'),
    value: AMOUNT_MAX,
    decimals: 0,
    suffix: t('stats.amountSuffix'),
  },
])
</script>

<template>
  <!-- VelStage подменяет собой прежний <section>: сцена секции собирает все
       VelReveal внутри и выводит их одной пачкой, лесенкой слева направо.
       Задержек в разметке нет — шаг каскада живёт в useRevealStage. -->
  <VelStage class="border-b border-line bg-surface">
    <dl class="mx-auto grid w-full max-w-6xl grid-cols-2 px-5 sm:grid-cols-4">
      <!-- flex-col-reverse: в разметке dt идёт первым, как требует список
           описаний, но визуально сверху остаётся крупное значение -->
      <!-- VelReveal подменяет собой прежний div, а не оборачивает его:
           лишний контейнер забрал бы ячейку grid и сбил разделители -->
      <!-- Отступ живёт на ячейке, а не на <dl>: вертикальные разделители
           между ячейками тянутся по её высоте, и перенос поля наверх укоротил
           бы линии. Значения (20/28) дают полосе те же 40/56, что и класс
           .vel-band из main.css — секция стоит на общей шкале ритма,
           не ломая разделители. Было py-6, то есть 24/24 вне всякой шкалы. -->
      <VelReveal
        v-for="(stat, index) in stats"
        :key="stat.name"
        class="flex flex-col-reverse gap-0.5 border-line py-5 pr-4 lg:py-7"
        :class="index > 0 ? 'sm:border-l sm:pl-6' : ''"
      >
        <dt class="text-sm text-muted">{{ stat.name }}</dt>
        <dd class="m-0 text-2xl text-fg">
          <VelNumberTicker
            :value="stat.value"
            :decimals="stat.decimals"
            :suffix="stat.suffix"
          />
        </dd>
      </VelReveal>
    </dl>
  </VelStage>
</template>
