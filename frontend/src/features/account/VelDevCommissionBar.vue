<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useCommission } from '@/composables/useCommission'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { TERM_DEFAULT, useSimulatorStore } from '@/stores/simulator.store'
import { ISSUED_AT } from '@/features/account/contract-number'
import type { CommissionLevel } from '@/api/commission'
import VelApprovalEmailPreview from '@/features/account/VelApprovalEmailPreview.vue'
import {
  cabinetUrlFromLocation,
  downloadClientEmail,
  type ClientEmailKind,
} from '@/lib/client-emails'

/**
 * Переключатель уровней/фаз (L1–L4) + 4 письма (66.txt + Desktop/22).
 * L5 снят. Скрыть: VITE_HIDE_PHASE_BAR=1.
 */
const { t, n, d } = useI18n()
const { level, phase, applyAdminLevel } = useCommission()
const { client, approvedAmount } = useAccount()
const accountStore = useAccountStore()
const { termMonths, purpose } = storeToRefs(useSimulatorStore())

const levels = [1, 2, 3, 4] as const satisfies readonly CommissionLevel[]
const emailOpen = ref(false)

const termLabel = computed(() => {
  const m = termMonths.value || TERM_DEFAULT
  return `${m} mesi`
})

function setLevel(next: CommissionLevel): void {
  applyAdminLevel(next)
}

function showApprovalEmail(): void {
  emailOpen.value = true
}

async function genMail(kind: ClientEmailKind): Promise<void> {
  const months = termMonths.value || TERM_DEFAULT
  const amount = approvedAmount.value
  const installment = months > 0 ? amount / months : amount
  let signedAt = '—'
  if (accountStore.contractSignedAt) {
    try {
      signedAt = d(new Date(accountStore.contractSignedAt), 'long')
    } catch {
      signedAt = accountStore.contractSignedAt
    }
  }
  const sim = useSimulatorStore()
  /* 66.txt: имя/сумма/ссылка; PDF contratto = anteprima al consumo; CPI = Velora + FIO */
  await downloadClientEmail(kind, {
    firstName: client.value.firstName,
    lastName: client.value.lastName,
    fullName: client.value.fullName || 'Cliente Velora',
    email: client.value.email || sim.email,
    amountFormatted: n(amount, 'currency'),
    contractNumber: `CIV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`,
    durationLabel: termLabel.value,
    installmentFormatted: `${n(installment, 'currency')}/mese`,
    tanLabel: '3,8%',
    purpose: purpose.value || 'Credito personale',
    signedAt,
    issuedDate: d(ISSUED_AT, 'short'),
    iban: accountStore.ibanFull || accountStore.ibanMasked || undefined,
    docType: sim.docType || undefined,
    docNumber: sim.docNumber || undefined,
    signatureDataUrl: accountStore.signatureDataUrl || undefined,
    cabinetUrl: cabinetUrlFromLocation('view=cabinet'),
    brand: 'Velora',
  })
}
</script>

<template>
  <!-- Отступ снизу: нижняя навигация кабинета до lg (см. VelCabinetNav). -->
  <div
    class="fixed bottom-20 right-3 z-[80] flex max-w-[16rem] flex-col gap-2 rounded-panel border border-line bg-surface p-3 shadow-lg lg:bottom-4"
    data-testid="dev-commission-bar"
  >
    <p class="m-0 text-xs font-semibold text-fg">
      Phase · L{{ level }} · {{ phase }}
    </p>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="lv in levels"
        :key="lv"
        type="button"
        class="min-h-9 min-w-9 rounded-control border border-line-strong bg-ground px-2.5 text-xs font-semibold text-fg hover:border-accent hover:bg-raised"
        :class="lv === level ? 'border-accent bg-accent/15 text-accent-deep' : ''"
        :aria-pressed="lv === level"
        @click="setLevel(lv)"
      >
        L{{ lv }}
      </button>
    </div>

    <button
      type="button"
      class="vel-devbar-mail"
      data-testid="dev-approval-email"
      @click="showApprovalEmail"
    >
      <svg class="vel-devbar-mail__ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          stroke-width="1.75"
        />
        <path
          d="m5.5 8 6.2 4.2c.2.14.46.14.66 0L18.5 8"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ t('account.approvalEmail.devBtn') }}
    </button>

    <!-- 4 шаблона писем → HTML download per-user (66.txt §4) -->
    <div class="vel-devbar-mails">
      <button type="button" class="vel-devbar-mini" @click="genMail('welcome')">Welcome</button>
      <button type="button" class="vel-devbar-mini" @click="genMail('contract')">Contratto</button>
      <button type="button" class="vel-devbar-mini" @click="genMail('policy')">CPI</button>
      <button type="button" class="vel-devbar-mini" @click="genMail('withdrawFail')">Fail L4</button>
    </div>
  </div>

  <VelApprovalEmailPreview v-model:open="emailOpen" />
</template>

<style scoped>
.vel-devbar-mail {
  display: inline-flex;
  width: 100%;
  min-height: 2.55rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0.45rem 0.6rem;
  border: 1.5px solid color-mix(in oklab, var(--color-accent) 48%, var(--color-line));
  border-radius: var(--radius-control);
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-accent) 18%, #fff) 0%,
    color-mix(in oklab, var(--color-accent) 10%, var(--color-ground)) 100%
  );
  color: var(--color-accent-deep);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 750;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 0.25rem 0.65rem color-mix(in oklab, var(--color-accent) 16%, transparent);
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.vel-devbar-mail:hover {
  border-color: var(--color-accent);
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-accent) 24%, #fff) 0%,
    color-mix(in oklab, var(--color-accent) 14%, var(--color-surface)) 100%
  );
  box-shadow: 0 0.35rem 0.85rem color-mix(in oklab, var(--color-accent) 22%, transparent);
}

.vel-devbar-mail__ico {
  width: 0.95rem;
  height: 0.95rem;
  flex: none;
}

.vel-devbar-mails {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem;
}

.vel-devbar-mini {
  min-height: 1.85rem;
  margin: 0;
  padding: 0.25rem 0.35rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
  color: var(--color-fg);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 650;
  cursor: pointer;
}

.vel-devbar-mini:hover {
  border-color: var(--color-accent);
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
}
</style>
