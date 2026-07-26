<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelPhoto from '@/components/ui/VelPhoto.vue'
import appScreen from '@/img/app-accesso.webp'

const { t } = useI18n()
</script>

<template>
  <!-- Сцена секции: заголовок, абзац и снимок приложения одной пачкой -->
  <VelStage class="border-b border-line bg-surface">
    <div
      class="vel-section mx-auto grid w-full max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.15fr_minmax(0,20rem)] lg:gap-16"
    >
      <div>
        <!--
          Две строки одного заголовка, а не h2 + вложенный h3: иначе в дереве
          появился бы пустой уровень без собственного раздела. Перенос между
          ними задаёт сам VelSplitHeading — каждая строка там блок, поэтому
          <br> внутрь разбора на слова не попадает.

          Доступное имя собирается из обеих строк и остаётся одной фразой,
          несмотря на то что видимых слов здесь под десяток.
        -->
        <VelSplitHeading
          :lines="[
            { text: t('transfers.titleLead') },
            { text: t('transfers.titleTail'), tone: 'muted' },
          ]"
          class="max-w-4xl text-3xl sm:text-4xl lg:text-5xl"
        />

        <!-- .vel-measure вместо max-w-prose: prose — это 65ch, а ch считается
             по знаку «0», который заметно шире среднего. Замер на 1280 давал
             87 настоящих знаков в строке при норме ~75. -->
        <VelReveal as="p" class="vel-measure mt-8 text-muted lg:mt-12">
          {{ t('transfers.body') }}
        </VelReveal>
      </div>

      <VelReveal>
        <!-- cutout: файл уже вырезан по силуэту телефона и несёт свою альфу,
             поэтому оформление кадра снято — иначе размытая подложка VelPhoto
             вылезала бы из-под силуэта серым ореолом. Разбор — в
             .vel-photo--cutout у VelPhoto. -->
        <VelPhoto
          bleed="start"
          cutout
          :src="appScreen"
          :alt="t('photo.app')"
          :width="832"
          :height="1248"
          class="mx-auto max-w-xs lg:max-w-none"
        />
      </VelReveal>
    </div>
  </VelStage>
</template>
