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
 * «Бровь» клиента — sticky-полоса под шапкой кабинета, над балансом.
 * Всегда видна на всех этапах и вкладках.
 *
 * Клики:
 *   имя / email / sesso → Profilo
 *   IBAN → Documenti
 *   saldo → Home + zoom на карточку баланса
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
  const n = client.value.fullName.trim()
  if (n) return n
  return [client.value.firstName, client.value.lastName].filter(Boolean).join(' ') || '—'
})

const initials = computed(() => {
  const parts = displayName.value
    .split(/\s+/)
    .filter((p) => p && p !== '—')
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

const ibanDisplay = computed(() => {
  const full = ibanFull.value.replace(/\s+/g, '')
  if (full.length >= 15) return formatIbanGroups(full)
  const mask = ibanMasked.value.trim()
  if (mask) return mask
  return t('account.brow.ibanUnset')
})

const ibanCopyable = computed(() => ibanFull.value.replace(/\s+/g, '').length >= 15)

const { copy, copied } = useClipboard({ legacy: true })
const copyFlash = ref(false)
const { start: clearCopyFlash } = useTimeoutFn(() => {
  copyFlash.value = false
}, 1600)

async function onCopyIban(event: Event): Promise<void> {
  event.stopPropagation()
  if (!ibanCopyable.value) return
  await copy(ibanFull.value.replace(/\s+/g, '').toUpperCase())
  copyFlash.value = true
  clearCopyFlash()
}

/** Статус счёта по фазе воронки */
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
  <aside
    class="vel-brow"
    data-testid="client-brow"
    :aria-label="t('account.brow.label')"
  >
    <!-- Клиент: имя → profilo -->
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

    <!-- Email → profilo -->
    <button type="button" class="vel-brow__cell" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.email') }}</span>
      <span class="vel-brow__val">{{ emailText }}</span>
    </button>

    <span class="vel-brow__sep" aria-hidden="true" />

    <!-- Sesso → profilo -->
    <button type="button" class="vel-brow__cell" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.gender') }}</span>
      <span class="vel-brow__val">{{ genderLabel }}</span>
    </button>

    <span class="vel-brow__sep" aria-hidden="true" />

    <!-- IBAN → documenti -->
    <button type="button" class="vel-brow__cell" @click="goDocuments">
      <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
      <span class="vel-brow__val">
        <b class="vel-brow__mono">{{ ibanDisplay }}</b>
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

    <span class="vel-brow__sep" aria-hidden="true" />

    <!-- Status -->
    <div class="vel-brow__cell vel-brow__cell--static">
      <span class="vel-brow__lbl">{{ t('account.brow.statusLabel') }}</span>
      <span class="vel-brow__pills">
        <i
          class="vel-brow__pill"
          :class="{
            'vel-brow__pill--ok': statusKind === 'active',
            'vel-brow__pill--live': statusKind === 'active',
            'vel-brow__pill--busy': statusKind === 'busy',
            'vel-brow__pill--hold': statusKind === 'hold',
            'vel-brow__pill--blocked': statusKind === 'blocked',
          }"
        >
          <s v-if="statusKind === 'active'" />
          {{ statusLabel }}
        </i>
      </span>
    </div>

    <span class="vel-brow__spacer" aria-hidden="true" />
    <span class="vel-brow__sep" aria-hidden="true" />

    <!-- Saldo → home + zoom -->
    <button type="button" class="vel-brow__cell vel-brow__cell--bal" @click="goBalance">
      <span class="vel-brow__lbl">{{ t('account.brow.available') }}</span>
      <span class="vel-brow__val vel-brow__val--big">{{ balanceText }}</span>
    </button>
  </aside>
</template>

<style scoped>
.vel-brow {
  position: sticky;
  /* Ниже фиксированной шапки кабинета */
  top: 0.35rem;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 0;
  min-block-size: 4.55rem;
  margin-block-end: var(--vel-cab-gap, 0.7rem);
  padding: 0 0.35rem 0 0;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  /* Синий градиент заливки */
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
}

.vel-brow__who {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  block-size: 100%;
  padding: 0 0.75rem 0 1rem;
  transition: background-color 160ms ease;
}

.vel-brow__who:hover,
.vel-brow__cell:hover {
  background: color-mix(in oklab, var(--color-accent) 8%, transparent);
}

.vel-brow__ava {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.55rem;
  block-size: 2.55rem;
  border-radius: 0.8rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-deep));
  color: var(--color-accent-ink);
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 0.45rem 1rem color-mix(in oklab, var(--color-accent) 40%, transparent);
}

