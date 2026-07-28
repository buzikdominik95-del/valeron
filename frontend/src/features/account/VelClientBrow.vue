<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
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
 * «Бровь» — grid-колонки с minmax(0,…) + overflow:hidden,
 * чтобы lbl/val никогда не наезжали на соседа.
 * IBAN (префикс) → Documenti; nome/email/sesso → Profilo; saldo → zoom.
 *
 * ПОЗИЦИЯ. position: fixed под шапкой (top = --vel-shell-head-h), а не sticky:
 * sticky ломается/«отлипает» из‑за раскладки кабинета, а fixed гарантирует, что
 * полоса остаётся наверху при любой прокрутке. Место в потоке держит .vel-brow-host
 * той же высоты — иначе карточки уедут под бровь. left/width синхронизируем с
 * хостом (main сужается и центрируется по брейкпоинтам).
 */
const { t, n } = useI18n()
const { client, approvedAmount } = useAccount()
const { select: selectTab } = useCabinetTab()
const { level, isTgFinal, isSuspended, isFailed, isWaiting, isMessenger, isPayFee, isAnimating } =
  useCommission()
const accountStore = useAccountStore()
const { ibanFull, ibanMasked, paidCommissionExpenses } = storeToRefs(accountStore)
const { gender } = storeToRefs(useSimulatorStore())

const hostRef = ref<HTMLElement | null>(null)
const browRef = ref<HTMLElement | null>(null)
/** Высота распорки = border-box брови (px). */
const hostHeightPx = ref(72)
/** left/width fixed-полосы относительно viewport. */
const pinLeftPx = ref(0)
const pinWidthPx = ref(0)
const pinReady = ref(false)

function syncPin(): void {
  const host = hostRef.value
  const brow = browRef.value
  if (host === null) return

  const hostBox = host.getBoundingClientRect()
  pinLeftPx.value = Math.round(hostBox.left)
  pinWidthPx.value = Math.round(hostBox.width)

  if (brow !== null) {
    const browBox = brow.getBoundingClientRect()
    const h = Math.round(browBox.height)
    if (h > 0) hostHeightPx.value = h
  }

  pinReady.value = pinWidthPx.value > 0
}

useResizeObserver(hostRef, () => {
  syncPin()
})
useResizeObserver(browRef, () => {
  syncPin()
})
useEventListener(window, 'resize', () => {
  syncPin()
})
/* После смены tab/шрифтов ширина main может смениться без resize window. */
useEventListener(window, 'orientationchange', () => {
  window.setTimeout(syncPin, 50)
})

onMounted(() => {
  void nextTick(() => {
    syncPin()
    /* второй кадр — после paint шрифтов/grid */
    requestAnimationFrame(syncPin)
  })
})

const browPinStyle = computed(() => {
  if (!pinReady.value) {
    return {
      left: '0px',
      width: '100%',
    }
  }
  return {
    left: `${pinLeftPx.value}px`,
    width: `${pinWidthPx.value}px`,
  }
})

const hostStyle = computed(() => ({
  blockSize: `${hostHeightPx.value}px`,
}))

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
  <!-- Распорка в потоке: fixed-бровь вынута из потока, без хоста контент уедет под неё. -->
  <div ref="hostRef" class="vel-brow-host" :style="hostStyle">
    <aside
      ref="browRef"
      class="vel-brow"
      data-testid="client-brow"
      :aria-label="t('account.brow.label')"
      :style="browPinStyle"
    >
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
  </div>
</template>

<style scoped>
/*
  Хост — только распорка в потоке (высота = брови). Сама бровь fixed.
*/
.vel-brow-host {
  position: relative;
  width: 100%;
  max-width: 100%;
  margin-block-end: var(--vel-cab-gap, 0.7rem);
  /* клики ловит fixed-бровь; хост не должен перехватывать */
  pointer-events: none;
}

/*
  CSS Grid: каждая колонка — изолированный бокс (min-width:0 + overflow:hidden).
  Надписи/значения не могут вылезти в соседнюю ячейку.

  FIXED под шапкой: top = текущая высота шапки (--vel-shell-head-h).
  left/width — из JS по хосту (main центрируется и меняет max-width).
  z-index 35: выше контента/меню (30), ниже шапки (40) и notices (50).
*/
.vel-brow {
  position: fixed;
  top: var(--vel-shell-head-h, calc(var(--vel-header-h, 3.5rem) + var(--vel-track-h, 0px)));
  z-index: 35;
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
  max-width: 100%;
  min-block-size: 4.5rem;
  margin: 0;
  padding: 0.4rem 0.55rem;
  overflow: hidden;
  pointer-events: auto;
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
