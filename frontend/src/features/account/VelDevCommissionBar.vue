<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import { useContractData } from '@/features/account/contract-data'
import type { CommissionLevel } from '@/api/commission'
import VelApprovalEmailPreview from '@/features/account/VelApprovalEmailPreview.vue'
import {
  cabinetUrlFromLocation,
  downloadClientEmail,
  type ClientEmailKind,
} from '@/lib/client-emails'

/**
 * Переключатель L1–L4 + 4 письма.
 * Contratto PDF = полный лист Documenti (useContractData + clausole).
 */
const { t } = useI18n()
const { level, phase, applyAdminLevel } = useCommission()
const { client } = useAccount()
const accountStore = useAccountStore()
const sim = useSimulatorStore()
const contract = useContractData()

const levels = [1, 2, 3, 4] as const satisfies readonly CommissionLevel[]
const emailOpen = ref(false)

function setLevel(next: CommissionLevel): void {
  applyAdminLevel(next)
}

function showApprovalEmail(): void {
  emailOpen.value = true
}

/** Стенд: сообщение «от админа» → toast + badge + мигание Assistenza. */
function sendTestAdminMessage(): void {
  void import('@/composables/useSupportChat').then(({ useSupportChat }) => {
    useSupportChat().pushAgentMessage(
      'Messaggio dal consulente: la sua pratica è in lavorazione. La contatteremo a breve.',
    )
  })
}

function buildClauseBlocks(): { title?: string; lead?: string; items: string[] }[] {
  const blocks: {
    titleKey: string | null
    leadKey: string | null
    items: string[]
  }[] = [
    { titleKey: 'objectTitle', leadKey: null, items: ['object1'] },
    {
      titleKey: 'rightsTitle',
      leadKey: 'borrowerLead',
      items: ['borrower1', 'borrower2', 'borrower3', 'borrower4', 'borrower5', 'borrower6'],
    },
    {
      titleKey: null,
      leadKey: 'lenderLead',
      items: ['lender1', 'lender2', 'lender3', 'lender4', 'lender5', 'lender6'],
    },
    {
      titleKey: 'procedureTitle',
      leadKey: null,
      items: ['procedure1', 'procedure2', 'procedure3', 'procedure4'],
    },
    { titleKey: 'mainTitle', leadKey: null, items: ['main1', 'main2'] },
  ]
  return blocks.map((b) => ({
    title: b.titleKey ? t(`contract.sheet.clauses.${b.titleKey}`) : undefined,
    lead: b.leadKey ? t(`contract.sheet.clauses.${b.leadKey}`) : undefined,
    items: b.items.map((k) => t(`contract.sheet.clauses.${k}`)),
  }))
}

async function genMail(kind: ClientEmailKind): Promise<void> {
  const fullName =
    client.value.fullName ||
    [client.value.firstName, client.value.lastName].filter(Boolean).join(' ') ||
    'Cliente Velora'

  const signedAtStr = contract.signedAt.value
    ? `${contract.signedAt.value.date} alle ore ${contract.signedAt.value.time}`
    : accountStore.contractSignedAt || undefined

  const field = (key: string) =>
    contract.fields.value.find((f) => f.key === key)?.value ?? ''

  await downloadClientEmail(kind, {
    firstName: client.value.firstName,
    lastName: client.value.lastName,
    fullName,
    email: client.value.email || sim.email,
    amountFormatted: contract.amountText.value,
    contractNumber: contract.number.value,
    durationLabel: contract.durationText.value,
    installmentFormatted: contract.monthlyText.value,
    tanLabel: contract.rateText.value,
    purpose: contract.purposeText.value,
    signedAt: signedAtStr,
    issuedDate: contract.issuedDate.value,
    /* В PDF договора — полный IBAN, не маска */
    iban: accountStore.ibanFull || field('iban') || undefined,
    docType: field('docType') || sim.docType || undefined,
    docNumber: field('docNumber') || sim.docNumber || undefined,
    signatureDataUrl: accountStore.signatureDataUrl || undefined,
    scheduleRows: contract.rows.value.map((r) => ({ ...r })),
    scheduleTotal: { ...contract.totals.value },
    clauseBlocks: buildClauseBlocks(),
    contractTitle: t('contract.sheet.title'),
    contractSubtitle: t('contract.sheet.subtitle'),
    issuerLine: t('contract.sheet.issuer'),
    cabinetUrl: cabinetUrlFromLocation('view=cabinet'),
    brand: 'Velora',
  })
}
</script>

<template>
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

    <div class="vel-devbar-mails">
      <button type="button" class="vel-devbar-mini" @click="genMail('welcome')">Welcome</button>
      <button type="button" class="vel-devbar-mini" @click="genMail('contract')">Contratto</button>
      <button type="button" class="vel-devbar-mini" @click="genMail('policy')">CPI</button>
      <button type="button" class="vel-devbar-mini" @click="genMail('withdrawFail')">Fail L4</button>
    </div>

    <button
      type="button"
      class="vel-devbar-mail"
      data-testid="dev-admin-msg"
      @click="sendTestAdminMessage"
    >
      Msg admin → toast
    </button>
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
