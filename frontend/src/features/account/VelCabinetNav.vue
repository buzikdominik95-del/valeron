<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCabinetNav } from '@/composables/useCabinetNav'
import VelCabinetNavItem from '@/features/account/VelCabinetNavItem.vue'

/**
 * Навигация кабинета: Home, Profilo, Documenti, Assistenza.
 *
 * ОДНА РАЗМЕТКА, ДВА ОФОРМЛЕНИЯ. На широком экране это колонка слева, на узком
 * (< 64rem) — панель, прижатая к низу окна. Второе дерево пунктов под второй
 * экран не заводится намеренно: два списка расходятся при первой же правке —
 * пункт добавили в один, забыли в другом, — и часть кабинета становится
 * недостижимой ровно на половине ширин. Здесь один <ul>, а различаются только
 * стили внутри медиазапроса.
 *
 * ЭТО НАВИГАЦИЯ, А НЕ ВКЛАДКИ. Пункты — настоящие ссылки с href: раздел живёт
 * в адресной строке (?tab=…), значит его можно открыть в новой вкладке,
 * скопировать и переслать. Роли tab/tablist здесь были бы враньём: они
 * обещают скринридеру клавиатурную модель вкладок (стрелки, Home/End), а у нас
 * обычный список ссылок.
 *
 * ЧТО ОСТАЛОСЬ ЗДЕСЬ. Только оболочка: <nav> с подписью, список и раскладка
 * панели — то есть всё, что зависит от РАЗМЕРА ОКНА и полей устройства.
 * Пункт со значком, подписью и бейджем вынесен в VelCabinetNavItem, сборка
 * списка и разбор щелчка — в useCabinetNav. Разрез именно такой, потому что
 * прижатие панели к нижнему краю (safe-area, --vel-tabbar-h) и оформление
 * пункта правятся по разным поводам и в разное время.
 */
const { t } = useI18n()
const { items, onSelect } = useCabinetNav()
</script>

<template>
  <nav class="vel-cabinet-nav" :aria-label="t('account.nav.label')">
    <ul class="vel-cabinet-nav__list">
      <VelCabinetNavItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        @select="onSelect($event, item.id)"
      />
    </ul>
  </nav>
</template>

<style scoped>
/*
  УЗКИЙ ЭКРАН — панель у нижнего края окна.

  Отступ снизу считается вместе с env(safe-area-inset-bottom): на телефонах
  с жестовой полосой панель без этой добавки лежит ровно под ней, и нижний ряд
  пунктов перестаёт нажиматься. Высота панели и её отступ — переменные оболочки
  (--vel-tabbar-h и --vel-tabbar-gap): из тех же двух чисел оболочка считает
  нижнее поле контента, иначе последняя карточка уезжает под панель.
*/
.vel-cabinet-nav {
  position: fixed;
  /*
    Боковые отступы — не меньше --vel-tabbar-gap, а на телефоне в ландшафте ещё
    и не меньше выреза: с viewport-fit=cover окно доходит до самого края стекла,
    и без max() крайний пункт («Home») уезжает под «бровь». Там, где выреза нет,
    env() равен нулю и остаётся ровно тот же зазор, что был.
  */
  inset-inline:
    max(var(--vel-tabbar-gap), env(safe-area-inset-left))
    max(var(--vel-tabbar-gap), env(safe-area-inset-right));
  bottom: calc(var(--vel-tabbar-gap) + env(safe-area-inset-bottom));
  z-index: 30;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  box-shadow: 0 -2px 16px color-mix(in oklab, var(--color-accent-deep) 12%, transparent);
}

.vel-cabinet-nav__list {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  min-block-size: var(--vel-tabbar-h);
  margin: 0;
  padding: 0.3rem;
  list-style: none;
}

/*
  ШИРОКИЙ ЭКРАН — колонка слева. Панель перестаёт быть плавающей: белый столбец
  от шапки до низа окна, отделённый от светлого фона контента тонким краем.
  Сам список залипает под шапкой — при прокрутке длинной страницы меню остаётся
  на месте, как в эталоне.
*/
@media (min-width: 64rem) {
  .vel-cabinet-nav {
    position: static;
    z-index: auto;
    border: 0;
    border-inline-end: 1px solid var(--color-line);
    border-radius: 0;
    box-shadow: none;
  }

  /*
    ЗАЛИПАЕТ ПОД ВСЕЙ ШАПКОЙ, А НЕ ПОД ЕЁ ПЕРВОЙ ПОЛОСОЙ. В шапке кабинета
    две полосы: строка с логотипом и под ней полоса шагов, — и залипает шапка
    целиком. Пока здесь стояла высота одной только первой полосы, при
    прокрутке меню заезжало под полосу шагов и верхний пункт срезало
    наполовину: на экране это выглядело как съехавший сайдбар.

    ВЫСОТА ЗАМЕРЕНА, А НЕ ЗАШИТА. --vel-shell-head-h ставит useShellHeadHeight
    по настоящему размеру шапки. Складывать два объявленных числа
    (--vel-header-h + --vel-track-h) уже пробовали — они разошлись с
    действительностью на 6px, как только полоса шагов получила на широком
    экране шрифт покрупнее, и меню снова срезало. Запасное значение — сумма
    тех же двух чисел: оно работает до первого кадра, пока не пришёл замер.
  */
  .vel-cabinet-nav__list {
    position: sticky;
    top: var(--vel-shell-head-h, calc(var(--vel-header-h) + var(--vel-track-h, 0px)));
    flex-direction: column;
    gap: 0.3rem;
    min-block-size: 0;
    padding: 1rem 0.875rem;
  }
}
</style>
