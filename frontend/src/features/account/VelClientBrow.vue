<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useAccountStore } from '@/stores/account.store'

/**
 * «Бровь» упрощённая: имя + фамилия · IBAN (с галочкой).
 * Сильно не усложняем — доработаем позже (22.txt).
 */
const { t } = useI18n()
const { client } = useAccount()
const { select: selectTab } = useCabinetTab()
const accountStore = useAccountStore()
const { ibanFull, ibanMasked } = storeToRefs(accountStore)

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

const ibanPreview = computed(() => {
  const raw = ibanFull.value.replace(/\s+/g, '').toUpperCase()
  if (raw.length >= 8) return `${raw.slice(0, 4)} ${raw.slice(4, 8)}…`
  const mask = ibanMasked.value.trim().replace(/\s+/g, '')
  if (mask.length >= 6) return `${mask.slice(0, 8)}…`
  if (mask) return mask
  return t('account.brow.ibanUnset')
})

const hasIban = computed(() => {
  const raw = ibanFull.value.replace(/\s+/g, '')
  const mask = ibanMasked.value.trim()
  return raw.length >= 8 || mask.length >= 6
})

function goProfile(): void {
  selectTab('profile')
}

function goDocuments(): void {
  selectTab('documents')
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

    <button
      type="button"
      class="vel-brow__col vel-brow__col--iban"
      :title="t('account.brow.ibanHint')"
      @click="goDocuments"
    >
      <span class="vel-brow__lbl">{{ t('account.brow.iban') }}</span>
      <span class="vel-brow__val">
        <b class="vel-brow__mono vel-brow__clip">{{ ibanPreview }}</b>
        <span
          v-if="hasIban"
          class="vel-brow__ok"
          :title="t('account.brow.ibanOk')"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none">
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
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: center;
  column-gap: 0;
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
  appearance: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.16rem;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0.3rem 0.85rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  overflow: hidden;
  transition: background-color 140ms ease;
}

.vel-brow__col + .vel-brow__col {
  border-inline-start: 1px solid
    color-mix(in oklab, var(--color-accent) 14%, var(--color-line));
}

.vel-brow__col--who {
  flex-direction: row;
  align-items: center;
  gap: 0.65rem;
  border-inline-start: 0;
}

.vel-brow__col:hover {
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
  box-shadow: 0 0.4rem 0.85rem -0.25rem color-mix(in oklab, var(--color-accent) 50%, transparent);
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
  gap: 0.4rem;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--color-fg);
  font-size: 0.9rem;
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

.vel-brow__mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.84rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--color-accent-deep);
}

.vel-brow__ok {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-success) 16%, #fff);
  color: #0b7d4e;
  border: 1px solid color-mix(in oklab, var(--color-success) 40%, transparent);
}

.vel-brow__ok svg {
  width: 0.68rem;
  height: 0.68rem;
}

@media (max-width: 40rem) {
  .vel-brow {
    min-block-size: 3.5rem;
    padding: 0.28rem 0.2rem;
    border-radius: 0.75rem;
  }

  .vel-brow__col {
    padding: 0.22rem 0.55rem;
  }

  .vel-brow__col--who {
    gap: 0.45rem;
  }

  .vel-brow__ava {
    inline-size: 1.95rem;
    block-size: 1.95rem;
    font-size: 0.68rem;
  }

  .vel-brow__lbl {
    font-size: 0.48rem;
  }

  .vel-brow__val {
    font-size: 0.78rem;
  }

  .vel-brow__mono {
    font-size: 0.72rem;
  }
}
</style>
