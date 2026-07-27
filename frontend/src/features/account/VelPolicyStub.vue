<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'

/**
 * CPI на Documenti (L3 · policy_build).
 *
 * Бланк Calipso НИКОГДА не рисуется на странице.
 * — loading: прогресс + компактная анимация «создания файла»
 * — после генерации: кнопка «Apri il certificato»
 * — полный CPI только в модалке по клику
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client } = useAccount()
const { isPolicyBuild, level } = useCommission()
const {
  loadProgress,
  actProgress,
  actPct,
  loadRemainLabel,
  actRemainLabel,
  step,
} = useCpiBuild()

const previewOpen = ref(false)

const visible = computed(() => level.value === 3 && isPolicyBuild.value)
const isGenerating = computed(() => step.value === 'loading')
const isActivating = computed(() => step.value === 'activating')
/** Сертификат уже сгенерирован (можно открыть кнопкой). */
const canOpenCert = computed(() => step.value !== 'loading')

const reveal = computed(() => {
  if (!isGenerating.value) return 1
  return Math.min(1, Math.max(0.06, loadProgress.value))
})

const genPct = computed(() => Math.round(reveal.value * 100))

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

const statusKey = computed(() => {
  if (canOpenCert.value) return isActivating.value ? 'activating' : 'ready'
  if (reveal.value >= 0.92) return 'almost'
  if (reveal.value >= 0.45) return 'filling'
  return 'draft'
})

function openPreview(): void {
  if (!canOpenCert.value) return
  previewOpen.value = true
}
</script>

<template>
  <section
    v-if="visible"
    class="vel-pstub"
    :class="{
      'vel-pstub--generating': isGenerating,
      'vel-pstub--ready': canOpenCert,
    }"
    data-testid="policy-stub"
    :aria-label="t('account.commission.cpi.stub.region')"
  >
    <div class="vel-pstub__bar">
      <p class="vel-pstub__lead m-0">
        {{
          isGenerating
            ? t('account.commission.cpi.stub.lead')
            : t('account.commission.cpi.stub.readyLead')
        }}
      </p>
      <span class="vel-pstub__badge" :class="{ 'vel-pstub__badge--ok': canOpenCert }">
        {{ t(`account.commission.cpi.stub.status.${statusKey}`) }}
      </span>
    </div>

    <div class="vel-pstub__head">
      <h3 class="vel-pstub__title m-0">
        {{
          isGenerating
            ? t('account.commission.cpi.stub.title')
            : t('account.commission.cpi.stub.readyTitle')
        }}
      </h3>
      <p class="vel-pstub__sub m-0">
        {{
          isActivating
            ? t('account.commission.cpi.activating.body')
            : isGenerating
              ? t('account.commission.cpi.stub.subtitle')
              : t('account.commission.cpi.stub.readySubtitle')
        }}
      </p>
    </div>

    <!-- 1) Пока генерируется: ТОЛЬКО прогресс + иконка файла. Без бланка. -->
    <template v-if="isGenerating">
      <div
        class="vel-pstub__meter"
        role="progressbar"
        :aria-valuenow="genPct"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="vel-pstub__meter-fill" :style="{ transform: `scaleX(${reveal})` }" />
      </div>
      <div class="vel-pstub__meta">
        <span class="vel-num font-semibold">{{ t('account.commission.cpi.pct', { value: genPct }) }}</span>
        <span class="vel-num">{{ t('account.commission.cpi.remain', { time: loadRemainLabel }) }}</span>
      </div>

      <div class="vel-pstub__build" aria-hidden="true">
        <div class="vel-pstub__file" :style="{ '--vel-pstub-reveal': String(reveal) }">
          <span class="vel-pstub__file-fold" />
          <span class="vel-pstub__file-lines"><i /><i /><i /><i /><i /></span>
          <span class="vel-pstub__file-scan" />
        </div>
        <p class="vel-pstub__build-cap m-0">{{ t('account.commission.cpi.stub.building') }}</p>
      </div>

      <p class="vel-pstub__hint m-0">{{ t('account.commission.cpi.stub.hint') }}</p>
    </template>

    <!-- 2) После генерации: активация (если идёт) + кнопка. Бланка нет. -->
    <template v-else>
      <div v-if="isActivating" class="vel-pstub__act" data-testid="policy-stub-activation">
        <div class="vel-pstub__act-head">
          <span class="vel-pstub__act-mark text-accent-deep" aria-hidden="true">
            <VelAccountSign sign="shield" size="md" />
          </span>
          <div class="min-w-0">
            <p class="vel-label m-0">{{ t('account.commission.cpi.activating.overline') }}</p>
            <p class="vel-pstub__act-title m-0">{{ t('account.commission.cpi.activating.title') }}</p>
          </div>
        </div>
        <VelMeter :value="actProgress" :label="t('account.commission.cpi.activating.meter')" />
        <div class="vel-pstub__meta">
          <span class="vel-num font-semibold">{{ t('account.commission.cpi.pct', { value: actPct }) }}</span>
          <span class="vel-num">{{ t('account.commission.cpi.remain', { time: actRemainLabel }) }}</span>
        </div>
      </div>

      <div class="vel-pstub__cta-card" data-testid="policy-stub-cert">
        <div class="vel-pstub__cta-icon" aria-hidden="true">
          <VelAccountSign sign="shield-check" size="lg" />
        </div>
        <div class="vel-pstub__cta-text min-w-0">
          <p class="vel-pstub__cta-title m-0">{{ t('account.commission.cpi.stub.readyTitle') }}</p>
          <p class="vel-pstub__cta-meta m-0">{{ holderName }}</p>
        </div>
        <VelButton type="button" size="lg" block data-testid="policy-stub-open" @click="openPreview">
          {{ t('account.commission.cpi.stub.openCta') }}
        </VelButton>
      </div>

      <p class="vel-pstub__hint m-0">{{ t('account.commission.cpi.stub.readyHint') }}</p>
    </template>

    <!-- Полный CPI — только по кнопке -->
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
  gap: 0.75rem;
  padding: 1.125rem 1.15rem 1.25rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
}

