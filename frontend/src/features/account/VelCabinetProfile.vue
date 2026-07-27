<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import VelPersonalData from '@/features/account/VelPersonalData.vue'
import VelSecurityPanel from '@/features/account/VelSecurityPanel.vue'

/**
 * Profilo: dati + (dopo verify) sezione documenti + sicurezza.
 *
 * Анимация verify живёт ВНУТРИ VelDocumentUpload (слот #documents),
 * а не отдельным блоком под карточкой.
 */
const { t } = useI18n()
const slots = useSlots()

const hasDocsSlot = computed(() => typeof slots.documents === 'function')
</script>

<template>
  <div class="vel-profile">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="vel-profile__heading">
      {{ t('account.pages.profile.title') }}
    </h2>

    <div class="vel-profile__stack">
      <VelPersonalData />

      <!-- Карточка + анимация verify внутри (после accept) -->
      <section
        v-if="hasDocsSlot"
        id="vel-account-documents"
        class="vel-profile__docs"
        :aria-label="t('account.pages.documents.title')"
      >
        <slot name="documents" />
      </section>

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

.vel-profile__docs:empty {
  display: none;
}
</style>
