<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { usePreferredReducedMotion } from '@vueuse/core'
import { gsap } from 'gsap'
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
 * «Бровь» — обычный блок в потоке (не sticky/fixed).
 * При скролле уезжает вверх под шапку и исчезает, как остальные карточки.
 * Grid-колонки с minmax(0,…) + overflow:hidden — lbl/val не наезжают.
 * IBAN → Documenti; nome/email/sesso → Profilo; saldo → плавный scroll + soft pulse.
 */
const { t, n } = useI18n()
const { client, approvedAmount } = useAccount()
const { select: selectTab } = useCabinetTab()
const { level, isTgFinal, isSuspended, isFailed, isWaiting, isMessenger, isPayFee, isAnimating } =
  useCommission()
const accountStore = useAccountStore()
const { ibanFull, ibanMasked, paidCommissionExpenses } = storeToRefs(accountStore)
const { gender } = storeToRefs(useSimulatorStore())
const reducedMotion = usePreferredReducedMotion()

/** Активный tween скролла к балансу — гасим при повторном клике / unmount. */
let balanceScrollTween: gsap.core.Tween | null = null
let balancePulseTimer = 0

onBeforeUnmount(() => {
  balanceScrollTween?.kill()
  balanceScrollTween = null
  if (balancePulseTimer) window.clearTimeout(balancePulseTimer)
})

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

function goDocuments(): void {
  selectTab('documents')
}

/** Высота fixed-шапки: баланс не должен уезжать под неё. */
function shellHeadOffsetPx(): number {
  const root = document.querySelector('.vel-cabinet')
  if (root instanceof HTMLElement) {
    const raw = getComputedStyle(root).getPropertyValue('--vel-shell-head-h').trim()
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 56
}

function pulseBalance(el: HTMLElement): void {
  el.classList.remove('vel-brow-zoom')
  /* reflow — чтобы повторный клик снова проиграл анимацию */
  void el.offsetWidth
  el.classList.add('vel-brow-zoom')
  if (balancePulseTimer) window.clearTimeout(balancePulseTimer)
  balancePulseTimer = window.setTimeout(() => {
    el.classList.remove('vel-brow-zoom')
    balancePulseTimer = 0
  }, 1400)
}

/**
 * Клик по Saldo в брови → Home + спокойный скролл к карточке баланса.
 * Не scrollIntoView: он прыгает резко и не учитывает fixed-шапку.
 * GSAP ease power2.inOut ~0.9s, затем мягкая подсветка.
 */
function goBalance(): void {
  selectTab('home')
  void nextTick(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-testid="payout-balance"]')
      if (!el) return

      const gap = 10
      const topPad = shellHeadOffsetPx() + gap
      const rect = el.getBoundingClientRect()
      const targetY = Math.max(0, window.scrollY + rect.top - topPad)
      const distance = Math.abs(targetY - window.scrollY)

      balanceScrollTween?.kill()
      balanceScrollTween = null

      /* Уже на месте / reduced motion — без «гонки» скролла */
      if (reducedMotion.value === 'reduce' || distance < 6) {
        if (distance >= 1) window.scrollTo({ top: targetY, left: 0, behavior: 'auto' })
        pulseBalance(el)
        return
      }

      /* Длиннее путь — чуть дольше, но в разумных пределах */
      const duration = Math.min(1.15, Math.max(0.55, distance / 900))
      const state = { y: window.scrollY }

      balanceScrollTween = gsap.to(state, {
        y: targetY,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          window.scrollTo(0, state.y)
        },
        onComplete: () => {
          balanceScrollTween = null
          /* лёгкая пауза после прилёта — pulse не режет скролл */
          window.setTimeout(() => pulseBalance(el), 80)
        },
      })
    })
  })
}
</script>

