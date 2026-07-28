<script setup lang="ts">
import { computed, useId } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import { useSimulatorStore } from '@/stores/simulator.store'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * «Dati personali» — dl + azione «Modifica» su nome/cognome.
 * Email si cambia in Sicurezza (Cambia email).
 */
const emit = defineEmits<{
  editName: []
}>()

const { t, n, te } = useI18n()

const { client } = useAccount()
const { amount } = useCreditSimulator()
const { docType, docNumber } = storeToRefs(useSimulatorStore())

const titleId = `vel-personal-data-${useId()}`

const EMPTY_DASH = '—'

interface DataRow {
  key: string
  label: string
  value: string
  numeric?: boolean
}

const docTypeLabel = computed(() => {
  const stored = docType.value.trim()
  if (stored === '') return ''

  const key = `wizard.identity.docTypes.${stored}`
  return te(key) ? t(key) : ''
})

const rows = computed<DataRow[]>(() => [
  {
    key: 'surname',
    label: t('account.personalData.surname'),
    value: client.value.lastName,
  },
  {
    key: 'name',
    label: t('account.personalData.name'),
    value: client.value.firstName,
  },
  {
    key: 'email',
    label: t('account.personalData.email'),
    value: client.value.email,
  },
  {
    key: 'amount',
    label: t('account.personalData.amount'),
    value: n(amount.value, 'currency'),
    numeric: true,
  },
  {
    key: 'docType',
    label: t('account.personalData.docType'),
    value: docTypeLabel.value,
  },
  {
    key: 'docNumber',
    label: t('account.personalData.docNumber'),
    value: docNumber.value.trim(),
    numeric: true,
  },
])
</script>

<template>
  <section
    class="vel-personal rounded-panel border border-line bg-surface p-5 sm:p-6"
    :aria-labelledby="titleId"
  >
    <div class="vel-personal__head">
      <h2 :id="titleId" class="text-lg sm:text-xl m-0">{{ t('account.personalData.title') }}</h2>
      <VelButton
        type="button"
        variant="outline"
        size="md"
        data-testid="personal-edit-name"
        @click="emit('editName')"
      >
        {{ t('account.personalData.editName') }}
      </VelButton>
    </div>

    <dl class="vel-data">
      <div v-for="row in rows" :key="row.key" class="vel-data__row">
        <dt class="vel-label">{{ row.label }}</dt>

        <dd v-if="row.value !== ''" class="vel-data__value" :class="{ 'vel-num': row.numeric }">
          {{ row.value }}
        </dd>

        <dd v-else class="vel-data__value vel-data__value--empty">
          <span aria-hidden="true">{{ EMPTY_DASH }}</span>
          <span class="sr-only">{{ t('account.personalData.notProvided') }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.vel-personal__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
}

.vel-data {
  margin: 1.25rem 0 0;
}

.vel-data__row {
  display: grid;
  gap: 0.2rem 1.5rem;
  padding-block: 0.7rem;
}

.vel-data__row + .vel-data__row {
  border-block-start: 1px solid var(--color-line);
}

.vel-data__value {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.vel-data__value--empty {
  color: var(--color-faint);
}

.vel-personal {
  container: vel-personal / inline-size;
}

@container vel-personal (min-width: 26rem) {
  .vel-data__row {
    grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
    align-items: baseline;
  }
}
</style>
