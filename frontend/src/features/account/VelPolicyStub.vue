<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useCabinetTab } from '@/composables/useCabinetTab'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'

/**
 * Documenti · L3:
 * loading → та же анимация файла, что на Home (не бланк, не «голый» текст)
 * ready   → пульс «Apri il certificato» → модалка
 * close   → markCertViewed → Home
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client } = useAccount()
const { isPolicyBuild, level } = useCommission()
const { select: selectTab } = useCabinetTab()
const {
  loadProgress,
  loadPct,
  loadRemainLabel,
  step,
  markCertViewed,
} = useCpiBuild()

const previewOpen = ref(false)
const openedCert = ref(false)

const visible = computed(() => level.value === 3 && isPolicyBuild.value)
const isGenerating = computed(() => step.value === 'loading')
const isReady = computed(() => step.value === 'ready')

const genReveal = computed(() => Math.max(0.06, loadProgress.value))

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

function openCertificate(): void {
  if (!isReady.value) return
  openedCert.value = true
  previewOpen.value = true
}

watch(previewOpen, (open, was) => {
  if (was && !open && openedCert.value && step.value === 'ready') {
    markCertViewed()
    selectTab('home')
  }
})
</script>

<template>
  <section
    v-if="visible"
    class="vel-pstub"
    :class="{
      'vel-pstub--generating': isGenerating,
      'vel-pstub--ready': isReady,
    }"
    data-testid="policy-stub"
    :aria-label="t('account.commission.cpi.stub.region')"
  >
    <!-- 1) Генерация: как Home — meter + анимация файла (без бланка) -->
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

      <div class="vel-pstub__gen" data-testid="policy-stub-generating" aria-hidden="true">
        <div class="vel-pstub__file" :style="{ '--vel-pstub-reveal': String(genReveal) }">
          <span class="vel-pstub__fold" />
          <span class="vel-pstub__lines"><i /><i /><i /><i /><i /></span>
          <span class="vel-pstub__scan" />
        </div>
        <p class="vel-pstub__gen-cap m-0">{{ t('account.commission.cpi.stub.building') }}</p>
      </div>
    </template>

    <!-- 2) Готов: кнопка открыть сертификат (пульс) -->
    <template v-else-if="isReady">
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
        class="vel-pstub__open"
        data-testid="policy-stub-open"
        @click="openCertificate"
      >
        {{ t('account.commission.cpi.stub.openCta') }}
      </button>
    </template>

    <VelPdfDialog
      v-model:open="previewOpen"
      :preview-image="CPI_POLICY_IMG"
      :holder-name="holderName"
      :title="t('account.commission.cpi.stub.readyTitle')"
    />
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

/* Та же анимация файла, что на Home */
.vel-pstub__gen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding: 0.95rem 0.75rem 0.85rem;
  border: 1px dashed color-mix(in oklab, var(--color-accent) 30%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 5%, var(--color-ground));
}

.vel-pstub__file {
  --vel-pstub-reveal: 0.1;

  position: relative;
  width: 5rem;
  height: 6.35rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: 0.3rem 0.5rem 0.3rem 0.3rem;
  background: #fff;
  box-shadow: 0 0.3rem 0.8rem color-mix(in oklab, var(--color-fg) 8%, transparent);
}

.vel-pstub__fold {
  position: absolute;
  top: 0;
  right: 0;
  width: 1.05rem;
  height: 1.05rem;
  background: linear-gradient(
    225deg,
    color-mix(in oklab, var(--color-accent) 18%, #eef3fa) 50%,
    transparent 50%
  );
}

.vel-pstub__lines {
  position: absolute;
  inset: 1.25rem 0.65rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}

.vel-pstub__lines i {
  display: block;
  height: 0.26rem;
  border-radius: 99px;
  background: color-mix(in oklab, var(--color-fg) 12%, transparent);
  transform-origin: 0 50%;
  animation: vel-pstub-line 1.4s ease-in-out infinite;
}

.vel-pstub__lines i:nth-child(1) {
  width: 88%;
}
.vel-pstub__lines i:nth-child(2) {
  width: 72%;
  animation-delay: 0.12s;
}
.vel-pstub__lines i:nth-child(3) {
  width: 94%;
  animation-delay: 0.24s;
}
.vel-pstub__lines i:nth-child(4) {
  width: 60%;
  animation-delay: 0.36s;
}
.vel-pstub__lines i:nth-child(5) {
  width: 80%;
  animation-delay: 0.48s;
}

.vel-pstub__scan {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--vel-pstub-reveal) * 100%);
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklab, var(--color-accent) 75%, #fff),
    transparent
  );
  box-shadow: 0 0 10px color-mix(in oklab, var(--color-accent) 40%, transparent);
  transition: top 400ms ease;
}

.vel-pstub__gen-cap {
  color: var(--color-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

/* Ready */
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
  min-height: 3.1rem;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.2rem;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink, #fff);
  font-family: inherit;
  font-size: 1.02rem;
  font-weight: 700;
  cursor: pointer;
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

@keyframes vel-pstub-line {
  0%,
  100% {
    opacity: 0.45;
    transform: scaleX(0.92);
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
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
  .vel-pstub__lines i,
  .vel-pstub__ready-icon,
  .vel-pstub__open {
    animation: none;
  }

  .vel-pstub__scan {
    transition: none;
  }
}
</style>
