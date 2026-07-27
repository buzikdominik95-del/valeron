<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'

/**
 * Заготовка полиса CPI на вкладке Documenti (L3 · policy_build).
 * Пока сертификат «готовится» на Home — здесь формируется визуальная
 * bozza: шаблон policy-template.png проявляется по progress.
 */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`

const { t } = useI18n()
const { client } = useAccount()
const { policyProgress, isPolicyBuild, level } = useCommission()

const visible = computed(() => level.value === 3 && isPolicyBuild.value)

/** 0…1, не ниже 0.06 чтобы лист уже был чуть виден. */
const reveal = computed(() => Math.min(1, Math.max(0.06, policyProgress.value)))

const pct = computed(() => Math.round(reveal.value * 100))

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

/** Имя проявляется ближе к концу генерации. */
const showName = computed(() => reveal.value >= 0.45)

const statusKey = computed(() => {
  if (reveal.value >= 0.92) return 'almost'
  if (reveal.value >= 0.45) return 'filling'
  return 'draft'
})
</script>

<template>
  <section
    v-if="visible"
    class="vel-pstub"
    data-testid="policy-stub"
    :aria-label="t('account.commission.cpi.stub.region')"
  >
    <div class="vel-pstub__bar">
      <p class="vel-pstub__lead m-0">{{ t('account.commission.cpi.stub.lead') }}</p>
      <span class="vel-pstub__badge">{{ t(`account.commission.cpi.stub.status.${statusKey}`) }}</span>
    </div>

    <div class="vel-pstub__head">
      <h3 class="vel-pstub__title m-0">{{ t('account.commission.cpi.stub.title') }}</h3>
      <p class="vel-pstub__sub m-0">{{ t('account.commission.cpi.stub.subtitle') }}</p>
    </div>

    <div class="vel-pstub__meter" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
      <span class="vel-pstub__meter-fill" :style="{ transform: `scaleX(${reveal})` }" />
    </div>
    <p class="vel-pstub__pct vel-num m-0">
      {{ t('account.commission.cpi.pct', { value: pct }) }}
    </p>

    <!-- Лист-заготовка: шаблон проявляется сверху вниз -->
    <div class="vel-pstub__frame">
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

.vel-pstub__title {
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

.vel-pstub__pct {
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.vel-pstub__frame {
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-fg) 4%, transparent);
}

.vel-pstub__sheet {
  --vel-pstub-reveal: 0.1;

  position: relative;
  display: block;
  width: 100%;
  /* Проявление листа сверху вниз */
  clip-path: inset(0 0 calc((1 - var(--vel-pstub-reveal)) * 100%) 0);
  transition: clip-path 450ms ease;
}

.vel-pstub__img {
  display: block;
  width: 100%;
  height: auto;
  filter: saturate(0.92);
}

/* Имя клиента на шаблоне (как в consult-диалоге). */
.vel-pstub__name {
  position: absolute;
  left: 43%;
  top: 35.4%;
  max-width: 45%;
  overflow: hidden;
  color: #111;
  font-size: clamp(0.55rem, 2vw, 0.75rem);
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
  animation: vel-pstub-name-in 500ms ease both;
}

/* «Туман» на ещё не «напечатанной» части */
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

.vel-pstub__hint {
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.4;
}

@keyframes vel-pstub-name-in {
  from {
    opacity: 0;
    transform: translateY(0.25rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pstub__sheet,
  .vel-pstub__meter-fill,
  .vel-pstub__scan {
    transition: none;
  }

  .vel-pstub__name {
    animation: none;
  }
}
</style>
