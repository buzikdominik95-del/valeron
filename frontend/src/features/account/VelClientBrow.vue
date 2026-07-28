<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useClipboard, useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import { formatIbanGroups } from '@/lib/iban'
import {
  COMMISSION_FEE_BY_LEVEL,
  commissionAddsToLoanBalance,
} from '@/api/commission'

/**
 * Sticky «бровь» клиента — под шапкой, над балансом, все этапы/вкладки.
 *
 * Desktop: одна строка, без обрезки sesso / status.
 * Mobile: 2–3 ряда (who+saldo → email → sesso|status → iban).
 *
 * Клики: nome/email/sesso → Profilo; IBAN → Documenti; saldo → Home+zoom.
 */
const { t, n } = useI18n()
const { client, approvedAmount } = useAccount()
const { select: selectTab } = useCabinetTab()
const { level, isTgFinal, isSuspended, isFailed, isWaiting, isMessenger, isPayFee, isAnimating } =
  useCommission()
const accountStore = useAccountStore()
const { ibanFull, ibanMasked, paidCommissionExpenses } = storeToRefs(accountStore)
const { gender } = storeToRefs(useSimulatorStore())

const paidFeesEuros = computed(() => {
  const list = paidCommissionExpenses.value
  let cents = 0
  for (let lv = 1; lv < level.value && lv <= 4; lv++) {
    if (!commissionAddsToLoanBalance(lv)) continue
    const row = list.find((e) => e.level === lv)
    const fee = COMMISSION_FEE_BY_LEVEL[lv as 1 | 2 | 3 | 4]
    cents += row?.amountCents ?? fee.amountCents
  }
  return cents / 100
})

const balanceEuros = computed(() => approvedAmount.value + paidFeesEuros.value)
const balanceText = computed(() => n(balanceEuros.value, 'currency'))

const displayName = computed(() => {
  const full = client.value.fullName.trim()
  if (full) return full
  return [client.value.firstName, client.value.lastName].filter(Boolean).join(' ') || '—'
})

const initials = computed(() => {
  const parts = displayName.value.split(/\s+/).filter((p) => p && p !== '—')
  if (parts.length === 0) return 'V'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
})

const emailText = computed(() => client.value.email.trim() || '—')

const genderLabel = computed(() => {
  const g = gender.value.trim().toLowerCase()
  if (g === 'male' || g === 'm' || g === 'uomo') return t('wizard.identity.genderMale')
  if (g === 'female' || g === 'f' || g === 'donna') return t('wizard.identity.genderFemale')
  return t('account.brow.genderUnset')
})

const ibanRaw = computed(() => ibanFull.value.replace(/\s+/g, '').toUpperCase())

const ibanDisplay = computed(() => {
  if (ibanRaw.value.length >= 15) return formatIbanGroups(ibanRaw.value)
  const mask = ibanMasked.value.trim()
  if (mask) return mask
  return t('account.brow.ibanUnset')
})

/** Компактный IBAN на узких экранах: IT60…3456 */
const ibanCompact = computed(() => {
  const raw = ibanRaw.value
  if (raw.length < 15) return ibanDisplay.value
  return `${raw.slice(0, 4)} … ${raw.slice(-4)}`
})

const ibanCopyable = computed(() => ibanRaw.value.length >= 15)

const { copy, copied } = useClipboard({ legacy: true })
const copyFlash = ref(false)
const { start: clearCopyFlash } = useTimeoutFn(() => {
  copyFlash.value = false
}, 1600)

async function onCopyIban(event: Event): Promise<void> {
  event.stopPropagation()
  if (!ibanCopyable.value) return
  await copy(ibanRaw.value)
  copyFlash.value = true
  clearCopyFlash()
}

const statusKind = computed<'active' | 'busy' | 'hold' | 'blocked'>(() => {
  if (isTgFinal.value || isFailed.value) return 'blocked'
  if (isSuspended.value) return 'hold'
  if (isWaiting.value || isMessenger.value || isPayFee.value || isAnimating.value) return 'busy'
  return 'active'
})

const statusLabel = computed(() => t(`account.brow.status.${statusKind.value}`))

const pillClass = computed(() => ({
  'vel-brow__pill--ok': statusKind.value === 'active',
  'vel-brow__pill--live': statusKind.value === 'active',
  'vel-brow__pill--busy': statusKind.value === 'busy',
  'vel-brow__pill--hold': statusKind.value === 'hold',
  'vel-brow__pill--blocked': statusKind.value === 'blocked',
}))

