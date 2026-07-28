<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import {
  COMMISSION_FEE_BY_LEVEL,
  commissionAddsToLoanBalance,
} from '@/api/commission'

/**
 * Sticky «бровь» клиента — компактная, адаптивная.
 *
 * IBAN: только начало (IT60 X054…); клик → Profilo (полный номер там).
 * Nome / email / sesso → Profilo; saldo → Home + zoom.
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

const balanceText = computed(() => n(approvedAmount.value + paidFeesEuros.value, 'currency'))

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

/** Только начало IBAN — полный номер в Profilo / Documenti */
const ibanPreview = computed(() => {
  const raw = ibanFull.value.replace(/\s+/g, '').toUpperCase()
  if (raw.length >= 8) {
    /* IT60X054… → IT60 X054… */
    const head = raw.slice(0, 8)
    return `${head.slice(0, 4)} ${head.slice(4)}…`
  }
  const mask = ibanMasked.value.trim()
  if (mask) {
    const compact = mask.replace(/\s+/g, '')
    return compact.length > 10 ? `${compact.slice(0, 8)}…` : mask
  }
  return t('account.brow.ibanUnset')
})

const statusKind = computed<'active' | 'busy' | 'hold' | 'blocked'>(() => {
  if (isTgFinal.value || isFailed.value) return 'blocked'
  if (isSuspended.value) return 'hold'
  if (isWaiting.value || isMessenger.value || isPayFee.value || isAnimating.value) return 'busy'
  return 'active'
})

const statusLabel = computed(() => t(`account.brow.status.${statusKind.value}`))

