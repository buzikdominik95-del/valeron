<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AccountDocument } from '@/stores/account.store'

/**
 * Карточка принятого документа: «Documento caricato» и его название.
 *
 * Запись приходит целиком одним пропом и ровно в той форме, в которой её
 * отдаст API (AccountDocument, см. account.store): подключение бэкенда сведётся
 * к появлению массива в ответе, а разметка останется прежней.
 *
 * ГРАНИЦА. Карточка ничего не утверждает от себя: если она на экране, значит
 * сервер сообщил, что документ принят. Файлы, выбранные в VelDocumentUpload,
 * пока никуда не уходят, и рисовать по ним «загружено» нельзя.
 *
 * Имя файла показывается, только если оно есть: пустая строка означает, что
 * сервер прислал вид документа без имени, и выдумывать его нечем.
 *
 * Знаки нарисованы линией, как VelPurposeIcon и значки нижней панели: лист
 * с загнутым углом и галочка. Эмодзи, которыми оба места отмечены в оригинале,
 * в интерфейс не переносим — они чужой гарнитуры и в теме не участвуют.
 */
defineProps<{ doc: AccountDocument }>()

const { t } = useI18n()
</script>

<template>
  <div class="vel-doc-card rounded-panel border border-line bg-surface p-4 sm:p-5">
    <!-- Лист с загнутым углом. Декор: всё, что он значит, сказано словами
         рядом — надзаголовком и названием документа. -->
    <svg class="vel-doc-card__sheet" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 3.5h8l5 5v12h-13z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M8.5 13h7M8.5 16.5h4" />
    </svg>

    <div class="flex min-w-0 flex-col gap-1">
      <p class="vel-label">{{ t('account.documentCard.overline') }}</p>

      <p class="vel-doc-card__name">{{ t(`account.documentCard.kinds.${doc.kind}`) }}</p>

      <p v-if="doc.fileName !== ''" class="vel-doc-card__file">{{ doc.fileName }}</p>
    </div>

    <!-- Галочка принятия. Тоже декор: состояние уже названо надзаголовком,
         и второй раз объявлять его скринридеру незачем. -->
    <svg class="vel-doc-card__check" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  </div>
</template>

<style scoped>
.vel-doc-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.vel-doc-card__sheet,
.vel-doc-card__check {
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.vel-doc-card__sheet {
  inline-size: 1.75rem;
  block-size: 1.75rem;
  color: var(--color-accent-deep);
}

/* Галочка прижата к правому краю и уходит первой, если строки не помещаются:
   название документа важнее знака, повторяющего надзаголовок. */
.vel-doc-card__check {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin-inline-start: auto;
  color: var(--color-accent);
}

.vel-doc-card__name {
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
}

/* Имя файла — второстепенная строка: длинное не растягивает карточку,
   а обрезается многоточием. */
.vel-doc-card__file {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
