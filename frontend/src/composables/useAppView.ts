import { computed, nextTick, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useViewParams } from '@/composables/useViewParams'

/**
 * Верхний уровень приложения: лендинг, экран письма или кабинет.
 *
 * Мастер заявки сюда не входит — им управляет useWizard через ?step=…,
 * и два параметра не спорят: ?step без ?view открывает мастер, ?view
 * перекрывает его, потому что после регистрации возвращаться в мастер
 * пользователю уже некуда.
 *
 * Состояние живёт в адресе по той же причине, что и шаг мастера:
 * переживает перезагрузку и копируется ссылкой.
 */
export const APP_VIEWS = ['email', 'cabinet'] as const

export type AccountView = (typeof APP_VIEWS)[number]

export function isAccountView(value: unknown): value is AccountView {
  return typeof value === 'string' && (APP_VIEWS as readonly string[]).includes(value)
}

export interface AppViewApi {
  view: ComputedRef<AccountView | null>
  isAccount: ComputedRef<boolean>
  /** Ключ remount экрана письма (2–3-я регистрация перезапускает анимацию). */
  emailEpoch: Ref<number>
  openEmailSent(): void
  openCabinet(): void
  backToSite(): void
}

function createAppView(): AppViewApi {
  /*
   * Параметры адресной строки — общим экземпляром на всё приложение
   * (useViewParams), а не своим. Каждый useUrlSearchParams собирает строку
   * запроса заново только из того, что знает сам: своя копия здесь выкидывала
   * бы ?step мастера, а копия мастера — этот ?view. Плюс копии не видят записей
   * друг друга (replaceState не поднимает popstate), и закрытый экран
   * продолжал бы считать себя открытым.
   */
  const params = useViewParams()

  // Мусорный ?view=zzz чиним сразу, а не только на чтение: иначе он остаётся
  // в ссылке, которой пользователь потом делится.
  if (params.view !== undefined && !isAccountView(params.view)) {
    delete params.view
  }

  const view = computed<AccountView | null>(() =>
    isAccountView(params.view) ? params.view : null,
  )

  const isAccount = computed(() => view.value !== null)

  /**
   * Счётчик сессий экрана письма. Без него повторная регистрация при уже
   * открытом ?view=email не размонтирует VelEmailSent — таймер фаз не
   * перезапускается, анимация «залипает» или белеет.
   */
  const emailEpoch = ref(0)

  /**
   * Вход в кабинет — новая запись истории, а переходы внутри заменяют текущую.
   * Тот же приём, что при входе в мастер: без дубля системная кнопка «назад»
   * уводила бы с сайта вместо возврата на предыдущий экран.
   */
  function enter(next: AccountView): void {
    if (!isAccount.value) window.history.pushState({}, '', window.location.href)
    params.view = next
  }

  function openEmailSent(): void {
    emailEpoch.value += 1
    /* Уже на email: снять и вернуть view, чтобы v-if гарантированно remount. */
    if (params.view === 'email') {
      delete params.view
      void nextTick(() => {
        enter('email')
      })
      return
    }
    enter('email')
  }

  function openCabinet(): void {
    enter('cabinet')
  }

  function backToSite(): void {
    delete params.view
  }

  return { view, isAccount, emailEpoch, openEmailSent, openCabinet, backToSite }
}

/** Состояние общее на приложение — см. обоснование в useWizard. */
const useSharedAppView = createSharedComposable(createAppView)

export function useAppView(): AppViewApi {
  return useSharedAppView()
}