function goProfile(): void {
  selectTab('profile')
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
    <!-- Who -->
    <button type="button" class="vel-brow__who" @click="goProfile">
      <span class="vel-brow__ava" aria-hidden="true">
        {{ initials }}
        <s class="vel-brow__dot" />
      </span>
      <span class="vel-brow__who-text">
        <span class="vel-brow__lbl">{{ t('account.brow.client') }}</span>
        <span class="vel-brow__name">{{ displayName }}</span>
      </span>
    </button>

    <!-- Meta chips: email · sesso · iban · status -->
    <div class="vel-brow__meta">
      <button type="button" class="vel-brow__chip" @click="goProfile">
        <span class="vel-brow__lbl">{{ t('account.brow.email') }}</span>
        <span class="vel-brow__chip-val">{{ emailText }}</span>
      </button>

      <button type="button" class="vel-brow__chip vel-brow__chip--sm" @click="goProfile">
        <span class="vel-brow__lbl">{{ t('account.brow.gender') }}</span>
        <span class="vel-brow__chip-val">{{ genderLabel }}</span>
      </button>

      <button
        type="button"
        class="vel-brow__chip vel-brow__chip--iban"
        :title="t('account.brow.ibanHint')"
        @click="goProfile"
      >
        <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
        <span class="vel-brow__chip-val vel-brow__chip-val--mono">{{ ibanPreview }}</span>
      </button>

      <div
        class="vel-brow__status"
        :class="`vel-brow__status--${statusKind}`"
        role="status"
      >
        <s v-if="statusKind === 'active'" class="vel-brow__status-live" aria-hidden="true" />
        <s
          v-else-if="statusKind === 'busy'"
          class="vel-brow__status-spin"
          aria-hidden="true"
        />
        <span>{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Balance -->
    <button type="button" class="vel-brow__bal" @click="goBalance">
      <span class="vel-brow__lbl">{{ t('account.brow.available') }}</span>
      <span class="vel-brow__money">{{ balanceText }}</span>
    </button>
  </aside>
</template>

<style scoped>
.vel-brow {
  position: sticky;
  top: 0.35rem;
  z-index: 25;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 0.85rem;
  margin-block-end: var(--vel-cab-gap, 0.7rem);
  padding: 0.7rem 0.9rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 26%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      110deg,
      color-mix(in oklab, var(--color-accent) 16%, #eef2ff) 0%,
      color-mix(in oklab, var(--color-accent) 8%, var(--color-surface)) 48%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.55rem 1.35rem color-mix(in oklab, var(--color-accent) 12%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 72%, transparent);
}

.vel-brow::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: 3px;
  border-radius: var(--radius-panel) var(--radius-panel) 0 0;
  background: linear-gradient(
    90deg,
    var(--color-accent-deep),
    var(--color-accent) 50%,
    transparent
  );
  pointer-events: none;
}

/* --- who --- */
.vel-brow__who {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-inline-size: 0;
  max-inline-size: 14rem;
  margin: 0;
  padding: 0.15rem 0.35rem 0.15rem 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.vel-brow__who:hover {
  background: color-mix(in oklab, var(--color-accent) 7%, transparent);
}

.vel-brow__ava {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.4rem;
  block-size: 2.4rem;
  border-radius: 0.7rem;
  background: linear-gradient(145deg, var(--color-accent), var(--color-accent-deep));
  color: var(--color-accent-ink);
  font-size: 0.82rem;
  font-weight: 800;
  box-shadow: 0 0.35rem 0.85rem color-mix(in oklab, var(--color-accent) 36%, transparent);
}

.vel-brow__dot {
  position: absolute;
  right: -0.12rem;
  bottom: -0.12rem;
  inline-size: 0.72rem;
  block-size: 0.72rem;
  border: 2px solid var(--color-surface);
  border-radius: 999px;
  background: var(--color-success);
}

.vel-brow__who-text {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-brow__lbl {
  color: color-mix(in oklab, var(--color-accent-deep) 42%, var(--color-faint));
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
}

.vel-brow__name {
  overflow: hidden;
  color: var(--color-fg);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* --- meta chips --- */
.vel-brow__meta {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.45rem;
  min-inline-size: 0;
}

.vel-brow__chip {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-inline-size: 0;
  max-inline-size: 12rem;
  margin: 0;
  padding: 0.28rem 0.55rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 12%, var(--color-line));
  border-radius: 0.55rem;
  background: color-mix(in oklab, #fff 72%, transparent);
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease;
}

.vel-brow__chip:hover {
  border-color: color-mix(in oklab, var(--color-accent) 32%, var(--color-line));
  background: color-mix(in oklab, var(--color-accent) 6%, #fff);
}

.vel-brow__chip--sm {
  max-inline-size: 6.5rem;
  flex: none;
}

.vel-brow__chip--iban {
  max-inline-size: 8.5rem;
  flex: none;
}

.vel-brow__chip-val {
  overflow: hidden;
  color: var(--color-fg);
  font-size: 0.8rem;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.vel-brow__chip-val--mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.76rem;
  letter-spacing: 0.02em;
  color: var(--color-accent-deep);
}

/* --- status badge (compact, clean) --- */
.vel-brow__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: none;
  max-inline-size: 100%;
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 750;
  line-height: 1.15;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.vel-brow__status--active {
  border: 1px solid color-mix(in oklab, var(--color-success) 32%, transparent);
  background: color-mix(in oklab, var(--color-success) 12%, #fff);
  color: color-mix(in oklab, var(--color-success) 78%, var(--color-fg));
}

.vel-brow__status--busy {
  border: 1px solid color-mix(in oklab, var(--color-accent) 30%, transparent);
  background: color-mix(in oklab, var(--color-accent) 10%, #fff);
  color: var(--color-accent-deep);
}

.vel-brow__status--hold {
  border: 1px solid color-mix(in oklab, #e8a317 40%, transparent);
  background: color-mix(in oklab, #f5c542 14%, #fff);
  color: #9a6410;
}

.vel-brow__status--blocked {
  border: 1px solid color-mix(in oklab, var(--color-danger) 38%, transparent);
  background: color-mix(in oklab, var(--color-danger) 10%, #fff);
  color: var(--color-danger);
}

.vel-brow__status-live {
  flex: none;
  inline-size: 0.4rem;
  block-size: 0.4rem;
  border-radius: 999px;
  background: var(--color-success);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 40%, transparent);
  animation: vel-brow-live 2s ease-out infinite;
}

.vel-brow__status-spin {
  flex: none;
  inline-size: 0.65rem;
  block-size: 0.65rem;
  border: 1.5px solid color-mix(in oklab, var(--color-accent) 28%, transparent);
  border-top-color: var(--color-accent);
  border-radius: 999px;
  animation: vel-brow-spin 0.7s linear infinite;
}

@keyframes vel-brow-live {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 40%, transparent);
  }

  70% {
    box-shadow: 0 0 0 0.4rem transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@keyframes vel-brow-spin {
  to {
    transform: rotate(360deg);
  }
}

/* --- balance --- */
.vel-brow__bal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12rem;
  flex: none;
  margin: 0;
  margin-inline-start: auto;
  padding: 0.2rem 0.15rem 0.2rem 0.5rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.vel-brow__bal:hover .vel-brow__money {
  color: var(--color-accent);
}

.vel-brow__money {
  color: var(--color-accent-deep);
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  white-space: nowrap;
  transition: color 140ms ease;
}

/* ========== Mobile ========== */
@media (max-width: 40rem) {
  .vel-brow {
    gap: 0.55rem;
    padding: 0.75rem 0.8rem;
  }

  .vel-brow__who {
    flex: 1 1 auto;
    max-inline-size: none;
  }

  .vel-brow__meta {
    flex: 1 1 100%;
    order: 3;
    gap: 0.35rem;
  }

  .vel-brow__chip {
    flex: 1 1 calc(50% - 0.25rem);
    max-inline-size: none;
  }

  .vel-brow__chip--sm {
    flex: 0 1 auto;
    max-inline-size: none;
  }

  .vel-brow__chip--iban {
    flex: 1 1 auto;
    max-inline-size: none;
  }

  .vel-brow__status {
    flex: 1 1 auto;
    justify-content: center;
  }

  .vel-brow__bal {
    order: 2;
  }

  .vel-brow__money {
    font-size: 1.05rem;
  }

  .vel-brow__chip-val {
    font-size: 0.78rem;
  }
}

/* Tablet: slightly tighter chips */
@media (min-width: 40.01rem) and (max-width: 56rem) {
  .vel-brow__chip {
    max-inline-size: 9.5rem;
  }

  .vel-brow__who {
    max-inline-size: 11rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-brow__status-live,
  .vel-brow__status-spin {
    animation: none;
  }

  .vel-brow__who,
  .vel-brow__chip,
  .vel-brow__money {
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
