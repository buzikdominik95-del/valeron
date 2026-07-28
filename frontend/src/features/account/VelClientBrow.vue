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
 * «Бровь» клиента — как в velora-client-brow-final.html:
 * одна горизонтальная полоса: who | email | sesso | IBAN | status | saldo.
 *
 * Адаптация: на узком экране — горизонтальный скролл (дизайн не ломаем).
 * Sticky сразу под fixed-шапкой: top = --vel-shell-head-h.
 *
 * IBAN: только начало; клик → Profilo.
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

/** Только начало IBAN — полный в профиле */
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
    <!-- Who -->
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
      <span class="vel-brow__cell vel-brow__cell--flush">
        <span class="vel-brow__lbl">{{ t('account.brow.client') }}</span>
        <span class="vel-brow__val">
          {{ displayName }}
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

    <button type="button" class="vel-brow__cell" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.email') }}</span>
      <span class="vel-brow__val">{{ emailText }}</span>
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

    <div class="vel-brow__cell vel-brow__cell--static">
      <span class="vel-brow__lbl">{{ t('account.brow.statusLabel') }}</span>
      <span class="vel-brow__pills">
        <i class="vel-brow__pill" :class="`vel-brow__pill--${statusKind}`">
          <s v-if="statusKind === 'active'" />
          {{ statusLabel }}
        </i>
      </span>
    </div>

    <span class="vel-brow__spacer" aria-hidden="true" />
    <span class="vel-brow__sep" aria-hidden="true" />

    <button type="button" class="vel-brow__cell vel-brow__cell--bal" @click="goBalance">
      <span class="vel-brow__lbl">{{ t('account.brow.available') }}</span>
      <span class="vel-brow__val vel-brow__val--big">{{ balanceText }}</span>
    </button>
  </aside>
</template>

<style scoped>
/*
  Макет 1:1 с HTML-макетом «бровь»:
  flex row + sep + spacer + bal.
  Sticky: top = высота fixed-шапки кабинета (не 0.35rem — иначе уезжает под header).
*/
.vel-brow {
  position: sticky;
  top: var(--vel-shell-head-h, calc(var(--vel-header-h, 3.5rem) + var(--vel-track-h, 0px)));
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0;
  min-block-size: 4.75rem;
  margin-block-end: var(--vel-cab-gap, 0.7rem);
  padding: 0 0.25rem 0 0;
  /* overflow-x scroll на узких — overflow-y visible для тени */
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  border-radius: 1rem;
  background:
    linear-gradient(
      105deg,
      color-mix(in oklab, var(--color-accent) 16%, #eef2ff) 0%,
      color-mix(in oklab, var(--color-accent) 8%, var(--color-surface)) 42%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.85rem 2rem -1.2rem color-mix(in oklab, var(--color-accent) 40%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
  scrollbar-width: thin;
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
  flex: none;
}

.vel-brow__who {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  block-size: 100%;
  min-block-size: 4.75rem;
  padding: 0 0.85rem 0 1.1rem;
  transition: background-color 160ms ease;
}

.vel-brow__cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
  min-block-size: 4.75rem;
  padding: 0 1.05rem;
  transition: background-color 160ms ease;
}

.vel-brow__cell--flush {
  padding: 0;
  min-block-size: 0;
}

.vel-brow__cell--static {
  cursor: default;
}

.vel-brow__cell--static:hover {
  background: transparent;
}

.vel-brow__cell--sesso {
  min-inline-size: 5.25rem;
}

.vel-brow__cell--iban {
  min-inline-size: 6.5rem;
}

.vel-brow__cell--bal {
  align-items: flex-end;
  padding-inline-end: 1.25rem;
  min-inline-size: 7rem;
}

.vel-brow__who:hover,
.vel-brow__cell:not(.vel-brow__cell--static):hover {
  background: color-mix(in oklab, var(--color-accent) 6%, transparent);
}

.vel-brow__ava {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.6rem;
  block-size: 2.6rem;
  border-radius: 0.8rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-deep));
  color: var(--color-accent-ink);
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 0.5rem 1.1rem -0.35rem color-mix(in oklab, var(--color-accent) 55%, transparent);
}