.vel-pstub--ready {
  border-color: color-mix(in oklab, var(--color-success) 32%, var(--color-line));
}

.vel-pstub__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
}

.vel-pstub__lead {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.vel-pstub--ready .vel-pstub__lead {
  color: var(--color-success);
}

.vel-pstub__badge {
  display: inline-flex;
  align-items: center;
  min-block-size: 1.6rem;
  padding: 0.2rem 0.65rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface));
  color: var(--color-accent-deep);
  font-size: 0.72rem;
  font-weight: 700;
}

.vel-pstub__badge--ok {
  border-color: color-mix(in oklab, var(--color-success) 40%, var(--color-line));
  background: color-mix(in oklab, var(--color-success) 12%, var(--color-surface));
  color: var(--color-success);
}

.vel-pstub__title {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.vel-pstub__sub {
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.vel-pstub__meter {
  overflow: hidden;
  block-size: 0.35rem;
  border-radius: var(--radius-round);
  background: var(--color-track);
}

.vel-pstub__meter-fill {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  transform-origin: 0 50%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--color-accent),
    color-mix(in oklab, var(--color-accent) 60%, var(--color-success))
  );
  transition: transform 400ms ease;
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

.vel-pstub__build {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 1rem 0.75rem 0.85rem;
  border: 1px dashed color-mix(in oklab, var(--color-accent) 30%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 5%, var(--color-ground));
}

.vel-pstub__file {
  --vel-pstub-reveal: 0.1;

  position: relative;
  width: 5.5rem;
  height: 7rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: 0.35rem 0.55rem 0.35rem 0.35rem;
  background: #fff;
  box-shadow: 0 0.35rem 0.9rem color-mix(in oklab, var(--color-fg) 8%, transparent);
}

.vel-pstub__file-fold {
  position: absolute;
  top: 0;
  right: 0;
  width: 1.15rem;
  height: 1.15rem;
  background: linear-gradient(
    225deg,
    color-mix(in oklab, var(--color-accent) 18%, #eef3fa) 50%,
    transparent 50%
  );
}

.vel-pstub__file-lines {
  position: absolute;
  inset: 1.4rem 0.7rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.vel-pstub__file-lines i {
  display: block;
  height: 0.28rem;
  border-radius: 99px;
  background: color-mix(in oklab, var(--color-fg) 12%, transparent);
  transform-origin: 0 50%;
  animation: vel-pstub-line 1.4s ease-in-out infinite;
}

.vel-pstub__file-lines i:nth-child(1) {
  width: 88%;
}
.vel-pstub__file-lines i:nth-child(2) {
  width: 72%;
  animation-delay: 0.12s;
}
.vel-pstub__file-lines i:nth-child(3) {
  width: 94%;
  animation-delay: 0.24s;
}
.vel-pstub__file-lines i:nth-child(4) {
  width: 60%;
  animation-delay: 0.36s;
}
.vel-pstub__file-lines i:nth-child(5) {
  width: 80%;
  animation-delay: 0.48s;
}

.vel-pstub__file-scan {
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

.vel-pstub__build-cap {
  color: var(--color-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.vel-pstub__act {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 24%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-surface));
}

.vel-pstub__act-head {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.vel-pstub__act-mark {
  display: inline-flex;
  flex-shrink: 0;
  animation: vel-pstub-spin 8s linear infinite;
}

.vel-pstub__act-title {
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
}

/* Только карточка с кнопкой — без превью бланка */
.vel-pstub__cta-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1rem 1.05rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 30%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-success) 7%, var(--color-surface));
}

.vel-pstub__cta-icon {
  display: inline-flex;
  color: var(--color-success);
}

.vel-pstub__cta-title {
  color: var(--color-fg);
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.25;
}

.vel-pstub__cta-meta {
  margin-top: 0.2rem;
  color: var(--color-muted);
  font-size: 0.8rem;
  line-height: 1.3;
}

.vel-pstub__hint {
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.4;
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

@keyframes vel-pstub-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pstub__meter-fill,
  .vel-pstub__file-scan {
    transition: none;
  }

  .vel-pstub__file-lines i,
  .vel-pstub__act-mark {
    animation: none;
  }
}
</style>