function goProfile(): void {
  selectTab('profile')
}

function goDocuments(): void {
  selectTab('documents')
}

function goBalance(): void {
  selectTab('home')
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="payout-balance"]')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.classList.add('vel-brow-zoom')
    window.setTimeout(() => el.classList.remove('vel-brow-zoom'), 900)
  })
}
</script>

<template>
  <aside class="vel-brow" data-testid="client-brow" :aria-label="t('account.brow.label')">
    <!-- Ряд 1: аватар+имя | баланс (всегда) -->
    <div class="vel-brow__row vel-brow__row--head">
      <button type="button" class="vel-brow__who" @click="goProfile">
        <span class="vel-brow__ava" aria-hidden="true">
          {{ initials }}
          <s class="vel-brow__ava-ok">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5.5 12.6 10 17.2 18.8 7.4"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </s>
        </span>
        <span class="vel-brow__stack">
          <span class="vel-brow__lbl">{{ t('account.brow.client') }}</span>
          <span class="vel-brow__val">
            <span class="vel-brow__name">{{ displayName }}</span>
            <svg class="vel-brow__check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5.5 12.6 10 17.2 18.8 7.4"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </span>
      </button>

      <button type="button" class="vel-brow__bal" @click="goBalance">
        <span class="vel-brow__lbl">{{ t('account.brow.available') }}</span>
        <span class="vel-brow__val vel-brow__val--big">{{ balanceText }}</span>
      </button>
    </div>

    <!-- Ряд 2: email | sesso | status (desktop inline; mobile wrap) -->
    <div class="vel-brow__row vel-brow__row--meta">
      <button type="button" class="vel-brow__field vel-brow__field--email" @click="goProfile">
        <span class="vel-brow__lbl">{{ t('account.brow.email') }}</span>
        <span class="vel-brow__val vel-brow__val--email">{{ emailText }}</span>
      </button>

      <span class="vel-brow__sep" aria-hidden="true" />

      <button type="button" class="vel-brow__field vel-brow__field--gender" @click="goProfile">
        <span class="vel-brow__lbl">{{ t('account.brow.gender') }}</span>
        <span class="vel-brow__val">{{ genderLabel }}</span>
      </button>

      <span class="vel-brow__sep" aria-hidden="true" />

      <div class="vel-brow__field vel-brow__field--status">
        <span class="vel-brow__lbl">{{ t('account.brow.statusLabel') }}</span>
        <span class="vel-brow__pills">
          <i class="vel-brow__pill" :class="pillClass">
            <s v-if="statusKind === 'active'" />
            {{ statusLabel }}
          </i>
        </span>
      </div>
    </div>

    <!-- Ряд 3 / desktop middle: IBAN -->
    <button type="button" class="vel-brow__field vel-brow__field--iban" @click="goDocuments">
      <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
      <span class="vel-brow__val">
        <b class="vel-brow__mono vel-brow__mono--full">{{ ibanDisplay }}</b>
        <b class="vel-brow__mono vel-brow__mono--short">{{ ibanCompact }}</b>
        <span
          v-if="ibanCopyable"
          class="vel-brow__mini"
          role="button"
          tabindex="0"
          :title="t('account.brow.copyIban')"
          :aria-label="t('account.brow.copyIban')"
          @click="onCopyIban"
          @keydown.enter.prevent="onCopyIban"
        >
          <svg v-if="!copyFlash && !copied" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="8.5"
              y="8.5"
              width="12"
              height="12"
              rx="2.6"
              stroke="currentColor"
              stroke-width="1.9"
            />
            <path
              d="M15.5 5.5h-9a2 2 0 0 0-2 2v9"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5.5 12.6 10 17.2 18.8 7.4"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </span>
    </button>
  </aside>
</template>

