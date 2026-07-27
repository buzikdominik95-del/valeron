<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import VelPersonalData from '@/features/account/VelPersonalData.vue'
import VelSecurityPanel from '@/features/account/VelSecurityPanel.vue'

/**
 * Раздел Profilo: личные данные заявки и безопасность аккаунта.
 * Те же панели, что в боковой колонке Home — здесь на всю ширину,
 * чтобы на телефоне к ним можно было дойти из нижнего меню.
 *
 * ЗАГОЛОВОК БЕЗ ЛИДА. Под «Il tuo profilo» стоял подзаголовок «Dati anagrafici
 * della pratica e impostazioni di sicurezza» — перечисление двух панелей,
 * которые тут же названы своими заголовками строкой ниже. Ключ
 * account.pages.profile.lead удалён вместе с выводом: непрочитанная строка
 * локали живёт своей жизнью — её правят и переводят, не видя, что на экране
 * её нет вовсе.
 */
const { t } = useI18n()
</script>

<template>
  <div class="vel-profile">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="vel-profile__heading">
      {{ t('account.pages.profile.title') }}
    </h2>

    <div class="vel-profile__stack">
      <VelPersonalData />
      <VelSecurityPanel />
    </div>
  </div>
</template>

<style scoped>
.vel-profile {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vel-profile__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.vel-profile__heading:focus:not(:focus-visible) {
  outline: none;
}

.vel-profile__stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-inline-size: 40rem;
}
</style>