<template>
  <aside class="vel-brow" data-testid="client-brow" :aria-label="t('account.brow.label')">
    <!-- Cliente -->
    <button type="button" class="vel-brow__col vel-brow__col--who" @click="goProfile">
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
          <span class="vel-brow__clip">{{ displayName }}</span>
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

    <!-- E-mail -->
    <button type="button" class="vel-brow__col vel-brow__col--email" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.email') }}</span>
      <span class="vel-brow__val vel-brow__clip">{{ emailText }}</span>
    </button>

    <!-- Sesso -->
    <button type="button" class="vel-brow__col vel-brow__col--sesso" @click="goProfile">
      <span class="vel-brow__lbl">{{ t('account.brow.gender') }}</span>
      <span class="vel-brow__val vel-brow__clip">{{ genderLabel }}</span>
    </button>

    <!-- IBAN → Documenti -->
    <button
      type="button"
      class="vel-brow__col vel-brow__col--iban"
      :title="t('account.brow.ibanHint')"
      @click="goDocuments"
    >
      <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
      <span class="vel-brow__val">
        <b class="vel-brow__mono vel-brow__clip">{{ ibanPreview }}</b>
      </span>
    </button>

    <!-- Stato saldo -->
    <div class="vel-brow__col vel-brow__col--status">
      <span class="vel-brow__lbl">{{ t('account.brow.statusLabel') }}</span>
      <span class="vel-brow__pill" :class="`vel-brow__pill--${statusKind}`">
        <s v-if="statusKind === 'active'" aria-hidden="true" />
        <span class="vel-brow__clip">{{ statusLabel }}</span>
      </span>
    </div>

    <!-- Saldo -->
    <button type="button" class="vel-brow__col vel-brow__col--bal" @click="goBalance">
      <span class="vel-brow__lbl">{{ t('account.brow.available') }}</span>
      <span class="vel-brow__val vel-brow__val--big vel-brow__clip">{{ balanceText }}</span>
    </button>
  </aside>
</template>

