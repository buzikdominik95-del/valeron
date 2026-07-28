<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import { useAccountView } from '@/composables/useAccountView'
import { logout as apiLogout } from '@/api/auth.api'
import VelButton from '@/components/ui/VelButton.vue'
import VelPersonalData from '@/features/account/VelPersonalData.vue'
import VelSecurityPanel from '@/features/account/VelSecurityPanel.vue'

/**
 * Profilo: dati + (dopo verify) sezione documenti + sicurezza + Esci.
 *
 * Esci → лендинг (useAccountView.close). Данные заявки в simulator
 * НЕ чистим: hasCabinetAccess остаётся true → повторный квиз показывает
 * «Hai già un’area personale» (useWizard + VelCabinetExistsGate).
 *
 * Анимация verify живёт ВНУТРИ VelDocumentUpload (слот #documents).
 */
const { t } = useI18n()
const slots = useSlots()
const { close: leaveCabinet } = useAccountView()

const hasDocsSlot = computed(() => typeof slots.documents === 'function')
const loggingOut = ref(false)

async function onLogout(): Promise<void> {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    /* Best-effort: demo SPA может быть без сессии Sanctum. */
    await apiLogout()
  } catch {
    /* выход на лендинг всё равно */
  } finally {
    leaveCabinet()
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    loggingOut.value = false
  }
}
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

      <!-- Esci: лендинг; повторный кредит → gate «hai già un account» -->
      <section
        class="vel-profile__logout rounded-panel border border-line bg-surface"
        data-testid="profile-logout"
        :aria-label="t('account.pages.profile.logoutSection')"
      >
        <div class="vel-profile__logout-copy">
          <p class="vel-profile__logout-title m-0">
            {{ t('account.pages.profile.logoutTitle') }}
          </p>
          <p class="vel-profile__logout-lead m-0">
            {{ t('account.pages.profile.logoutLead') }}
          </p>
        </div>
        <VelButton
          type="button"
          variant="outline"
          class="vel-profile__logout-btn"
          data-testid="profile-logout-btn"
          :disabled="loggingOut"
          @click="onLogout"
        >
          <svg
            class="vel-profile__logout-ico"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
            <path
              d="M15 12H4m0 0 3-3M4 12l3 3"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{
            loggingOut
              ? t('account.pages.profile.logoutBusy')
              : t('account.pages.profile.logout')
          }}
        </VelButton>
      </section>
    </div>
  </div>
</template>

<style scoped>
.vel-profile {
  display: flex;
  flex-direction: column;
  gap: var(--vel-cab-gap, 0.7rem);
}

.vel-profile__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: clamp(1.15rem, 3.5vw, 1.3rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.vel-profile__heading:focus:not(:focus-visible) {
  outline: none;
}

.vel-profile__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vel-cab-gap, 0.7rem);
  /* На всю ширину main — как «бровь» */
  width: 100%;
  max-inline-size: none;
}

.vel-profile__docs:empty {
  display: none;
}

.vel-profile__logout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem 1rem;
  padding: var(--vel-cab-card-pad, 1rem);
}

.vel-profile__logout-copy {
  display: flex;
  min-width: min(100%, 14rem);
  flex: 1 1 12rem;
  flex-direction: column;
  gap: 0.25rem;
}

.vel-profile__logout-title {
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 650;
  line-height: 1.3;
}

.vel-profile__logout-lead {
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.vel-profile__logout-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.45rem;
  border-color: color-mix(in oklab, var(--color-danger) 35%, var(--color-line)) !important;
  color: var(--color-danger) !important;
}

.vel-profile__logout-btn:hover:not(:disabled) {
  background: color-mix(in oklab, var(--color-danger) 8%, var(--color-surface)) !important;
}

.vel-profile__logout-ico {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
}
</style>
