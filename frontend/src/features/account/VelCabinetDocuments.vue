<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useCommission } from '@/composables/useCommission'
import { CABINET_HEADING_ID, useCabinetTab } from '@/composables/useCabinetTab'
import VelDocumentCard from '@/features/account/VelDocumentCard.vue'
import VelPolicyStub from '@/features/account/VelPolicyStub.vue'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Раздел «Documenti»: загрузка удостоверения (пока не accepted), договор и
 * список уже принятых сервером файлов.
 *
 * L3 policy_build: «Vai ai documenti» → здесь формируется bozza polizza CPI
 * (VelPolicyStub), параллельно с прогрессом на Home.
 *
 * Фотка 20: секция паспорта (VelDocumentUpload) живёт здесь ТОЛЬКО до verify.
 * После accept слот #upload пуст — карточка переезжает во вкладку Profilo
 * (см. VelAccount.vue → docsAccepted). Договор и список accepted остаются.
 *
 * ПАНЕЛИ ПРИХОДЯТ СЛОТАМИ из VelAccountFlow: один инстанс upload, не два.
 */
const { t } = useI18n()
const slots = useSlots()
const { documents, steps } = useAccount()
const { documentsUploaded } = storeToRefs(useAccountStore())
const { level } = useCommission()
const { select } = useCabinetTab()

const hasDocs = computed(() => documents.value.length > 0)
const hasUpload = computed(() => typeof slots.upload === 'function')

/**
 * CPI на Documenti с L3 и дальше всегда:
 * генерация / ready / после оплаты / L4+ — сертификат не пропадает.
 * (Раньше: только isPolicyBuild || isPolicyIssued → на L4 «через раз» исчезал.)
 */
const showPolicyStub = computed(() => level.value >= 3)

/** После accept секция ID уехала в Profilo — короткая подсказка. */
const docsMovedToProfile = computed(
  () =>
    !hasUpload.value &&
    (documentsUploaded.value === true ||
      steps.value.find((s) => s.id === 'documents')?.status === 'done'),
)
</script>

<template>
  <div class="vel-docs-page">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="vel-docs-page__heading">
      {{ t('account.pages.documents.title') }}
    </h2>

    <!--
      Якорь vel-account-documents: пока паспорт не accepted — здесь.
      После verify слот пуст, id переезжает в Profilo (см. VelCabinetProfile).
    -->
    <section
      v-if="hasUpload"
      id="vel-account-documents"
      class="vel-docs-page__panel"
    >
      <slot name="upload" />
    </section>

    <div
      v-else-if="docsMovedToProfile"
      class="vel-docs-page__moved"
      role="status"
    >
      <p class="vel-docs-page__moved-text m-0">
        {{ t('account.pages.documents.movedToProfile') }}
      </p>
      <VelButton type="button" variant="outline" @click="select('profile')">
        {{ t('account.pages.documents.openProfile') }}
      </VelButton>
    </div>

    <!-- L3: заготовка полиса CPI, пока сертификат формируется (фотка Documenti). -->
    <VelPolicyStub v-if="showPolicyStub" />

    <section id="vel-account-signature" class="vel-docs-page__panel">
      <slot name="contract" />
    </section>

    <!-- Принятые сервером файлы. Пока список пуст, блока нет вовсе: строка
         «ничего не принято» ниже двух рабочих панелей читалась бы как ошибка,
         хотя человек только что всё отправил. -->
    <section v-if="hasDocs" class="vel-docs-page__accepted">
      <h3 class="vel-docs-page__subhead">{{ t('account.pages.documents.listLabel') }}</h3>

      <ul class="vel-docs-page__list">
        <li v-for="document in documents" :key="document.kind">
          <VelDocumentCard :doc="document" />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.vel-docs-page {
  display: flex;
  flex-direction: column;
  gap: var(--vel-cab-gap, 0.7rem);
  /* На всю ширину main — как «бровь» */
  width: 100%;
  max-inline-size: none;
}

.vel-docs-page__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: clamp(1.15rem, 3.5vw, 1.3rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Фокус приходит программно после смены раздела — рамка была бы шумом.
   :focus-visible из base остаётся, клавиатурный фокус видно. */
.vel-docs-page__heading:focus:not(:focus-visible) {
  outline: none;
}

/* Пустой слот не должен оставлять дыру: панель договора не смонтирована,
   пока нечего подписывать. */
.vel-docs-page__panel:empty {
  display: none;
}

.vel-docs-page__moved {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 1rem 1.125rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background: color-mix(in oklab, var(--color-success) 8%, var(--color-surface));
}

.vel-docs-page__moved-text {
  flex: 1 1 12rem;
  color: var(--color-success);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
}

.vel-docs-page__accepted {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.vel-docs-page__subhead {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.vel-docs-page__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