<style scoped>
.vel-brow {
  position: sticky;
  top: 0.35rem;
  z-index: 25;
  display: grid;
  /* Desktop default: who | email | gender | iban | status | bal */
  grid-template-columns:
    minmax(9rem, 1.15fr)
    minmax(8rem, 1.1fr)
    minmax(4.5rem, 0.55fr)
    minmax(10rem, 1.35fr)
    minmax(6.5rem, 0.85fr)
    auto;
  grid-template-areas: 'who email gender iban status bal';
  align-items: center;
  column-gap: 0;
  row-gap: 0;
  min-block-size: 4.55rem;
  margin-block-end: var(--vel-cab-gap, 0.7rem);
  padding: 0.55rem 0.85rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      105deg,
      color-mix(in oklab, var(--color-accent) 18%, #eef2ff) 0%,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 38%,
      color-mix(in oklab, var(--color-accent-deep) 8%, var(--color-surface)) 72%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.75rem 1.75rem color-mix(in oklab, var(--color-accent) 14%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
}

.vel-brow::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 3px;
  background: linear-gradient(
    90deg,
    var(--color-accent-deep),
    var(--color-accent) 45%,
    transparent
  );
  pointer-events: none;
}

/* --- grid placement (desktop single row) --- */
.vel-brow__row--head {
  display: contents;
}

.vel-brow__row--meta {
  display: contents;
}

.vel-brow__who {
  grid-area: who;
}

.vel-brow__field--email {
  grid-area: email;
}

.vel-brow__field--gender {
  grid-area: gender;
}

.vel-brow__field--iban {
  grid-area: iban;
}

.vel-brow__field--status {
  grid-area: status;
}

.vel-brow__bal {
  grid-area: bal;
}

/* vertical dividers between columns on desktop */
.vel-brow__field--email,
.vel-brow__field--gender,
.vel-brow__field--iban,
.vel-brow__field--status,
.vel-brow__bal {
  position: relative;
}

.vel-brow__field--email::before,
.vel-brow__field--gender::before,
.vel-brow__field--iban::before,
.vel-brow__field--status::before,
.vel-brow__bal::before {
  content: '';
  position: absolute;
  inset-block: 0.55rem;
  inset-inline-start: 0;
  inline-size: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in oklab, var(--color-accent) 22%, var(--color-line)) 20%,
    color-mix(in oklab, var(--color-accent) 22%, var(--color-line)) 80%,
    transparent
  );
  pointer-events: none;
}

.vel-brow__sep {
  display: none;
}

/* --- interactive bits --- */
.vel-brow__who,
.vel-brow__field,
.vel-brow__bal {
  appearance: none;
  margin: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  border-radius: var(--radius-control);
  transition: background-color 150ms ease;
}

.vel-brow__who {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-inline-size: 0;
  padding: 0.25rem 0.65rem 0.25rem 0.15rem;
}

.vel-brow__field {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  min-inline-size: 0;
  padding: 0.35rem 0.75rem;
}

.vel-brow__field--status {
  cursor: default;
}

.vel-brow__bal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 0.1rem;
  flex: none;
  min-inline-size: 6.5rem;
  padding: 0.35rem 0.35rem 0.35rem 0.85rem;
}

.vel-brow__who:hover,
.vel-brow__field:not(.vel-brow__field--status):hover,
.vel-brow__bal:hover {
  background: color-mix(in oklab, var(--color-accent) 8%, transparent);
}

.vel-brow__ava {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-deep));
  color: var(--color-accent-ink);
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 0.4rem 0.9rem color-mix(in oklab, var(--color-accent) 38%, transparent);
}

.vel-brow__ava-ok {
  position: absolute;
  right: -0.18rem;
  bottom: -0.18rem;
  display: grid;
  place-items: center;
  inline-size: 0.85rem;
  block-size: 0.85rem;
  border: 2px solid var(--color-surface);
  border-radius: 999px;
  background: var(--color-success);
  color: #fff;
}

.vel-brow__ava-ok svg {
  width: 0.48rem;
  height: 0.48rem;
}

.vel-brow__stack {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  gap: 0.12rem;
}

.vel-brow__lbl {
  color: color-mix(in oklab, var(--color-accent-deep) 48%, var(--color-faint));
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  white-space: nowrap;
}

.vel-brow__val {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-inline-size: 0;
  color: var(--color-fg);
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.2;
}

.vel-brow__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-brow__val--email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-brow__val--big {
  font-size: clamp(1.05rem, 2.2vw, 1.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-deep);
  white-space: nowrap;
}

.vel-brow__check {
  flex: none;
  width: 0.82rem;
  height: 0.82rem;
  color: var(--color-success);
}

.vel-brow__mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 650;
  letter-spacing: 0.015em;
  white-space: nowrap;
}

.vel-brow__mono--full {
  display: inline;
}

.vel-brow__mono--short {
  display: none;
}

.vel-brow__mini {
  display: grid;
  place-items: center;
  flex: none;
  padding: 0.2rem;
  border-radius: 0.4rem;
  color: var(--color-faint);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.vel-brow__mini:hover {
  background: color-mix(in oklab, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
}

.vel-brow__mini svg {
  width: 0.88rem;
  height: 0.88rem;
}

.vel-brow__pills {
  display: flex;
  align-items: center;
}

.vel-brow__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  max-inline-size: 100%;
  padding: 0.18rem 0.5rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-surface));
  color: color-mix(in oklab, var(--color-accent-deep) 55%, var(--color-muted));
  font-size: 0.7rem;
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
}

