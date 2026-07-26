<script setup lang="ts">
import { useAccount } from '@/composables/useAccount'
import VelPersonalData from '@/features/account/VelPersonalData.vue'
import VelDocumentCard from '@/features/account/VelDocumentCard.vue'
import VelSecurityPanel from '@/features/account/VelSecurityPanel.vue'

/**
 * Боковая колонка кабинета: личные данные, принятые документы, безопасность.
 * Ровно тот набор, который описан слотом side в VelAccount.vue.
 *
 * Отдельный файл, а не три тега в App.vue: состав колонки — это решение
 * кабинета, а не приложения. App.vue про содержимое слотов знать не обязан,
 * и добавить сюда четвёртый блок можно, не трогая корень приложения.
 *
 * Своей разметки у колонки нет: сетку и промежутки задаёт сам слот в
 * оболочке, поэтому здесь три корня и ни одной обёртки.
 *
 * Карточек документов ровно столько, сколько их принял сервер. Пустой список
 * означает, что карточек нет, — рисовать «documento caricato» по файлам,
 * выбранным в браузере, нельзя: они ещё никуда не ушли.
 *
 * События панели безопасности наружу не поднимаются намеренно: экранов смены
 * пароля и почты в проекте нет, а код проверяет сервер, которого тоже нет.
 * Когда появятся — обработчики встанут здесь, панель уже отдаёт всё нужное.
 */
const { documents } = useAccount()
</script>

<template>
  <VelPersonalData />

  <VelDocumentCard v-for="document in documents" :key="document.kind" :doc="document" />

  <VelSecurityPanel />
</template>
