<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import VelAccountCard from '@/features/account/VelAccountCard.vue'
import VelStepTracker from '@/features/account/VelStepTracker.vue'

/**
 * Home: баланс и вывод на первом плане, анимация/воронка сразу под ними.
 * Карточка клиента и трекер — ниже, чтобы не отодвигали сумму.
 */
const { t } = useI18n()
</script>

<template>
  <div class="vel-home">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="vel-home__heading">
      {{ t('account.pages.home.title') }}
    </h2>

    <div class="vel-home__grid">
      <div class="vel-home__main">
        <!-- 1. Баланс + Вывести  2. Анимация/воронка сразу под балансом -->
        <div class="vel-home__focus">
          <div class="vel-home__balance">
            <slot name="summary" />
          </div>
          <div class="vel-home__transfer">
            <slot name="transfer" />
          </div>
        </div>

        <VelAccountCard />
        <VelStepTracker />

        <div class="vel-home__panels">
          <div>
            <slot name="policy" />
          </div>
        </div>
      </div>

      <aside class="vel-home__side" :aria-label="t('account.shell.side')">
        <slot name="side" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.vel-home {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vel-home__heading:focus:not(:focus-visible) {
  outline: none;
}

.vel-home__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.vel-home__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
}

.vel-home__main,
.vel-home__panels,
.vel-home__side,
.vel-home__focus {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Баланс + воронка — единый «первый экран» без лишних щелей. */
.vel-home__focus {
  gap: 0.75rem;
}

.vel-home__transfer:empty {
  display: none;
}

.vel-home__panels > :empty {
  display: none;
}

.vel-home__side:empty {
  display: none;
}

@media (min-width: 64rem) {
  .vel-home__grid {
    grid-template-columns: minmax(0, 1fr) 18rem;
    align-items: start;
  }

  .vel-home__side {
    position: sticky;
    top: calc(
      var(--vel-shell-head-h, calc(var(--vel-header-h) + var(--vel-track-h, 0px))) + 1rem
    );
  }
}
</style>