.vel-brow__ava-ok {
  position: absolute;
  right: -0.2rem;
  bottom: -0.2rem;
  display: grid;
  place-items: center;
  inline-size: 0.9rem;
  block-size: 0.9rem;
  border: 2px solid var(--color-surface);
  border-radius: 999px;
  background: var(--color-success);
  color: #fff;
}

.vel-brow__ava-ok svg {
  width: 0.5rem;
  height: 0.5rem;
}

.vel-brow__cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  min-inline-size: 0;
  block-size: 100%;
  padding: 0 0.95rem;
  transition: background-color 160ms ease;
}

.vel-brow__cell--flush {
  padding: 0;
}

.vel-brow__cell--static {
  cursor: default;
}

.vel-brow__cell--static:hover {
  background: transparent;
}

.vel-brow__cell--bal {
  align-items: flex-end;
  flex: none;
  padding-inline-end: 1.15rem;
}

.vel-brow__lbl {
  color: color-mix(in oklab, var(--color-accent-deep) 45%, var(--color-faint));
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.vel-brow__val {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-inline-size: 100%;
  overflow: hidden;
  color: var(--color-fg);
  font-size: 0.9rem;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.vel-brow__val--big {
  font-size: clamp(1.05rem, 2.8vw, 1.35rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-deep);
}

.vel-brow__check {
  flex: none;
  width: 0.85rem;
  height: 0.85rem;
  color: var(--color-success);
}

.vel-brow__mono {
  overflow: hidden;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.84rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
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
  width: 0.9rem;
  height: 0.9rem;
}

.vel-brow__sep {
  flex: none;
  inline-size: 1px;
  block-size: 2.35rem;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in oklab, var(--color-accent) 22%, var(--color-line)) 20%,
    color-mix(in oklab, var(--color-accent) 22%, var(--color-line)) 80%,
    transparent
  );
}

.vel-brow__spacer {
  flex: 1 1 auto;
  min-inline-size: 0.25rem;
}

.vel-brow__pills {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.vel-brow__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-surface));
  color: color-mix(in oklab, var(--color-accent-deep) 55%, var(--color-muted));
  font-size: 0.72rem;
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
  inline-size: 0.42rem;
  block-size: 0.42rem;
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
    box-shadow: 0 0 0 0.45rem transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* Узкие экраны: горизонтальный скролл ячеек */
@media (max-width: 56rem) {
  .vel-brow {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }

  .vel-brow__spacer {
    display: none;
  }

  .vel-brow__cell--bal {
    margin-inline-start: auto;
  }
}

@media (max-width: 40rem) {
  .vel-brow {
    min-block-size: 4.1rem;
  }

  .vel-brow__cell {
    padding: 0 0.65rem;
  }

  .vel-brow__lbl {
    font-size: 0.55rem;
  }

  .vel-brow__val {
    font-size: 0.8rem;
  }

  .vel-brow__val--big {
    font-size: 1rem;
  }

  .vel-brow__mono {
    max-inline-size: 8.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-brow__pill--live s {
    animation: none;
  }

  .vel-brow__who,
  .vel-brow__cell {
    transition: none;
  }
}
</style>

<style>
/* Zoom карточки баланса (глобально — класс вешается на payout card) */
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
