<script setup lang="ts">
import { ref } from 'vue'
import { useWizard } from '@/composables/useWizard'
import { useAppView } from '@/composables/useAppView'
import { useSimulatorStore } from '@/stores/simulator.store'
import VelRegisterDialog from '@/features/wizard/VelRegisterDialog.vue'
import VelWizard from '@/features/wizard/VelWizard.vue'
import VelStepTransition from '@/features/wizard/VelStepTransition.vue'
import VelStepPurpose from '@/features/wizard/steps/VelStepPurpose.vue'
import VelStepAmount from '@/features/wizard/steps/VelStepAmount.vue'
import VelStepDuration from '@/features/wizard/steps/VelStepDuration.vue'
import VelStepIdentity from '@/features/wizard/steps/VelStepIdentity.vue'
import VelStepAnalysis from '@/features/wizard/steps/VelStepAnalysis.vue'
import VelStepFinalizing from '@/features/wizard/steps/VelStepFinalizing.vue'
import VelStepResult from '@/features/wizard/steps/VelStepResult.vue'

/**
 * Показывает шаг, соответствующий ?step=... Оболочка монтируется здесь ОДИН раз
 * и переживает смену шагов — только так полоса прогресса едет от прошлого
 * значения к новому, а не возникает на новом месте.
 *
 * Свою кнопку «дальше» каждый шаг телепортирует в #vel-wizard-actions.
 * Экраны анализа и финализации кнопки не имеют: они сами сообщают done —
 * первый когда опрос закончен, второй по истечении своей паузы.
 *
 * Сменой шагов на экране заведует VelStepTransition: он и держит паузу между
 * уходом старого и приходом нового, и знает, в какую сторону их двигать.
 */
const { step, next, close } = useWizard()
const { openEmailSent } = useAppView()
const simulator = useSimulatorStore()

/**
 * Кнопка результата открывает окно создания кабинета.
 *
 * Раньше она уводила прямо к экрану письма, и шаг регистрации выпадал целиком:
 * письмо приходило неизвестно на какой адрес. Теперь между ними стоит окно —
 * как на эталоне.
 */
const registerOpen = ref(false)

/**
 * Кабинет создан — дальше экран письма, затем сам кабинет.
 * Мастер при этом закрываем: возвращаться в него уже некуда, а оставленный
 * ?step висел бы в ссылке мёртвым хвостом.
 *
 * СЮДА ПРИХОДИТ ТОЛЬКО ПОЧТА. Пароль остаётся в окне и никуда не сохраняется —
 * почему именно так, написано в шапке VelRegisterDialog.
 */
function onRegistered(email: string): void {
  simulator.email = email
  registerOpen.value = false
  openEmailSent()
  close()
}
</script>

<template>
  <VelWizard>
    <VelStepTransition>
      <VelStepPurpose v-if="step === 'purpose'" />
      <VelStepAmount v-else-if="step === 'amount'" />
      <VelStepDuration v-else-if="step === 'duration'" />
      <VelStepIdentity v-else-if="step === 'identity'" />
      <VelStepAnalysis v-else-if="step === 'analysis'" @done="next" />
      <VelStepFinalizing v-else-if="step === 'finalizing'" @done="next" />
      <VelStepResult v-else @cta="registerOpen = true" />
    </VelStepTransition>

    <!-- Окно поверх мастера: оно закрывает собой шаг результата, а не заменяет
         его, поэтому лежит рядом со сценой шагов, а не внутри перехода. -->
    <VelRegisterDialog v-model:open="registerOpen" @registered="onRegistered" />
  </VelWizard>
</template>
