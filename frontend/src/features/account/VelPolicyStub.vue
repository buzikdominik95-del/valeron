<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useCabinetTab } from '@/composables/useCabinetTab'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'

/**
 * Documenti · L3:
 * loading → анимация генерации бланка (reveal)
 * ready   → «готов» + сильный пульс «Apri il certificato»
 * close   → markCertViewed → Home (Preleva)
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client } = useAccount()
const { isPolicyBuild, level } = useCommission()
const { select: selectTab } = useCabinetTab()
const {
  loadProgress,
  loadRemainLabel,
  step,
  markCertViewed,
} = useCpiBuild()

const previewOpen = ref(false)
const openedCert = ref(false)

const visible = computed(() => level.value === 3 && isPolicyBuild.value)
const isGenerating = computed(() => step.value === 'loading')
const isReady = computed(() => step.value === 'ready')

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

const showName = computed(() => {
  if (!isGenerating.value) return true
  return reveal.value >= 0.26
})

const statusKey = computed(() => {
  if (isReady.value) return 'ready'
  if (reveal.value >= 0.92) return 'almost'
  if (reveal.value >= 0.45) return 'filling'
  return 'draft'
})

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
    <div class="vel-pstub__bar">
      <p class="vel-pstub__lead m-0">
        {{
          isGenerating
            ? t('account.commission.cpi.stub.lead')
            : t('account.commission.cpi.stub.readyLead')
        }}
      </p>
      <span class="vel-pstub__badge" :class="{ 'vel-pstub__badge--ok': isReady }">
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
          isGenerating
            ? t('account.commission.cpi.stub.subtitle')
            : t('account.commission.cpi.stub.readySubtitle')
        }}
      </p>
    </div>

    <!-- Генерация: reveal бланка -->
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

      <div class="vel-pstub__frame" data-testid="policy-stub-generating">
        <div class="vel-pstub__sheet" :style="{ '--vel-pstub-reveal': String(reveal) }">
          <img
            class="vel-pstub__img"
            :src="CPI_POLICY_IMG"
            :alt="t('account.commission.cpi.stub.imgAlt')"
            width="600"
            height="auto"
          />
          <span v-if="showName" class="vel-pstub__name" aria-hidden="true">{{ holderName }}</span>
          <div class="vel-pstub__fog" aria-hidden="true" />
          <div class="vel-pstub__scan" aria-hidden="true" />
        </div>
      </div>

      <p class="vel-pstub__hint m-0">{{ t('account.commission.cpi.stub.hint') }}</p>
    </template>

    <!-- Готов: анимация + пульс кнопки -->
    <template v-else-if="isReady">
      <div class="vel-pstub__ready" data-testid="policy-stub-ready">
        <span class="vel-pstub__ready-icon" aria-hidden="true">
          <VelAccountSign sign="shield-check" size="lg" />
        </span>
        <div class="min-w-0">
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

      <p class="vel-pstub__hint m-0">{{ t('account.commission.cpi.stub.readyHint') }}</p>
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

.vel-pstub__frame {
  overflow: hidden;
  max-block-size: min(52vh, 28rem);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
}

.vel-pstub__sheet {
  --vel-pstub-reveal: 0.1;

  position: relative;
  display: block;
  width: 100%;
  container-type: inline-size;
  clip-path: inset(0 0 calc((1 - var(--vel-pstub-reveal)) * 100%) 0);
  transition: clip-path 450ms ease;
}

.vel-pstub__img {
  display: block;
  width: 100%;
  height: auto;
  filter: saturate(0.92);
}

.vel-pstub__name {
  position: absolute;
  left: 29.15%;
  top: 23.18%;
  max-width: 52%;
  overflow: hidden;
  color: #1f2022;
  font-family: 'Times New Roman', Times, 'Liberation Serif', 'Noto Serif', serif;
  font-size: 0.85rem;
  font-size: 2.17cqw;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}

.vel-pstub__fog {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent calc(var(--vel-pstub-reveal) * 100% - 8%),
    color-mix(in oklab, var(--color-ground) 88%, transparent) calc(var(--vel-pstub-reveal) * 100%),
    var(--color-ground) 100%
  );
  pointer-events: none;
}

.vel-pstub__scan {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--vel-pstub-reveal) * 100% - 2px);
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklab, var(--color-accent) 70%, white),
    transparent
  );
  box-shadow: 0 0 12px color-mix(in oklab, var(--color-accent) 45%, transparent);
  pointer-events: none;
  transition: top 450ms ease;
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

.vel-pstub__ready-title {
  color: var(--color-fg);
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.25;
}

.vel-pstub__ready-meta {
  margin-top: 0.2rem;
  color: var(--color-muted);
  font-size: 0.8rem;
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

.vel-pstub__hint {
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.4;
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
  .vel-pstub__sheet,
  .vel-pstub__meter-fill,
  .vel-pstub__scan {
    transition: none;
  }

  .vel-pstub__ready-icon,
  .vel-pstub__open {
    animation: none;
  }
}
</style>
