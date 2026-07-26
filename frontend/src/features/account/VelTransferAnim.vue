<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { useAccount } from '@/composables/useAccount'
import { usePanelMotion } from '@/composables/usePanelMotion'
import VelTransferScene from '@/features/account/VelTransferScene.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'
import VelScanLine from '@/components/magic/VelScanLine.vue'

/** L2/L4: сцена перевода на канвасе + border-beam + scan — экран ожидания. */
const { t } = useI18n()
const { animationProgress, animationRemainingMs, level, isFailed } = useCommission()
const { approvedAmount, client, transferAccountTail } = useAccount()

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const recipientName = computed(() => client.value.fullName)

/*
 * НАДПИСИ КАРТОЧКИ ЗАВИСЯТ ОТ СОСТОЯНИЯ. При отказе сцена остаётся на экране
 * (VelAccountFlow добавляет её под карточкой отказа), и заголовок «перевод в
 * процессе» с просьбой не закрывать страницу оказывался бы прямой неправдой:
 * он противоречил и подписи рисунка, и карточке отказа над ним. Скринридер
 * читает всё это подряд одним потоком, поэтому противоречие слышно особенно
 * отчётливо.
 */
const overline = computed(() =>
  isFailed.value
    ? t('account.commission.anim.overlineFailed', { level: level.value })
    : t('account.commission.anim.overline', { level: level.value }),
)
const title = computed(() =>
  isFailed.value ? t('account.commission.anim.titleFailed') : t('account.commission.anim.title'),
)
const lead = computed(() =>
  isFailed.value ? t('account.commission.anim.leadFailed') : t('account.commission.anim.lead'),
)
</script>

<template>
  <section
    ref="root"
    class="relative flex flex-col gap-3 overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
  >
    <VelBorderBeam :duration-ms="4800" :size="72" />
    <VelScanLine class="absolute inset-x-0 bottom-0 z-[1]" />

    <div class="relative z-[1] flex items-start gap-3">
      <span class="vel-pulse-mark shrink-0 text-accent-deep">
        <VelAccountSign sign="bank" size="lg" />
      </span>
      <div class="min-w-0">
        <!-- Надстройка остаётся: она несёт УРОВЕНЬ, которого в сцене нет. -->
        <p class="vel-label">{{ overline }}</p>
        <!-- Заголовок остаётся тоже: надпись на канвасе заголовком для
             скринридера не является, а структуре документа <h2> нужен. -->
        <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
          {{ title }}
        </h2>
      </div>
    </div>

    <p class="relative z-[1] m-0 text-sm text-muted">{{ lead }}</p>

    <div class="relative z-[1]">
      <!--
        СУММА, ПРОЦЕНТ И ОСТАТОК ВРЕМЕНИ ИЗ ЭТОЙ КАРТОЧКИ УБРАНЫ, и это не
        упущение. Интерфейсный слой самой сцены рисует их крупно и рядом с
        полосой прогресса — оставленные снаружи, они показывали бы одно и то же
        дважды, причём вторым, более мелким кеглем сразу под крупным.

        Текстовая доступность от этого не пострадала: канвас недоступен
        скринридеру В ПРИНЦИПЕ, поэтому VelTransferScene держит внутри себя
        sr-only-строку со суммой, процентом, остатком и состоянием (плюс
        отдельную живую область на события). Числа там те же и приходят теми же
        пропами.

        Строка выше остаётся: в успешном состоянии это anim.lead («не
        закрывайте страницу»), которого в сцене нет, а в состоянии отказа —
        anim.leadFailed, потому что просьба не закрывать страницу после срыва
        перевода была бы прямой неправдой.

        failed передаётся сюда, а не разводится на два экрана: владелец продукта просил,
        чтобы движение НЕ прекращалось — деньги из банка идут, до получателя не
        доходят. Сцена одна, меняется только её состояние, и меняется НЕ ТОЛЬКО
        цветом: значок «проверено» становится треугольником с «!», третий шаг
        получает прочерк, кольца-импульсы — штриховыми, торец полосы зубчатым.
      -->
      <VelTransferScene
        :progress="animationProgress"
        :amount="approvedAmount"
        :name="recipientName"
        :iban="transferAccountTail"
        :remaining-ms="animationRemainingMs"
        :failed="isFailed"
      />
    </div>
  </section>
</template>

<style scoped>
.vel-pulse-mark {
  animation: vel-soft-pulse 2.4s ease-in-out infinite;
}

@keyframes vel-soft-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.72;
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pulse-mark {
    animation: none;
  }
}
</style>
