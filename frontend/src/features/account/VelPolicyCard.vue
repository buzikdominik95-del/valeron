<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { accountStepHref } from '@/features/account/account-anchors'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Полис CPI в двух состояниях: сертификат на проверке либо выпущен.
 *
 * Состояние берётся из дела клиента (useAccount) и здесь не досочиняется:
 * карточка не переключает себя по таймеру и не решает, выпущен ли полис.
 * До появления API состояние остаётся тем, что пришло в заглушке контракта.
 *
 * Один компонент на оба состояния, а не два файла: это одна карточка, у которой
 * меняются надзаголовок, заголовок, текст и подпись кнопки. Разложив её на два
 * файла, мы получили бы две копии одной вёрстки, расходящиеся при первой правке.
 * Различие вынесено в ключи локали — account.policy.pending.* и .issued.*.
 *
 * Вместо эмодзи оригинала (🛡️ ⏳ ✅) — линейные знаки: щит, часы и щит
 * с галочкой, см. VelAccountSign.
 *
 * Куда ведут кнопки, карточка не решает: события уходят наружу.
 */
const emit = defineEmits<{
  /** «Consulta e conferma» — полис выпущен, деньги можно забирать. */
  review: []
}>()

const { t } = useI18n()

const { isPolicyIssued, policyEtaMinutes } = useAccount()

/** Ветка локали. Обе половины ключей лежат под account.policy.<state>. */
const state = computed(() => (isPolicyIssued.value ? 'issued' : 'pending'))

const etaText = computed(() =>
  t('account.policy.pending.eta', { minutes: policyEtaMinutes.value }),
)

/*
 * «Vai ai documenti» — переход к панели документов на этом же экране, поэтому
 * настоящая ссылка на якорь, а не кнопка: тот же довод, что в account-anchors.
 * У выпущенного полиса действие другое — «посмотреть и подтвердить», — и оно
 * уходит наружу событием: что показывать, решает экран, а не карточка.
 */
const documentsHref = computed(() => accountStepHref('documents'))
</script>

<template>
  <section class="vel-policy" :class="{ 'vel-policy--issued': isPolicyIssued }">
    <div class="vel-policy__head">
      <span class="vel-policy__mark" aria-hidden="true">
        <VelAccountSign :sign="isPolicyIssued ? 'shield-check' : 'shield'" size="lg" />
      </span>

      <div class="flex min-w-0 flex-col gap-1">
        <p class="vel-label">{{ t(`account.policy.${state}.overline`) }}</p>
        <h2 class="text-xl sm:text-2xl">{{ t(`account.policy.${state}.title`) }}</h2>
      </div>
    </div>

    <p class="text-sm text-muted">{{ t(`account.policy.${state}.body`) }}</p>

    <!-- Строка проверки есть только у полиса на рассмотрении: у выпущенного
         ждать нечего, и пустая строка с часами читалась бы как «всё ещё идёт». -->
    <p v-if="!isPolicyIssued" class="vel-policy__status">
      <VelAccountSign sign="clock" class="vel-policy__status-sign" />
      <span class="flex-1">{{ t('account.policy.pending.status') }}</span>
      <span class="vel-num vel-policy__eta">{{ etaText }}</span>
    </p>

    <VelButton v-if="isPolicyIssued" block @click="emit('review')">
      {{ t('account.policy.issued.cta') }}
    </VelButton>

    <VelButton v-else variant="outline" block :href="documentsHref">
      {{ t('account.policy.pending.cta') }}
    </VelButton>
  </section>
</template>

<style scoped>
.vel-policy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

/* Выпущенный полис — единственное место карточки, где рамка меняет цвет.
   Сам по себе цвет ничего не сообщает: состояние названо словами в
   надзаголовке и показано другим знаком (щит с галочкой). */
.vel-policy--issued {
  border-color: var(--color-accent);
}

.vel-policy__head {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.vel-policy__mark {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-policy--issued .vel-policy__mark {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.vel-policy__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-ground);
  color: var(--color-fg);
  font-size: 0.875rem;
}

.vel-policy__status-sign {
  color: var(--color-accent);
}

.vel-policy__eta {
  color: var(--color-accent-deep);
  font-weight: 600;
  white-space: nowrap;
}
</style>
