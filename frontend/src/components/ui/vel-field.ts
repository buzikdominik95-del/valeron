import type { InjectionKey } from 'vue'
import type { VelFieldContext } from '@/types/velora'

/** Через этот ключ VelField передаёт вложенному контролу id и связку с подписью. */
export const VEL_FIELD_KEY: InjectionKey<VelFieldContext> = Symbol('vel-field')
