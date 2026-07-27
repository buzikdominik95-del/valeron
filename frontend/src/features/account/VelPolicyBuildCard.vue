<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { usePanelMotion } from '@/composables/usePanelMotion'
import VelButton from '@/components/ui/VelButton.vue'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'

/**
 * L3 Home:
 * loading → генерация CPI
 * ready   → «сертификат готов» + сильный пульс «Apri certificato»
 * после закрытия превью → markCertViewed → Home + Preleva (phase ready)
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client } = useAccount()
const { select: selectTab } = useCabinetTab()
const {
  step,
  loadProgress,
  loadPct,
  loadRemainLabel,
  markCertViewed,
} = useCpiBuild()

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const previewOpen = ref(false)
/** Открывал ли пользователь сертификат в этой сессии ready. */
const openedCert = ref(false)

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

const isLoading = computed(() => step.value === 'loading')
const isReady = computed(() => step.value === 'ready')

function goDocuments(): void {
  selectTab('documents')
}

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

/* Если step ушёл в viewed — карточка всё равно размонтируется (phase ≠ policy_build). */
</script>

<template>
  <section
    ref="root"
    class="relative overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
    data-testid="cpi-stage"
  >
    <VelBorderBeam :duration-ms="6500" :size="56" />

    <div class="relative z-[1] flex flex-col gap-4">
      <!-- 1. Генерация -->
      <template v-if="isLoading">
        <div class="flex items-start gap-3">
          <span class="vel-cpi-mark shrink-0 text-accent-deep">
            <VelAccountSign sign="shield" size="lg" />
          </span>
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.loading.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.loading.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.loading.body') }}</p>
        <VelMeter :value="loadProgress" :label="t('account.commission.cpi.loading.meter')" />
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span class="vel-num font-semibold">
            {{ t('account.commission.cpi.pct', { value: loadPct }) }}
          </span>
          <span class="vel-num">{{ t('account.commission.cpi.remain', { time: loadRemainLabel }) }}</span>
        </div>

        <div class="vel-cpi-gen" aria-hidden="true">
          <div
            class="vel-cpi-gen__file"
            :style="{ '--vel-cpi-reveal': String(Math.max(0.06, loadProgress)) }"
          >
            <span class="vel-cpi-gen__fold" />
            <span class="vel-cpi-gen__lines"><i /><i /><i /><i /><i /></span>
            <span class="vel-cpi-gen__scan" />
          </div>
          <p class="vel-cpi-gen__cap m-0">{{ t('account.commission.cpi.stub.building') }}</p>
        </div>

        <VelButton
          type="button"
          variant="outline"
          block
          size="lg"
          data-testid="cpi-go-docs"
          @click="goDocuments"
        >
          {{ t('account.commission.cpi.loading.docsCta') }}
        </VelButton>
      </template>

      <!-- 2. Сертификат готов → сильный пульс «показать» -->
      <template v-else-if="isReady">
        <div class="vel-cpi-ready-hero" data-testid="cpi-ready">
          <span class="vel-cpi-ready-hero__ring" aria-hidden="true">
            <VelAccountSign sign="shield-check" size="lg" />
          </span>
          <div class="min-w-0">
            <p class="vel-label m-0">{{ t('account.commission.cpi.ready.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.ready.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.ready.body') }}</p>
        <p class="vel-cpi-ready-name m-0">{{ holderName }}</p>

        <button
          type="button"
          class="vel-cpi-open-cert"
          data-testid="cpi-open-cert"
          @click="openCertificate"
        >
          {{ t('account.commission.cpi.stub.openCta') }}
        </button>
      </template>
    </div>

    <VelPdfDialog
      v-model:open="previewOpen"
      :preview-image="CPI_POLICY_IMG"
      :holder-name="holderName"
      :title="t('account.commission.cpi.stub.readyTitle')"
    />
  </section>
</template>

<style scoped>
.vel-cpi-mark {
  display: inline-flex;
  animation: vel-cpi-spin 8s linear infinite;
  transform-origin: center;
}

.vel-cpi-gen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding: 0.85rem 0.75rem 0.75rem;
  border: 1px dashed color-mix(in oklab, var(--color-accent) 30%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 5%, var(--color-ground));
}

.vel-cpi-gen__file {
  --vel-cpi-reveal: 0.1;

  position: relative;
  width: 4.75rem;
  height: 6rem;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: 0.3rem 0.5rem 0.3rem 0.3rem;
  background: #fff;
  box-shadow: 0 0.3rem 0.8rem color-mix(in oklab, var(--color-fg) 8%, transparent);
}

.vel-cpi-gen__fold {
  position: absolute;
  top: 0;
  right: 0;
  width: 1rem;
  height: 1rem;
  background: linear-gradient(
    225deg,
    color-mix(in oklab, var(--color-accent) 18%, #eef3fa) 50%,
    transparent 50%
  );
}

.vel-cpi-gen__lines {
  position: absolute;
  inset: 1.2rem 0.6rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vel-cpi-gen__lines i {
  display: block;
  height: 0.24rem;
  border-radius: 99px;
  background: color-mix(in oklab, var(--color-fg) 12%, transparent);
  transform-origin: 0 50%;
  animation: vel-cpi-gen-line 1.4s ease-in-out infinite;
}

.vel-cpi-gen__lines i:nth-child(1) {
  width: 88%;
}
.vel-cpi-gen__lines i:nth-child(2) {
  width: 72%;
  animation-delay: 0.12s;
}
.vel-cpi-gen__lines i:nth-child(3) {
  width: 94%;
  animation-delay: 0.24s;
}
.vel-cpi-gen__lines i:nth-child(4) {
  width: 60%;
  animation-delay: 0.36s;
}
.vel-cpi-gen__lines i:nth-child(5) {
  width: 80%;
  animation-delay: 0.48s;
}

.vel-cpi-gen__scan {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--vel-cpi-reveal) * 100%);
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

.vel-cpi-gen__cap {
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Ready hero */
.vel-cpi-ready-hero {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.vel-cpi-ready-hero__ring {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  color: var(--color-success);
  background: color-mix(in oklab, var(--color-success) 14%, var(--color-surface));
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 35%, transparent);
  animation: vel-cpi-ready-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both,
    vel-cpi-ready-glow 1.6s ease-in-out 0.4s infinite;
}

.vel-cpi-ready-name {
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 600;
}

/* Сильный пульс «Apri il certificato» */
.vel-cpi-open-cert {
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
  letter-spacing: -0.01em;
  cursor: pointer;
  animation: vel-cpi-open-pulse 1.05s ease-in-out infinite;
}

.vel-cpi-open-cert:hover {
  filter: brightness(1.06);
}

.vel-cpi-open-cert:active {
  animation: none;
  transform: scale(0.97);
  filter: brightness(0.96);
}

@keyframes vel-cpi-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-cpi-gen-line {
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

@keyframes vel-cpi-ready-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes vel-cpi-ready-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 10px color-mix(in oklab, var(--color-success) 0%, transparent),
      0 0 22px color-mix(in oklab, var(--color-success) 35%, transparent);
  }
}

@keyframes vel-cpi-open-pulse {
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
  .vel-cpi-mark,
  .vel-cpi-gen__lines i,
  .vel-cpi-ready-hero__ring,
  .vel-cpi-open-cert {
    animation: none;
  }

  .vel-cpi-gen__scan {
    transition: none;
  }
}
</style>
