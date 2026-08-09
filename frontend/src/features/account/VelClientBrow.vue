<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useDocumentsUploadModal } from '@/composables/useDocumentsUploadModal'
import { useAccountStore } from '@/stores/account.store'

/**
 * «Бровь» только на Home: имя + IBAN (маска **** + глаз show/hide).
 */
const { t } = useI18n()
const { client } = useAccount()
const { select: selectTab } = useCabinetTab()
const docsUploadModal = useDocumentsUploadModal()
const accountStore = useAccountStore()
const { ibanFull, ibanMasked } = storeToRefs(accountStore)

const ibanRevealed = ref(false)

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

const rawIban = computed(() => {
  const full = ibanFull.value.replace(/\s+/g, '').toUpperCase()
  if (full.length >= 8) return full
  return ibanMasked.value.replace(/\s+/g, '').toUpperCase()
})

const hasIban = computed(() => rawIban.value.length >= 8)

/** 4 first + stars + 4 last, or full when revealed */
const ibanDisplay = computed(() => {
  const raw = rawIban.value
  if (!hasIban.value) return t('account.brow.ibanUnset')
  if (ibanRevealed.value) {
    return raw.replace(/(.{4})/g, '$1 ').trim()
  }
  const head = raw.slice(0, 4)
  const tail = raw.slice(-4)
  const midLen = Math.max(4, raw.length - 8)
  const stars = '•'.repeat(Math.min(midLen, 12))
  return `${head} ${stars} ${tail}`
})

function toggleIban(event: Event): void {
  event.stopPropagation()
  event.preventDefault()
  if (!hasIban.value) return
  ibanRevealed.value = !ibanRevealed.value
}

function goProfile(): void {
  selectTab('profile')
}

function goDocuments(): void {
  docsUploadModal.show()
}
</script>

<template>
  <aside class="vel-brow" data-testid="client-brow" :aria-label="t('account.brow.label')">
    <button type="button" class="vel-brow__col vel-brow__col--who" @click="goProfile">
      <span class="vel-brow__ava" aria-hidden="true">{{ initials }}</span>
      <span class="vel-brow__stack">
        <span class="vel-brow__lbl">{{ t('account.brow.client') }}</span>
        <span class="vel-brow__val vel-brow__clip">{{ displayName }}</span>
      </span>
    </button>

    <div class="vel-brow__col vel-brow__col--iban">
      <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
      <span class="vel-brow__val">
        <button
          type="button"
          class="vel-brow__iban-btn"
          :title="t('account.brow.ibanHint')"
          @click="goDocuments"
        >
          <b class="vel-brow__mono vel-brow__clip">{{ ibanDisplay }}</b>
        </button>
        <button
          v-if="hasIban"
          type="button"
          class="vel-brow__eye"
          :aria-pressed="ibanRevealed"
          :aria-label="
            ibanRevealed ? t('account.brow.ibanHide') : t('account.brow.ibanShow')
          "
          data-testid="brow-iban-toggle"
          @click="toggleIban"
        >
          <!-- eye open / closed -->
          <svg v-if="!ibanRevealed" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linejoin="round"
            />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.75" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 3l18 18M10.5 10.6a2.6 2.6 0 0 0 3 3M7.1 7.3C4.7 8.7 3 12 3 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.3 4.1-.8M14.1 6.4A9.3 9.3 0 0 1 12 5.5C6 5.5 2.5 12 2.5 12"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14.8 9.4A2.6 2.6 0 0 1 12 14.6"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </span>
    </div>
  </aside>
</template>

<style scoped>
.vel-brow {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.2fr);
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-block-size: 3.85rem;
  margin: 0 0 0.45rem;
  padding: 0.35rem 0.3rem;
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

.vel-brow__col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.16rem;
  min-width: 0;
  margin: 0;
  padding: 0.3rem 0.75rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  overflow: hidden;
}

.vel-brow__col + .vel-brow__col {
  border-inline-start: 1px solid
    color-mix(in oklab, var(--color-accent) 14%, var(--color-line));
}

.vel-brow__col--who {
  appearance: none;
  flex-direction: row;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  transition: background-color 140ms ease;
}

.vel-brow__col--who:hover {
  background: color-mix(in oklab, var(--color-accent) 7%, transparent);
}

.vel-brow__ava {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: 0.7rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-deep));
  color: var(--color-accent-ink);
  font-size: 0.78rem;
  font-weight: 800;
}

.vel-brow__stack {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.1rem;
  overflow: hidden;
}

.vel-brow__lbl {
  display: block;
  color: color-mix(in oklab, var(--color-accent-deep) 42%, var(--color-faint));
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vel-brow__val {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  color: var(--color-fg);
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.2;
}

.vel-brow__clip {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-brow__iban-btn {
  appearance: none;
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.vel-brow__mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: var(--color-accent-deep);
}

.vel-brow__eye {
  appearance: none;
  display: grid;
  place-items: center;
  flex: none;
  width: 1.85rem;
  height: 1.85rem;
  margin: 0;
  padding: 0;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: 0.55rem;
  background: color-mix(in oklab, var(--color-accent) 8%, #fff);
  color: var(--color-accent-deep);
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    transform 100ms ease;
}

.vel-brow__eye:hover {
  background: color-mix(in oklab, var(--color-accent) 14%, #fff);
  border-color: color-mix(in oklab, var(--color-accent) 45%, var(--color-line));
}

.vel-brow__eye:active {
  transform: scale(0.96);
}

.vel-brow__eye[aria-pressed='true'] {
  background: color-mix(in oklab, var(--color-accent) 18%, #fff);
  color: var(--color-accent);
}

.vel-brow__eye svg {
  width: 1.05rem;
  height: 1.05rem;
}

@media (max-width: 40rem) {
  .vel-brow {
    min-block-size: 3.5rem;
    padding: 0.28rem 0.2rem;
  }

  .vel-brow__col {
    padding: 0.22rem 0.5rem;
  }

  .vel-brow__mono {
    font-size: 0.7rem;
  }

  .vel-brow__eye {
    width: 1.65rem;
    height: 1.65rem;
  }
}
</style>
