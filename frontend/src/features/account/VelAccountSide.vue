<script setup lang="ts">
import { useAccount } from '@/composables/useAccount'
import VelPersonalData from '@/features/account/VelPersonalData.vue'
import VelDocumentCard from '@/features/account/VelDocumentCard.vue'

/**
 * Боковая колонка кабинета: личные данные и принятые документы.
 *
 * ПАНЕЛИ БЕЗОПАСНОСТИ ЗДЕСЬ БОЛЬШЕ НЕТ. Тот же VelSecurityPanel стоит во
 * вкладке «Profilo» (VelCabinetProfile), и на главной он был вторым его
 * экземпляром: человек видел на одном экране две одинаковые панели со сменой
 * пароля и почты, а нажатие в любой из них делало одно и то же. Смена пароля
 * и подтверждение почты — это настройки учётной записи, их место в профиле,
 * а не на витрине заявки.
 *
 * Отдельный файл, а не три тега в App.vue: состав колонки — это решение
 * кабинета, а не приложения. App.vue про содержимое слотов знать не обязан,
 * и добавить сюда четвёртый блок можно, не трогая корень приложения.
 *
 * Своей разметки у колонки нет: сетку и промежутки задаёт сам слот в
 * оболочке, поэтому здесь два корня и ни одной обёртки.
 *
 * Карточек документов ровно столько, сколько их принял сервер. Пустой список
 * означает, что карточек нет, — рисовать «documento caricato» по файлам,
 * выбранным в браузере, нельзя: они ещё никуда не ушли.
 *
 */
const { documents } = useAccount()
</script>

<template>
  <VelPersonalData />

  <VelDocumentCard v-for="document in documents" :key="document.kind" :doc="document" />
</template>
