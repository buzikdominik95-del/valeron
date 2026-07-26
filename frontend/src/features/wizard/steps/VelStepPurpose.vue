<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import { useWizard } from '@/composables/useWizard'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import { CREDIT_PURPOSES } from '@/types/velora'
import type { CreditPurpose } from '@/types/velora'
import VelPurposeCard from '@/features/wizard/VelPurposeCard.vue'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Шаг 20%: цель кредита. Первый экран мастера.
 *
 * Подписи целей берём из simulator.purposes.* — те же, что в калькуляторе
 * на лендинге. Дублировать их отдельным списком нельзя: разъедутся.
 *
 * Карточки целей выезжают очередью — иначе шесть одинаковых плиток
 * читаются как один серый блок.
 */
const { t } = useI18n()
const { next } = useWizard()
const { purpose } = useCreditSimulator()

/** Общее имя группы радиокнопок: без него стрелки ходят по всей странице. */
const groupName = `vel-purpose-${useId()}`
const root = useTemplateRef<HTMLElement>('root')
useStaggerReveal(root, { y: 20, stagger: 0.06, duration: 0.4, delay: 0.05 })

const items = computed(() =>
  CREDIT_PURPOSES.map((key) => ({
    key,
    title: t(`simulator.purposes.${key}`),
    hint: t(`wizard.purpose.hints.${key}`),
  })),
)

const canContinue = computed(() => purpose.value !== '')

function select(value: CreditPurpose): void {
  purpose.value = value
}
</script>

<template>
  <div ref="root" class="flex flex-col items-center gap-8 text-center">
    <div data-reveal class="flex flex-col items-center gap-2">
      <p class="text-sm text-accent">{{ t('wizard.purpose.lead') }}</p>
      <h1 class="max-w-xl text-2xl sm:text-3xl">{{ t('wizard.purpose.title') }}</h1>
      <p class="text-xs text-faint">{{ t('wizard.purpose.required') }}</p>
    </div>

    <!-- fieldset + legend: скринридер объявляет вопрос перед вариантами
         и считает их количество. Заголовок вопроса уже есть в h1, поэтому
         легенда скрыта визуально, но не от вспомогательных технологий. -->
    <fieldset class="w-full max-w-2xl border-0 p-0">
      <legend class="sr-only">{{ t('wizard.purpose.title') }}</legend>

      <div class="grid gap-4 sm:grid-cols-2">
        <VelPurposeCard
          v-for="item in items"
          :key="item.key"
          data-reveal
          :purpose="item.key"
          :name="groupName"
          :title="item.title"
          :hint="item.hint"
          :checked="purpose === item.key"
          @select="select"
        />
      </div>
    </fieldset>
  </div>

  <Teleport to="#vel-wizard-actions" defer>
    <VelButton type="button" :disabled="!canContinue" @click="next">
      {{ t('wizard.next') }}
      <span aria-hidden="true">→</span>
    </VelButton>
  </Teleport>
</template>
