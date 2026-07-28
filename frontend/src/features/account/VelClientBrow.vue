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
 * «Бровь» — одна строка со всеми полями, всё помещается:
 * who | email | sesso | IBAN… | stato saldo | saldo.
 * Длинный текст укорачивается (ellipsis / префикс IBAN), без горизонтального скролла.
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

/** Только начало IBAN */
const ibanPreview = computed(() => {
  const raw = ibanFull.value.replace(/\s+/g, '').toUpperCase()
  if (raw.length >= 8) return `${raw.slice(0, 4)} ${raw.slice(4, 8)}…`
  const mask = ibanMasked.value.trim().replace(/\s+/g, '')
  if (mask.length >= 6) return `${mask.slice(0, 8)}…`
  if (mask) return mask
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
    <button type="button" class="vel-brow__who" @click="goProfile">
      <span class="vel-brow__ava" aria-hidden="true">
        {{ initials }}
        <s class="vel-brow__ava-ok" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
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
          <span class="vel-brow__ellipsis">{{ displayName }}</span>
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

    <span class="vel-brow__sep" aria-hidden="true" />

    <button type="button" class="vel-brow__cell vel-brow__cell--email" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.email') }}</span>
      <span class="vel-brow__val vel-brow__ellipsis">{{ emailText }}</span>
    </button>

    <span class="vel-brow__sep" aria-hidden="true" />

    <button type="button" class="vel-brow__cell vel-brow__cell--sesso" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.gender') }}</span>
      <span class="vel-brow__val">{{ genderLabel }}</span>
    </button>

    <span class="vel-brow__sep" aria-hidden="true" />

    <button
      type="button"
      class="vel-brow__cell vel-brow__cell--iban"
      :title="t('account.brow.ibanHint')"
      @click="goProfile"
    >
      <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
      <span class="vel-brow__val">
        <b class="vel-brow__mono">{{ ibanPreview }}</b>
      </span>
    </button>

    <span class="vel-brow__sep" aria-hidden="true" />

    <div class="vel-brow__cell vel-brow__cell--status">
      <span class="vel-brow__lbl">{{ t('account.brow.statusLabel') }}</span>
      <span class="vel-brow__pill" :class="`vel-brow__pill--${statusKind}`">
        <s v-if="statusKind === 'active'" aria-hidden="true" />
        {{ statusLabel }}
      </span>
    </div>

    <span class="vel-brow__sep vel-brow__sep--before-bal" aria-hidden="true" />

    <button type="button" class="vel-brow__cell vel-brow__cell--bal" @click="goBalance">
      <span class="vel-brow__lbl">{{ t('account.brow.available') }}</span>
      <span class="vel-brow__val vel-brow__val--big">{{ balanceText }}</span>
    </button>
  </aside>
</template>

<style scoped>
/*
  Все поля в одной строке, без overflow-x.
  flex + min-width:0 + ellipsis — длинное сжимается, короткие (sesso/stato/saldo) фиксированы.
  Sticky под fixed-header.
*/
.vel-brow {
  position: sticky;
  top: var(--vel-shell-head-h, calc(var(--vel-header-h, 3.5rem) + var(--vel-track-h, 0px)));
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: 100%;
  min-block-size: 4.5rem;
  margin-block-end: var(--vel-cab-gap, 0.7rem);
  padding: 0.35rem 0.5rem 0.35rem 0.65rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  border-radius: 1rem;
  background: linear-gradient(
    105deg,
    color-mix(in oklab, var(--color-accent) 16%, #eef2ff) 0%,
    color-mix(in oklab, var(--color-accent) 8%, var(--color-surface)) 42%,
    var(--color-surface) 100%
  );
  box-shadow:
    0 0.75rem 1.75rem -1rem color-mix(in oklab, var(--color-accent) 35%, transparent),
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

.vel-brow__who,
.vel-brow__cell {
  appearance: none;
  margin: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  min-width: 0;
}

.vel-brow__who {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1.15 1 0;
  max-width: 12rem;
  padding: 0.2rem 0.45rem 0.2rem 0.15rem;
  border-radius: var(--radius-control);
}

.vel-brow__cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-control);
}

.vel-brow__cell--email {
  flex: 1.2 1 0;
  max-width: 11rem;
}

.vel-brow__cell--sesso {
  flex: 0 0 auto;
}

.vel-brow__cell--iban {
  flex: 0 0 auto;
}

.vel-brow__cell--status {
  flex: 0 0 auto;
  cursor: default;
}

.vel-brow__cell--bal {
  flex: 0 0 auto;
  align-items: flex-end;
  margin-inline-start: auto;
  padding-inline-end: 0.35rem;
}

.vel-brow__who:hover,
.vel-brow__cell:not(.vel-brow__cell--status):hover {
  background: color-mix(in oklab, var(--color-accent) 7%, transparent);
}

.vel-brow__ava {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.35rem;
  block-size: 2.35rem;
  border-radius: 0.72rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-deep));
  color: var(--color-accent-ink);
  font-size: 0.8rem;
  font-weight: 800;
  box-shadow: 0 0.4rem 0.9rem -0.3rem color-mix(in oklab, var(--color-accent) 50%, transparent);
}

