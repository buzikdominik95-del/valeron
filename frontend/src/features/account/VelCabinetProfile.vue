<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
/* verifyFlash: success/fail animation for email OTP */
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import { useAccountView } from '@/composables/useAccountView'
import { useAccountStore } from '@/stores/account.store'
import { logout as apiLogout } from '@/api/auth.api'
import VelButton from '@/components/ui/VelButton.vue'
import VelPersonalData from '@/features/account/VelPersonalData.vue'
import VelSecurityPanel from '@/features/account/VelSecurityPanel.vue'
import VelProfileEditDialog from '@/features/account/VelProfileEditDialog.vue'
import type { ProfileEditKind } from '@/features/account/VelProfileEditDialog.vue'

/**
 * Profilo: dati + documenti + sicurezza + Esci.
 * Modifica nome / email / password → VelProfileEditDialog.
 * Verify email (OTP demo) → markEmailVerified.
 */
const { t } = useI18n()
const slots = useSlots()
const { close: leaveCabinet } = useAccountView()
const accountStore = useAccountStore()

const hasDocsSlot = computed(() => typeof slots.documents === 'function')
const loggingOut = ref(false)

const editOpen = ref(false)
const editKind = ref<ProfileEditKind>('name')

function openEdit(kind: ProfileEditKind): void {
  editKind.value = kind
  editOpen.value = true
}

const verifyFlash = ref<'idle' | 'ok' | 'fail'>('idle')

function onVerifyCode(code: string): void {
  /*
   * Demo offline + backend-shaped: 6 digits OK, иначе fail flash (66.txt §13).
   * Когда API будет — map status 200/4xx сюда.
   */
  const ok = /^\d{6}$/.test(code.trim())
  if (ok) {
    accountStore.markEmailVerified()
    verifyFlash.value = 'ok'
  } else {
    verifyFlash.value = 'fail'
  }
  window.setTimeout(() => {
    verifyFlash.value = 'idle'
  }, 1600)
}

async function onLogout(): Promise<void> {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await apiLogout()
  } catch {
    /* exit landing anyway */
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
      <VelPersonalData @edit-name="openEdit('name')" />

      <!-- Карточка + анимация verify внутри (после accept) -->
      <section
        v-if="hasDocsSlot"
        id="vel-account-documents"
        class="vel-profile__docs"
        :aria-label="t('account.pages.documents.title')"
      >
        <slot name="documents" />
      </section>

      <VelSecurityPanel
        @change-password="openEdit('password')"
        @change-email="openEdit('email')"
        @verify="onVerifyCode"
      />

      <!-- Email verify result flash (66.txt §13) -->
      <Teleport to="body">
        <div
          v-if="verifyFlash !== 'idle'"
          class="vel-profile-flash"
          :class="verifyFlash === 'ok' ? 'vel-profile-flash--ok' : 'vel-profile-flash--fail'"
          role="status"
          data-testid="email-verify-flash"
        >
          <span class="vel-profile-flash__ico" aria-hidden="true">
            {{ verifyFlash === 'ok' ? '✓' : '!' }}
          </span>
          <p class="m-0">
            {{
              verifyFlash === 'ok'
                ? t('account.security.verify.successFlash')
                : t('account.security.verify.failFlash')
            }}
          </p>
        </div>
      </Teleport>

      <VelProfileEditDialog v-model:open="editOpen" :kind="editKind" />

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

.vel-profile-flash {
  position: fixed;
  inset-inline: 0;
  inset-block-start: 1.25rem;
  z-index: 90;
  display: flex;
  width: min(calc(100% - 1.5rem), 22rem);
  margin-inline: auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-radius: 0.9rem;
  font-size: 0.9rem;
  font-weight: 650;
  box-shadow: 0 1rem 2rem color-mix(in oklab, var(--color-fg) 18%, transparent);
  animation: vel-profile-flash-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-profile-flash--ok {
  border: 1px solid color-mix(in oklab, var(--color-success) 40%, transparent);
  background: color-mix(in oklab, var(--color-success) 12%, #fff);
  color: #0b7d4e;
}

.vel-profile-flash--fail {
  border: 1px solid color-mix(in oklab, var(--color-danger) 40%, transparent);
  background: color-mix(in oklab, var(--color-danger) 10%, #fff);
  color: var(--color-danger);
}

.vel-profile-flash__ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: color-mix(in oklab, currentColor 14%, #fff);
  font-weight: 800;
}

@keyframes vel-profile-flash-in {
  from {
    opacity: 0;
    transform: translateY(-0.75rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
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