<style scoped>
/*
  Обычный static-блок в потоке (как карточки ниже):
  при скролле уезжает вверх под fixed-шапку и исчезает.
  CSS Grid: колонки изолированы (min-width:0 + overflow:hidden).
*/
.vel-brow {
  position: relative;
  display: grid;
  grid-template-columns:
    minmax(0, 1.35fr) /* who */
    minmax(0, 1.25fr) /* email */
    minmax(3.4rem, 0.55fr) /* sesso */
    minmax(4.2rem, 0.7fr) /* iban */
    minmax(4.6rem, 0.8fr) /* status */
    minmax(4.8rem, auto); /* bal */
  align-items: center;
  column-gap: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-block-size: 4.5rem;
  /* Плотнее к карточкам: на L3/L4 без step-bar пустота бросалась в глаза */
  margin: 0 0 0.45rem;
  padding: 0.4rem 0.55rem;
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

/* --- column cell --- */
.vel-brow__col {
  appearance: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.18rem;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0.25rem 0.65rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  overflow: hidden; /* ключ: текст не вылезает из колонки */
  transition: background-color 140ms ease;
}

.vel-brow__col + .vel-brow__col {
  border-inline-start: 1px solid
    color-mix(in oklab, var(--color-accent) 14%, var(--color-line));
}

.vel-brow__col--who {
  flex-direction: row;
  align-items: center;
  gap: 0.55rem;
  padding-inline-start: 0.2rem;
  border-inline-start: 0;
}

.vel-brow__col--status {
  cursor: default;
}

.vel-brow__col--bal {
  align-items: flex-end;
  padding-inline-end: 0.25rem;
}

.vel-brow__col:not(.vel-brow__col--status):hover {
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
  box-shadow: 0 0.4rem 0.85rem -0.25rem color-mix(in oklab, var(--color-accent) 50%, transparent);
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
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.12rem;
  overflow: hidden;
}

.vel-brow__lbl {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: color-mix(in oklab, var(--color-accent-deep) 42%, var(--color-faint));
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.vel-brow__val {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--color-fg);
  font-size: 0.84rem;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
}

.vel-brow__clip {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-brow__val--big {
  font-size: clamp(0.95rem, 2.2vw, 1.2rem);
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

.vel-brow__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  max-width: 100%;
  min-width: 0;
  padding: 0.18rem 0.45rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: #f3f6fe;
  color: #5b678f;
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1.15;
  overflow: hidden;
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

/* Tablet */
@media (max-width: 56rem) {
  .vel-brow {
    grid-template-columns:
      minmax(0, 1.3fr)
      minmax(0, 1.15fr)
      minmax(3rem, 0.5fr)
      minmax(3.8rem, 0.65fr)
      minmax(4rem, 0.75fr)
      minmax(4.2rem, auto);
    padding: 0.35rem 0.4rem;
    min-block-size: 4.15rem;
  }

  .vel-brow__col {
    padding: 0.2rem 0.4rem;
  }

  .vel-brow__ava {
    inline-size: 2.1rem;
    block-size: 2.1rem;
    font-size: 0.72rem;
  }

  .vel-brow__lbl {
    font-size: 0.5rem;
    letter-spacing: 0.08em;
  }

  .vel-brow__val {
    font-size: 0.76rem;
  }

  .vel-brow__val--big {
    font-size: 0.95rem;
  }

  .vel-brow__mono {
    font-size: 0.7rem;
  }

  .vel-brow__check {
    display: none;
  }

  .vel-brow__pill {
    font-size: 0.6rem;
    padding: 0.12rem 0.35rem;
  }
}

/* Phone — still 6 cols, tighter */
@media (max-width: 40rem) {
  .vel-brow {
    grid-template-columns:
      minmax(0, 1.25fr)
      minmax(0, 1.1fr)
      minmax(2.6rem, 0.45fr)
      minmax(3.2rem, 0.55fr)
      minmax(3.4rem, 0.7fr)
      minmax(3.6rem, auto);
    min-block-size: 3.7rem;
    padding: 0.28rem 0.3rem;
    border-radius: 0.75rem;
  }

  .vel-brow__col {
    padding: 0.12rem 0.28rem;
    gap: 0.1rem;
  }

  .vel-brow__col--who {
    gap: 0.35rem;
    padding-inline-start: 0.1rem;
  }

  .vel-brow__ava {
    inline-size: 1.85rem;
    block-size: 1.85rem;
    font-size: 0.62rem;
    border-radius: 0.5rem;
  }

  .vel-brow__ava-ok {
    inline-size: 0.65rem;
    block-size: 0.65rem;
    border-width: 1.5px;
  }

  .vel-brow__ava-ok svg {
    width: 0.35rem;
    height: 0.35rem;
  }

  .vel-brow__lbl {
    font-size: 0.45rem;
    letter-spacing: 0.05em;
  }

  .vel-brow__val {
    font-size: 0.65rem;
  }

  .vel-brow__val--big {
    font-size: 0.78rem;
  }

  .vel-brow__mono {
    font-size: 0.6rem;
  }

  .vel-brow__pill {
    font-size: 0.52rem;
    padding: 0.08rem 0.28rem;
    gap: 0.2rem;
  }

  .vel-brow__pill--active s {
    inline-size: 0.3rem;
    block-size: 0.3rem;
  }
}
</style>

<style>
/* Мягкая подсветка баланса после скролла — без резкого «прыжка» scale */
@keyframes vel-brow-balance-zoom {
  0% {
    transform: scale(1);
    box-shadow:
      0 0.55rem 1.35rem color-mix(in oklab, var(--color-fg) 6%, transparent),
      inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
  }

  35% {
    transform: scale(1.012);
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--color-accent) 22%, transparent),
      0 0.75rem 1.6rem color-mix(in oklab, var(--color-accent) 12%, transparent),
      inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
  }

  100% {
    transform: scale(1);
    box-shadow:
      0 0.55rem 1.35rem color-mix(in oklab, var(--color-fg) 6%, transparent),
      inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
  }
}

.vel-brow-zoom {
  animation: vel-brow-balance-zoom 1.25s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .vel-brow-zoom {
    animation: none;
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--color-accent) 22%, transparent),
      0 0.55rem 1.35rem color-mix(in oklab, var(--color-fg) 6%, transparent);
  }
}
</style>