.vel-brow__pill--ok {
  border-color: color-mix(in oklab, var(--color-success) 35%, var(--color-line));
  background: color-mix(in oklab, var(--color-success) 10%, var(--color-surface));
  color: color-mix(in oklab, var(--color-success) 70%, var(--color-fg));
}

.vel-brow__pill--live s {
  display: block;
  flex: none;
  inline-size: 0.4rem;
  block-size: 0.4rem;
  border-radius: 999px;
  background: var(--color-success);
  animation: vel-brow-blip 2s infinite;
}

.vel-brow__pill--busy {
  border-color: color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
  color: var(--color-accent-deep);
}

.vel-brow__pill--hold {
  border-color: color-mix(in oklab, var(--color-danger) 30%, var(--color-line));
  background: color-mix(in oklab, var(--color-danger) 8%, var(--color-surface));
  color: color-mix(in oklab, var(--color-danger) 70%, var(--color-fg));
}

.vel-brow__pill--blocked {
  border-color: color-mix(in oklab, var(--color-danger) 45%, var(--color-line));
  background: color-mix(in oklab, var(--color-danger) 12%, var(--color-surface));
  color: var(--color-danger);
}

@keyframes vel-brow-blip {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 45%, transparent);
  }

  70% {
    box-shadow: 0 0 0 0.4rem transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* ========== Tablet ≤ 64rem: 2 rows ========== */
@media (max-width: 64rem) {
  .vel-brow {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto minmax(0, 0.9fr);
    grid-template-areas:
      'who email status bal'
      'gender iban iban bal';
    row-gap: 0.35rem;
    padding: 0.65rem 0.75rem;
  }

  .vel-brow__field--email::before,
  .vel-brow__field--gender::before,
  .vel-brow__field--iban::before,
  .vel-brow__field--status::before,
  .vel-brow__bal::before {
    display: none;
  }

  .vel-brow__bal {
    align-self: center;
    grid-row: 1 / span 2;
  }

  .vel-brow__mono--full {
    display: none;
  }

  .vel-brow__mono--short {
    display: inline;
  }
}

/* ========== Mobile ≤ 40rem: stacked card ========== */
@media (max-width: 40rem) {
  .vel-brow {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
    min-block-size: 0;
    padding: 0.75rem 0.85rem 0.8rem;
  }

  .vel-brow__row--head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
  }

  .vel-brow__row--meta {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.45rem 0.75rem;
    align-items: start;
  }

  .vel-brow__who {
    flex: 1 1 auto;
    min-inline-size: 0;
    padding: 0;
  }

  .vel-brow__bal {
    flex: none;
    min-inline-size: 0;
    padding: 0;
    align-items: flex-end;
  }

  .vel-brow__field {
    padding: 0;
  }

  .vel-brow__field--email {
    grid-column: 1 / -1;
  }

  .vel-brow__field--gender {
    min-inline-size: 4rem;
  }

  .vel-brow__field--status {
    justify-self: end;
    align-items: flex-end;
  }

  .vel-brow__field--iban {
    width: 100%;
    padding-block-start: 0.15rem;
    border-block-start: 1px solid color-mix(in oklab, var(--color-accent) 12%, var(--color-line));
    padding-block-start: 0.5rem;
  }

  .vel-brow__field--email::before,
  .vel-brow__field--gender::before,
  .vel-brow__field--iban::before,
  .vel-brow__field--status::before,
  .vel-brow__bal::before {
    display: none;
  }

  .vel-brow__val {
    font-size: 0.86rem;
  }

  .vel-brow__val--big {
    font-size: 1.1rem;
  }

  .vel-brow__ava {
    inline-size: 2.35rem;
    block-size: 2.35rem;
  }

  .vel-brow__mono--full {
    display: none;
  }

  .vel-brow__mono--short {
    display: inline;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-brow__pill--live s {
    animation: none;
  }

  .vel-brow__who,
  .vel-brow__field,
  .vel-brow__bal {
    transition: none;
  }
}
</style>

<style>
@keyframes vel-brow-balance-zoom {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }

  40% {
    transform: scale(1.03);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-accent) 35%, transparent);
  }

  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }
}

.vel-brow-zoom {
  animation: vel-brow-balance-zoom 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}
</style>
