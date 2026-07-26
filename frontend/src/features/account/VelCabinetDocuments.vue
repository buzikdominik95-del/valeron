<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import VelDocumentCard from '@/features/account/VelDocumentCard.vue'

/**
 * Раздел «Documenti»: загрузка удостоверения, договор с предпросмотром и
 * список файлов, которые сервер уже принял.
 *
 * ПОЧЕМУ ВСЁ ТРИ ЗДЕСЬ, А НЕ НА ГЛАВНОЙ. Раньше загрузка и договор стояли на
 * Home, а этот раздел только отсылал обратно кнопкой «перейти к загрузке» —
 * то есть существовал, чтобы сказать «тебе не сюда». Вместе с листом договора
 * Home вырастал до 6358px на телефоне: лента, до конца которой не доходят.
 * Теперь раздел делает то, что обещает названием, а Home остаётся обзором.
 *
 * ПАНЕЛИ ПРИХОДЯТ СЛОТАМИ, А НЕ СОБИРАЮТСЯ ЗДЕСЬ. Их состояние (выбранные
 * файлы, статус проверки, подпись) живёт в VelAccountFlow и общее на весь
 * кабинет. Смонтировав VelDocumentUpload прямо тут, мы получили бы второй
 * экземпляр с собственным состоянием: человек загружает снимок в одном месте,
 * а в другом слот по-прежнему пуст.
 *
 * ПОРЯДОК СВЕРХУ ВНИЗ ПОВТОРЯЕТ ПОРЯДОК ДЕЛ: сперва прислать документ, потом
 * подписать договор, и только потом смотреть, что уже принято. Список
 * принятого стоит последним намеренно — он про прошлое, а не про то, что
 * нужно сделать сейчас.
 */
const { t } = useI18n()
const { documents } = useAccount()

const hasDocs = computed(() => documents.value.length > 0)
</script>

<template>
  <div class="vel-docs-page">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="vel-docs-page__heading">
      {{ t('account.pages.documents.title') }}
    </h2>

    <!-- Якорь прежний: на него по-прежнему ведут ссылки «Vai» из списка шагов
         на Home (см. account-anchors.ts), и менять его значило бы чинить их. -->
    <section id="vel-account-documents" class="vel-docs-page__panel">
      <slot name="upload" />
    </section>

    <section id="vel-account-signature" class="vel-docs-page__panel">
      <slot name="contract" />
    </section>

    <!-- Принятые сервером файлы. Пока список пуст, блока нет вовсе: строка
         «ничего не принято» ниже двух рабочих панелей читалась бы как ошибка,
         хотя человек только что всё отправил. -->
    <section v-if="hasDocs" class="vel-docs-page__accepted">
      <h3 class="vel-docs-page__subhead">{{ t('account.pages.documents.listLabel') }}</h3>

      <ul class="vel-docs-page__list">
        <li v-for="document in documents" :key="document.kind">
          <VelDocumentCard :doc="document" />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.vel-docs-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vel-docs-page__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

/* Фокус приходит программно после смены раздела — рамка была бы шумом.
   :focus-visible из base остаётся, клавиатурный фокус видно. */
.vel-docs-page__heading:focus:not(:focus-visible) {
  outline: none;
}

/* Пустой слот не должен оставлять дыру: панель договора не смонтирована,
   пока нечего подписывать. */
.vel-docs-page__panel:empty {
  display: none;
}

.vel-docs-page__accepted {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.vel-docs-page__subhead {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.vel-docs-page__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