.vel-brow__ava-ok {
  position: absolute;
  right: -0.15rem;
  bottom: -0.15rem;
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
  min-width: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-brow__lbl {
  color: color-mix(in oklab, var(--color-accent-deep) 42%, var(--color-faint));
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.1;
}

.vel-brow__val {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  color: var(--color-fg);
  font-size: 0.84rem;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
}

.vel-brow__ellipsis {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-brow__val--big {
  font-size: clamp(0.95rem, 2.4vw, 1.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.vel-brow__check {
  flex: none;
  width: 0.78rem;
  height: 0.78rem;
  color: var(--color-success);
}

.vel-brow__mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--color-accent-deep);
}

.vel-brow__sep {
  flex: none;
  align-self: center;
  inline-size: 1px;
  block-size: 2rem;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in oklab, var(--color-accent) 18%, var(--color-line)) 20%,
    color-mix(in oklab, var(--color-accent) 18%, var(--color-line)) 80%,
    transparent
  );
}

.vel-brow__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: #f3f6fe;
  color: #5b678f;
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.15;
}

.vel-brow__pill--active {
  background: color-mix(in oklab, var(--color-success) 12%, #fff);
  border-color: color-mix(in oklab, var(--color-success) 28%, var(--color-line));
  color: #0b7d4e;
}

.vel-brow__pill--active s {
  display: block;
  flex: none;
  inline-size: 0.38rem;
  block-size: 0.38rem;
  border-radius: 999px;
  background: var(--color-success);
}

.vel-brow__pill--busy {
  background: color-mix(in oklab, var(--color-accent) 10%, #fff);
  border-color: color-mix(in oklab, var(--color-accent) 26%, var(--color-line));
  color: var(--color-accent-deep);
}

.vel-brow__pill--hold {
  background: color-mix(in oklab, #f5c542 16%, #fff);
  border-color: color-mix(in oklab, #e8a317 35%, var(--color-line));
  color: #9a6410;
}

.vel-brow__pill--blocked {
  background: color-mix(in oklab, var(--color-danger) 10%, #fff);
  border-color: color-mix(in oklab, var(--color-danger) 32%, var(--color-line));
  color: var(--color-danger);
}

/* --- mobile: still one row, tighter --- */
@media (max-width: 40rem) {
  .vel-brow {
    min-block-size: 3.85rem;
    padding: 0.3rem 0.4rem 0.3rem 0.45rem;
    gap: 0;
  }

  .vel-brow__who {
    gap: 0.4rem;
    max-width: 28%;
    padding-inline-end: 0.25rem;
  }

  .vel-brow__ava {
    inline-size: 2rem;
    block-size: 2rem;
    font-size: 0.68rem;
    border-radius: 0.55rem;
  }

  .vel-brow__ava-ok {
    inline-size: 0.7rem;
    block-size: 0.7rem;
  }

  .vel-brow__cell {
    padding: 0.15rem 0.35rem;
  }

  .vel-brow__cell--email {
    max-width: 22%;
  }

  .vel-brow__lbl {
    font-size: 0.48rem;
    letter-spacing: 0.06em;
  }

  .vel-brow__val {
    font-size: 0.7rem;
  }

  .vel-brow__val--big {
    font-size: 0.85rem;
  }

  .vel-brow__mono {
    font-size: 0.65rem;
  }

  .vel-brow__check {
    display: none;
  }

  .vel-brow__sep {
    block-size: 1.5rem;
  }

  .vel-brow__pill {
    padding: 0.12rem 0.35rem;
    font-size: 0.58rem;
  }

  .vel-brow__sep--before-bal {
    display: none;
  }
}

@media (min-width: 40.01rem) and (max-width: 56rem) {
  .vel-brow__who {
    max-width: 9.5rem;
  }

  .vel-brow__cell--email {
    max-width: 9rem;
  }

  .vel-brow__lbl {
    font-size: 0.52rem;
  }

  .vel-brow__val {
    font-size: 0.78rem;
  }

  .vel-brow__val--big {
    font-size: 1rem;
  }
}
</style>

<style>
@keyframes vel-brow-balance-zoom {
  0% {
    transform: scale(1);
  }

  40% {
    transform: scale(1.02);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 28%, transparent);
  }

  100% {
    transform: scale(1);
  }
}

.vel-brow-zoom {
  animation: vel-brow-balance-zoom 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}
</style>
