<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/** Шаг 2 drawer: сумма комиссии и причина. */
defineProps<{
  reasonTitle: string
  reasonBody: string
  feeText: string
}>()

const emit = defineEmits<{ back: []; next: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div data-reveal class="flex items-start gap-3">
      <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
      <div class="min-w-0">
        <h3 class="m-0 text-lg font-semibold text-fg">{{ reasonTitle }}</h3>
        <p class="m-0 mt-1 text-sm text-muted">{{ reasonBody }}</p>
      </div>
    </div>
    <div data-reveal class="rounded-control border border-accent/40 bg-accent/5 px-4 py-3">
      <p class="vel-label m-0">{{ t('account.commission.fee.amountLabel') }}</p>
      <p class="vel-num m-0 text-2xl font-bold text-accent-deep">{{ feeText }}</p>
    </div>
    <div data-reveal class="flex flex-col gap-2">
      <VelButton type="button" variant="outline" block @click="emit('back')">
        {{ t('account.commissionDrawer.back') }}
      </VelButton>
      <VelButton type="button" block size="lg" data-testid="commission-drawer-next" @click="emit('next')">
        {{ t('account.commissionDrawer.next') }}
      </VelButton>
    </div>
  </div>
</template>
