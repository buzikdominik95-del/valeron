<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { accountStepHref } from '@/features/account/account-anchors'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'
import VelCpiViewConfirm from '@/features/account/VelCpiViewConfirm.vue'

/**
 * Полис CPI: processing → documents; issued → «Показать сертификат».
 *
 * После первого закрытия превью — модалка с галочкой «видел сертификат».
 * Подтверждение → markCertViewed (если ещё не viewed) + emit confirm.
 */
const emit = defineEmits<{
  /** После галочки подтверждения (или повторный просмотр, если уже viewed). */
  review: []
  confirm: []
}>()

const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { isPolicyIssued, policyEtaMinutes, client } = useAccount()
const { certViewed, markCertViewed } = useCpiBuild()

const state = computed(() => (isPolicyIssued.value ? 'issued' : 'pending'))

const etaText = computed(() =>
  t('account.policy.pending.eta', { minutes: policyEtaMinutes.value }),
)

const documentsHref = computed(() => accountStepHref('documents'))

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

const previewOpen = ref(false)
const confirmOpen = ref(false)
/** В этой сессии открывали сертификат (ждём закрытия → confirm). */
const openedCert = ref(false)

function openCertificate(): void {
  if (!isPolicyIssued.value) return
  openedCert.value = true
  previewOpen.value = true
}

watch(previewOpen, (open, was) => {
  if (!(was && !open && openedCert.value)) return
  /* Первый просмотр без галочки → модалка подтверждения */
  if (!certViewed.value) {
    confirmOpen.value = true
    return
  }
  /* Уже подтверждал — просто emit review (родитель может ничего не делать) */
  emit('review')
})

function onConfirmViewed(): void {
  markCertViewed()
  emit('confirm')
  emit('review')
}
</script>

<template>
  <section class="vel-policy" :class="{ 'vel-policy--issued': isPolicyIssued }">
    <div class="vel-policy__head">
      <span class="vel-policy__mark" aria-hidden="true">
        <VelAccountSign :sign="isPolicyIssued ? 'shield-check' : 'shield'" size="lg" />
      </span>

      <div class="flex min-w-0 flex-col gap-1">
        <p class="vel-label">{{ t(`account.policy.${state}.overline`) }}</p>
        <h2 class="text-xl sm:text-2xl">{{ t(`account.policy.${state}.title`) }}</h2>
      </div>
    </div>

    <p class="text-sm text-muted">{{ t(`account.policy.${state}.body`) }}</p>

    <p v-if="!isPolicyIssued" class="vel-policy__status">
      <VelAccountSign sign="clock" class="vel-policy__status-sign" />
      <span class="flex-1">{{ t('account.policy.pending.status') }}</span>
      <span class="vel-num vel-policy__eta">{{ etaText }}</span>
    </p>

    <VelButton
      v-if="isPolicyIssued"
      block
      data-testid="policy-show-cert"
      @click="openCertificate"
    >
      {{ t('account.policy.issued.cta') }}
    </VelButton>

    <VelButton v-else variant="outline" block :href="documentsHref">
      {{ t('account.policy.pending.cta') }}
    </VelButton>

    <VelPdfDialog
      v-model:open="previewOpen"
      :preview-image="CPI_POLICY_IMG"
      :holder-name="holderName"
      :title="t('account.commission.cpi.stub.readyTitle')"
    />

    <VelCpiViewConfirm v-model:open="confirmOpen" @confirm="onConfirmViewed" />
  </section>
</template>

<style scoped>
.vel-policy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

.vel-policy--issued {
  border-color: var(--color-accent);
}

.vel-policy__head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.vel-policy__mark {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--color-accent-deep);
}

.vel-policy--issued .vel-policy__mark {
  color: var(--color-success);
}

.vel-policy__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
  color: var(--color-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.vel-policy__status-sign {
  flex: none;
  color: var(--color-accent-deep);
}

.vel-policy__eta {
  color: var(--color-fg);
}
</style>