.vel-brow__ava-ok {
  position: absolute;
  right: -0.2rem;
  bottom: -0.2rem;
  display: grid;
  place-items: center;
  inline-size: 0.95rem;
  block-size: 0.95rem;
  border: 2.5px solid var(--color-surface);
  border-radius: 999px;
  background: var(--color-success);
  color: #fff;
}

.vel-brow__ava-ok svg {
  width: 0.5rem;
  height: 0.5rem;
}

.vel-brow__lbl {
  color: color-mix(in oklab, var(--color-accent-deep) 40%, var(--color-faint));
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  white-space: nowrap;
}

.vel-brow__val {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-inline-size: 11rem;
  overflow: hidden;
  color: var(--color-fg);
  font-size: 0.94rem;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.vel-brow__cell--sesso .vel-brow__val {
  max-inline-size: none;
}

.vel-brow__val--big {
  max-inline-size: none;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-fg);
}

.vel-brow__check {
  flex: none;
  width: 0.88rem;
  height: 0.88rem;
  color: var(--color-success);
}

.vel-brow__mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.88rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--color-accent-deep);
}

.vel-brow__sep {
  flex: none;
  inline-size: 1px;
  block-size: 2.35rem;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in oklab, var(--color-accent) 20%, var(--color-line)) 18%,
    color-mix(in oklab, var(--color-accent) 20%, var(--color-line)) 82%,
    transparent
  );
}

.vel-brow__spacer {
  flex: 1 1 0.5rem;
  min-inline-size: 0.5rem;
}

.vel-brow__pills {
  display: flex;
  align-items: center;
}

/* Pill как в HTML-макете */
.vel-brow__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: #f3f6fe;
  color: #5b678f;
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.2;
}

.vel-brow__pill--active {
  background: color-mix(in oklab, var(--color-success) 12%, #fff);
  border-color: color-mix(in oklab, var(--color-success) 28%, var(--color-line));
  color: #0b7d4e;
}

.vel-brow__pill--active s {
  display: block;
  flex: none;
  inline-size: 0.44rem;
  block-size: 0.44rem;
  border-radius: 999px;
  background: var(--color-success);
  animation: vel-brow-blip 2s infinite;
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

@keyframes vel-brow-blip {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 45%, transparent);
  }

  70% {
    box-shadow: 0 0 0 0.45rem transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* Узкий экран: та же полоса, горизонтальный скролл (дизайн не ломаем) */
@media (max-width: 48rem) {
  .vel-brow {
    min-block-size: 4.4rem;
  }

  .vel-brow__who,
  .vel-brow__cell {
    min-block-size: 4.4rem;
  }

  .vel-brow__who {
    padding-inline: 0.75rem 0.65rem;
  }

  .vel-brow__cell {
    padding-inline: 0.8rem;
  }

  .vel-brow__val {
    max-inline-size: 8.5rem;
    font-size: 0.86rem;
  }

  .vel-brow__cell--sesso .vel-brow__val {
    max-inline-size: none;
  }

  .vel-brow__val--big {
    font-size: 1.15rem;
  }

  .vel-brow__lbl {
    font-size: 0.55rem;
    letter-spacing: 0.1em;
  }

  .vel-brow__ava {
    inline-size: 2.35rem;
    block-size: 2.35rem;
  }

  .vel-brow__spacer {
    min-inline-size: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-brow__pill--active s {
    animation: none;
  }

  .vel-brow__who,
  .vel-brow__cell {
    transition: none;
  }
}
</style>

<style>
@keyframes vel-brow-balance-zoom {
  0% {
    transform: scale(1);
  }

  40% {
    transform: scale(1.025);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 30%, transparent);
  }

  100% {
    transform: scale(1);
  }
}

.vel-brow-zoom {
  animation: vel-brow-balance-zoom 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}
</style>
