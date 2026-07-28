<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useSimulatorStore } from '@/stores/simulator.store'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'
import VelCpiGenAnim from '@/features/account/VelCpiGenAnim.vue'
import VelCpiViewConfirm from '@/features/account/VelCpiViewConfirm.vue'

/**
 * Documenti · CPI:
 * loading → анимация файла
 * ready   → «Показать сертификат» → превью → галочка → Home
 * viewed / L4+ → можно снова открыть сертификат
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client, isPolicyIssued } = useAccount()
const { gender } = storeToRefs(useSimulatorStore())
const { isPolicyBuild, level } = useCommission()
const { select: selectTab } = useCabinetTab()
const {
  loadProgress,
  loadPct,
  loadRemainLabel,
  step,
  certViewed,
  markCertViewed,
} = useCpiBuild()

const previewOpen = ref(false)
const confirmOpen = ref(false)
const openedCert = ref(false)

/**
 * С L3+ карточка всегда в Documenti.
 * Состояния: generating → first ready → stored (в т.ч. весь L4+).
 */
const visible = computed(() => level.value >= 3)

const isGenerating = computed(() => isPolicyBuild.value && step.value === 'loading')
/** Первый раз «готов, открой» — ещё не закрывал превью (только L3 policy_build). */
const isFirstReady = computed(
  () =>
    level.value === 3 &&
    isPolicyBuild.value &&
    step.value === 'ready' &&
    !certViewed.value,
)
/**
 * После просмотра / оплаты / L4+: сертификат лежит в Documenti.
 * На L4+ всегда stored (CPI уже пройден), даже если localStorage сбросили.
 */
const isStored = computed(
  () =>
    !isGenerating.value &&
    !isFirstReady.value &&
    (level.value > 3 ||
      step.value === 'viewed' ||
      step.value === 'ready' ||
      certViewed.value ||
      isPolicyIssued.value),
)

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

function openCertificate(): void {
  if (isGenerating.value) return
  openedCert.value = true
  previewOpen.value = true
}

watch(previewOpen, (open, was) => {
  /* Первый просмотр: закрыл → модалка с галочкой. */
  if (was && !open && openedCert.value && step.value === 'ready' && !certViewed.value) {
    confirmOpen.value = true
  }
})

function onConfirmViewed(): void {
  markCertViewed()
  selectTab('home')
}
</script>

<template>
  <section
    v-if="visible"
    class="vel-pstub"
    :class="{
      'vel-pstub--generating': isGenerating,
      'vel-pstub--ready': isFirstReady || isStored,
    }"
    data-testid="policy-stub"
    :aria-label="t('account.commission.cpi.stub.region')"
  >
    <!-- 1) Генерация: анимация файла -->
    <template v-if="isGenerating">
      <div class="flex items-start gap-3">
        <span class="vel-pstub__spin shrink-0 text-accent-deep" aria-hidden="true">
          <VelAccountSign sign="shield" size="lg" />
        </span>
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.commission.cpi.loading.overline') }}</p>
          <h3 class="vel-pstub__title m-0">{{ t('account.commission.cpi.loading.title') }}</h3>
        </div>
      </div>

      <VelMeter :value="loadProgress" :label="t('account.commission.cpi.loading.meter')" />
      <div class="vel-pstub__meta">
        <span class="vel-num font-semibold">{{ t('account.commission.cpi.pct', { value: loadPct }) }}</span>
        <span class="vel-num">{{ t('account.commission.cpi.remain', { time: loadRemainLabel }) }}</span>
      </div>

      <VelCpiGenAnim
        data-testid="policy-stub-generating"
        :progress="loadProgress"
        :holder-name="holderName"
        :gender="gender || 'female'"
      />
    </template>

    <!-- 2) Первый раз готов — пульс «Apri» -->
    <template v-else-if="isFirstReady">
      <div class="vel-pstub__ready" data-testid="policy-stub-ready">
        <span class="vel-pstub__ready-icon" aria-hidden="true">
          <VelAccountSign sign="shield-check" size="lg" />
        </span>
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.commission.cpi.ready.overline') }}</p>
          <p class="vel-pstub__ready-title m-0">{{ t('account.commission.cpi.stub.readyTitle') }}</p>
          <p class="vel-pstub__ready-meta m-0">{{ holderName }}</p>
        </div>
      </div>

      <button
        type="button"
        class="vel-pstub__open vel-pstub__open--pulse"
        data-testid="policy-stub-open"
        @click="openCertificate"
      >
        {{ t('account.commission.cpi.ready.cta') }}
      </button>
    </template>

    <!-- 3) После просмотра / оплаты — сертификат остаётся в Documenti -->
    <template v-else-if="isStored">
      <div class="vel-pstub__ready" data-testid="policy-stub-stored">
        <span class="vel-pstub__ready-icon vel-pstub__ready-icon--static" aria-hidden="true">
          <VelAccountSign sign="shield-check" size="lg" />
        </span>
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.commission.cpi.stub.readyLead') }}</p>
          <p class="vel-pstub__ready-title m-0">{{ t('account.commission.cpi.stub.readyTitle') }}</p>
          <p class="vel-pstub__ready-meta m-0">{{ holderName }}</p>
        </div>
      </div>

      <button
        type="button"
        class="vel-pstub__open"
        data-testid="policy-stub-reopen"
        @click="openCertificate"
      >
        {{ t('account.commission.cpi.ready.cta') }}
      </button>
    </template>

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
.vel-pstub {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.125rem 1.15rem 1.25rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
}

.vel-pstub--ready {
  border-color: color-mix(in oklab, var(--color-success) 32%, var(--color-line));
}

.vel-pstub__title {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.vel-pstub__spin {
  display: inline-flex;
  animation: vel-pstub-spin 8s linear infinite;
  transform-origin: center;
}

.vel-pstub__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.vel-pstub__ready {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 28%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-success) 8%, var(--color-surface));
}

.vel-pstub__ready-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--color-success);
  animation: vel-pstub-ready-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-pstub__ready-icon--static {
  animation: none;
}

.vel-pstub__ready-title {
  color: var(--color-fg);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
}

.vel-pstub__ready-meta {
  margin-top: 0.25rem;
  color: var(--color-muted);
  font-size: 0.82rem;
}

.vel-pstub__open {
  display: inline-flex;
  width: 100%;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1.15rem;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink, #fff);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0.35rem 0.9rem color-mix(in oklab, var(--color-accent) 28%, transparent);
}

.vel-pstub__open--pulse {
  min-height: 3.1rem;
  font-size: 1.02rem;
  animation: vel-pstub-open-pulse 1.05s ease-in-out infinite;
}

.vel-pstub__open:hover {
  filter: brightness(1.06);
}

.vel-pstub__open:active {
  animation: none;
  transform: scale(0.97);
}

@keyframes vel-pstub-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-pstub-ready-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes vel-pstub-open-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-accent) 55%, transparent),
      0 0.4rem 1rem color-mix(in oklab, var(--color-accent) 30%, transparent);
  }
  50% {
    transform: scale(1.055);
    box-shadow:
      0 0 0 14px color-mix(in oklab, var(--color-accent) 0%, transparent),
      0 0.7rem 1.8rem color-mix(in oklab, var(--color-accent) 48%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pstub__spin,
  .vel-pstub__ready-icon,
  .vel-pstub__open--pulse {
    animation: none;
  }
}
</style>
