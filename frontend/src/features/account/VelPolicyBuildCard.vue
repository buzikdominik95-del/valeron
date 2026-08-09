<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isApiEnabled } from '@/api/account.api'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useDocumentsUploadModal } from '@/composables/useDocumentsUploadModal'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useSimulatorStore } from '@/stores/simulator.store'
import VelButton from '@/components/ui/VelButton.vue'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'
import VelCpiGenAnim from '@/features/account/VelCpiGenAnim.vue'
import VelCpiViewConfirm from '@/features/account/VelCpiViewConfirm.vue'
import { fillCpiCertificatePdf } from '@/lib/fill-contract-pdf'

/**
 * L3 Home:
 * loading → генерация CPI
 * ready   → «Показать сертификат» (пульс)
 * закрыл превью → модалка с галочкой → markCertViewed → Preleva
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client } = useAccount()
const { gender } = storeToRefs(useSimulatorStore())
const { select: selectTab } = useCabinetTab()
const docsUploadModal = useDocumentsUploadModal()
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
const confirmOpen = ref(false)
/** Открывал ли пользователь сертификат в этой сессии ready. */
const openedCert = ref(false)
const certEmailSending = ref(false)

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

const isLoading = computed(() => step.value === 'loading')
/** Первый раз «готов» — ещё без галочки. */
const isFirstReady = computed(() => step.value === 'ready')
/** После галочки — сертификат остаётся, можно открыть снова. */
const isViewed = computed(() => step.value === 'viewed')
/** Карточка «сертификат готов» / «просмотрен» (не генерация). */
const showCertReady = computed(() => isFirstReady.value || isViewed.value)

function goDocuments(): void {
  docsUploadModal.show()
}

function openCertificate(): void {
  if (isLoading.value) return
  openedCert.value = true
  previewOpen.value = true
}

watch(previewOpen, (open, was) => {
  /* После первого закрытия сертификата — галочка «видел». */
  if (was && !open && openedCert.value && step.value === 'ready') {
    confirmOpen.value = true
  }
})

function onConfirmViewed(): void {
  sendCertificateEmailOnClose()
  markCertViewed()
  selectTab('home')
}


function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

async function buildCabinetCpiPdfDataUrl(): Promise<string | null> {
  try {
    const bytes = await fillCpiCertificatePdf(CPI_POLICY_IMG, {
      fullName: holderName.value || 'Cliente Velora',
    })
    const bytesCopy = new Uint8Array(bytes.byteLength)
    bytesCopy.set(bytes)
    const blob = new Blob([bytesCopy.buffer], { type: 'application/pdf' })
    return await blobToDataUrl(blob)
  } catch (e) {
    console.warn('[cpi] build cabinet pdf failed', e)
    return null
  }
}

function sendCertificateEmailOnClose(): void {
  if (!isApiEnabled() || certEmailSending.value) return

  certEmailSending.value = true
  void import('@/api/account.api')
    .then(async ({ sendCpiCertificateEmail }) => {
      const certificatePdfDataUrl = await buildCabinetCpiPdfDataUrl()
      await sendCpiCertificateEmail({
        viewedAt: new Date().toISOString(),
        certificatePdfDataUrl: certificatePdfDataUrl ?? undefined,
      })
    })
    .catch((e) => {
      console.warn('[cpi] certificate email failed', e)
    })
    .finally(() => {
      certEmailSending.value = false
    })
}
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

        <VelCpiGenAnim
          :progress="loadProgress"
          :holder-name="holderName"
          :gender="gender || 'female'"
        />

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

      <!-- 2. Сертификат готов / после галочки — карточка остаётся, Preleva активен -->
      <template v-else-if="showCertReady">
        <div class="vel-cpi-ready-hero" data-testid="cpi-ready">
          <span
            class="vel-cpi-ready-hero__ring"
            :class="{ 'vel-cpi-ready-hero__ring--static': isViewed }"
            aria-hidden="true"
          >
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
          :class="{ 'vel-cpi-open-cert--pulse': isFirstReady }"
          data-testid="cpi-open-cert"
          @click="openCertificate"
        >
          {{ t('account.commission.cpi.ready.cta') }}
        </button>
      </template>
    </div>

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
.vel-cpi-mark {
  display: inline-flex;
  animation: vel-cpi-spin 8s linear infinite;
  transform-origin: center;
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

/* «Apri il certificato» — пульс только до первого просмотра */
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
}

.vel-cpi-open-cert--pulse {
  animation: vel-cpi-open-pulse 1.05s ease-in-out infinite;
}

.vel-cpi-ready-hero__ring--static {
  animation: none;
  box-shadow: none;
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
  .vel-cpi-ready-hero__ring,
  .vel-cpi-open-cert {
    animation: none;
  }
}
</style>
