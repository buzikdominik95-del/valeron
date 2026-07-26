<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelMarquee from '@/components/magic/VelMarquee.vue'
import { BANKS } from '@/composables/useBankAnalysis'

/**
 * Лента банков-партнёров.
 *
 * Список берётся из @/composables/useBankAnalysis — там он уже есть для опроса
 * банков в мастере. Свою копию массива секция не заводит: разошедшиеся составы
 * означали бы, что витрина обещает не тех партнёров, которых потом опрашивают.
 *
 * Логотипов нет и рисовать их нельзя — это чужие торговые марки. Тот же запрет
 * и та же замена монограммой действуют в @/features/wizard/VelBankRow.vue.
 *
 * Заголовок берёт howWeWork.partners: строка переехала сюда из секции
 * «Как мы работаем», где была нижней подписью, и второй раз там не выводится.
 *
 * Лента едет; видимой кнопки «остановить» над ней больше нет — почему так и
 * чем закрыт WCAG 2.2.2, разобрано в шапке @/components/magic/VelMarqueePause.vue.
 */
const { t } = useI18n()
</script>

<template>
  <!-- Сцена секции: подпись и лента выезжают друг за другом, шаг задаёт stagger -->
  <VelStage class="border-b border-line bg-surface">
    <div class="vel-band mx-auto w-full max-w-6xl px-5">
      <!-- as="h2": секция обязана иметь заголовок своего уровня. Начертание
           надзаголовочное (.vel-label) — полоса партнёров звучит тише
           соседних разделов и не перебивает их заголовки. -->
      <VelReveal as="h2" class="vel-label flex items-center gap-2.5">
        <span class="size-1.5 shrink-0 bg-accent" aria-hidden="true"></span>
        {{ t('banks.title') }}
      </VelReveal>

      <!-- Отступы ленты снаружи: сам VelMarquee своих полей не задаёт -->
      <VelReveal class="mt-6 lg:mt-8">
        <VelMarquee>
          <!-- role="list" возвращает семантику списка в Safari: preflight
               снимает маркеры, а вместе с ними VoiceOver теряет и роль.
               flex-wrap работает только в статичном режиме ленты: в едущем
               трек шириной по содержимому и переносить нечего. -->
          <ul role="list" class="vel-strip__list flex flex-wrap items-center justify-center">
            <li
              v-for="bank in BANKS"
              :key="bank.id"
              class="text-xl font-semibold tracking-tight whitespace-nowrap text-faint sm:text-2xl"
            >
              <!-- ЗДЕСЬ ПОДСТАВЛЯЮТСЯ ЛОГОТИПЫ, когда появятся согласованные
                   файлы: вместо {{ bank.name }} внутрь <li> встаёт
                   <img :src="logo(bank.id)" :alt="bank.name" width height>.
                   Менять нужно только содержимое <li> — классы размера и цвета
                   уйдут на <img>, а ширина/перенос/анимация ленты не зависят от
                   того, текст внутри или картинка. alt обязан остаться именем
                   банка: для скринридера полоса не должна измениться. -->
              {{ bank.name }}
            </li>
          </ul>
        </VelMarquee>
      </VelReveal>
    </div>
  </VelStage>
</template>

<style scoped>
/*
  Горизонтальный шаг берём переменной самой ленты: расстояние между именами
  внутри копии обязано совпадать с расстоянием на стыке копий, иначе в момент
  склейки в ряду видна дырка или, наоборот, слипшаяся пара имён.
  Вертикальный шаг нужен только в статичном режиме, где ряд переносится.
*/
.vel-strip__list {
  column-gap: var(--vel-marquee-gap);
  row-gap: 0.5rem;
}
</style>
