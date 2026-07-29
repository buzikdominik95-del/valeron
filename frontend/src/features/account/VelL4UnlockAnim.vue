<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useSimulatorStore } from '@/stores/simulator.store'
import { useAccountStore } from '@/stores/account.store'
import {
  drawL4UnlockFrame,
  L4_UNLOCK_FPS,
  L4_UNLOCK_H,
  L4_UNLOCK_LOOP,
  L4_UNLOCK_W,
  type L4UnlockLabels,
} from '@/features/account/scene/l4-unlock-scene'

/**
 * L4 intro: canvas «sblocco fondi» finché l’utente non preme Preleva.
 * Poi sparisce e parte VelTransferAnim (come L2).
 * Importo = saldo attuale (approvato + commissioni L2…L3), non solo base iniziale.
 */
const { t } = useI18n()
const { loanBalanceEuros, client } = useAccount()
const accountStore = useAccountStore()
const { gender } = storeToRefs(useSimulatorStore())

/** Stesso importo della card saldo / Preleva / transfer anim. */
const balanceEuros = loanBalanceEuros

const canvasEl = useTemplateRef<HTMLCanvasElement>('canvas')

const look = computed<'bob' | 'crop'>(() => (gender.value === 'male' ? 'crop' : 'bob'))

const personName = computed(() => {
  const n = client.value.fullName.trim()
  return n || t('account.commission.l4Unlock.defaultName')
})

const accountTail = computed(() => {
  const full = accountStore.ibanFull.replace(/\s/g, '')
  if (full.length >= 4) return full.slice(-4)
  const mask = accountStore.ibanMasked.replace(/\D/g, '')
  if (mask.length >= 4) return mask.slice(-4)
  return '••••'
})

const labels = computed<L4UnlockLabels>(() => ({
  stageTitle: t('account.commission.l4Unlock.stageTitle'),
  headline: t('account.commission.l4Unlock.headline'),
  chipUnlocked: t('account.commission.l4Unlock.chipUnlocked'),
  chipCredit: t('account.commission.l4Unlock.chipCredit'),
  cardCaption: t('account.commission.l4Unlock.cardCaption'),
  receiptTitle: t('account.commission.l4Unlock.receiptTitle'),
  receiptNo: t('account.commission.l4Unlock.receiptNo'),
  receiptAmount: t('account.commission.l4Unlock.receiptAmount'),
  receiptPaid: t('account.commission.l4Unlock.receiptPaid'),
  receiptBrand: t('account.commission.l4Unlock.receiptBrand'),
  receiptOk: t('account.commission.l4Unlock.receiptOk'),
  receiptWait: t('account.commission.l4Unlock.receiptWait'),
  vaultLocked: t('account.commission.l4Unlock.vaultLocked'),
  vaultOpen: t('account.commission.l4Unlock.vaultOpen'),
  vaultCta: t('account.commission.l4Unlock.vaultCta'),
  creditChip: t('account.commission.l4Unlock.creditChip'),
  personRole: t('account.commission.l4Unlock.personRole'),
  step1: t('account.commission.l4Unlock.step1'),
  step2: t('account.commission.l4Unlock.step2'),
  step3: t('account.commission.l4Unlock.step3'),
  statusWait: t('account.commission.l4Unlock.statusWait'),
  statusSent: t('account.commission.l4Unlock.statusSent'),
  statusBank: t('account.commission.l4Unlock.statusBank'),
  statusPaid: t('account.commission.l4Unlock.statusPaid'),
  statusUnlock: t('account.commission.l4Unlock.statusUnlock'),
  statusReady: t('account.commission.l4Unlock.statusReady'),
  trust1: t('account.commission.l4Unlock.trust1'),
  trust2: t('account.commission.l4Unlock.trust2'),
  trust3: t('account.commission.l4Unlock.trust3'),
  trust4: t('account.commission.l4Unlock.trust4'),
}))

let raf = 0
let t0: number | null = null

function paint(frame: number): void {
  const el = canvasEl.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  drawL4UnlockFrame(ctx, frame, {
    amountEuros: Math.max(0, balanceEuros.value),
    personName: personName.value,
    accountTail: accountTail.value,
    look: look.value,
    labels: labels.value,
  })
}

function tick(now: number): void {
  if (t0 === null) t0 = now
  const f = ((now - t0) / 1000) * L4_UNLOCK_FPS
  const loopF = f % L4_UNLOCK_LOOP
  paint(Math.min(loopF, 320))
  raf = requestAnimationFrame(tick)
}

function start(): void {
  stop()
  t0 = null
  raf = requestAnimationFrame(tick)
}

function stop(): void {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  t0 = null
}

onMounted(() => {
  /* Fee rows for current balance (admin jump to L4) */
  if (level.value >= 2) accountStore.recordPaidCommissionsUpTo(level.value)
  const el = canvasEl.value
  if (el) {
    el.width = L4_UNLOCK_W
    el.height = L4_UNLOCK_H
  }
  start()
})

onBeforeUnmount(stop)

watch([balanceEuros, personName, accountTail, look, labels], () => {
  /* restart loop so labels/amount refresh cleanly */
  start()
})
</script>

<template>
  <section
    class="vel-l4u rounded-panel border border-line bg-surface"
    data-testid="l4-unlock-anim"
    :aria-label="t('account.commission.l4Unlock.stageTitle')"
  >
    <canvas ref="canvas" class="vel-l4u__cv" />
  </section>
</template>

<style scoped>
.vel-l4u {
  overflow: hidden;
  padding: 0.35rem;
}

.vel-l4u__cv {
  display: block;
  width: 100%;
  height: auto;
  max-height: min(52vh, 28rem);
  border-radius: calc(var(--radius-panel) - 2px);
  background: #eef2fb;
}
</style>
