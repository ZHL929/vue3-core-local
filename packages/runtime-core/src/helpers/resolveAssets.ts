import {
  currentInstance,
  ConcreteComponent,
  ComponentOptions,
  getComponentName
} from '../component'
import { currentRenderingInstance } from '../componentRenderContext'
import { Directive } from '../directives'
import { camelize, capitalize, isString } from '@vue/shared'
import { warn } from '../warning'
import { VNodeTypes } from '../vnode'

export const COMPONENTS = 'components'
export const DIRECTIVES = 'directives'
export const FILTERS = 'filters'

export type AssetTypes = typeof COMPONENTS | typeof DIRECTIVES | typeof FILTERS

/**
 * @private
 */
export function resolveComponent(
  name: string,
  maybeSelfReference?: boolean
): ConcreteComponent | string {
  return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name
}

export const NULL_DYNAMIC_COMPONENT = Symbol.for('v-ndc')

/**
 * @private
 */
export function resolveDynamicComponent(component: unknown): VNodeTypes {
  // 如果component是字符串去做处理
  if (isString(component)) {
    return resolveAsset(COMPONENTS, component, false) || component
  } else {
    // 如果是对象直接返回 然后调用 render 重新 patch 重新去创建组件
    // invalid types will fallthrough to createVNode and raise warning
    return (component || NULL_DYNAMIC_COMPONENT) as any
  }
}

/**
 * @private
 */
export function resolveDirective(name: string): Directive | undefined {
  return resolveAsset(DIRECTIVES, name)
}

/**
 * v2 compat only
 * @internal
 */
export function resolveFilter(name: string): Function | undefined {
  return resolveAsset(FILTERS, name)
}

/**
 * @private
 * overload 1: components
 */
function resolveAsset(
  type: typeof COMPONENTS,
  name: string,
  warnMissing?: boolean,
  maybeSelfReference?: boolean
): ConcreteComponent | undefined
// overload 2: directives
function resolveAsset(
  type: typeof DIRECTIVES,
  name: string
): Directive | undefined
// implementation
// overload 3: filters (compat only)
function resolveAsset(type: typeof FILTERS, name: string): Function | undefined
// implementation
function resolveAsset(
  type: AssetTypes,
  name: string, // 组件的名称
  warnMissing = true,
  maybeSelfReference = false
) {
  const instance = currentRenderingInstance || currentInstance //获取组件实例
  if (instance) {
    const Component = instance.type // 当前组件的render setup template

    // explicit self name has highest priority
    if (type === COMPONENTS) {
      const selfName = getComponentName(
        Component,
        false /* do not include inferred name to avoid breaking existing code */
      )
      if (
        selfName &&
        (selfName === name ||
          selfName === camelize(name) ||
          selfName === capitalize(camelize(name)))
      ) {
        return Component
      }
    }
    // res 当前要切换的组件
    const res =
      // local registration
      // check instance[type] first which is resolved for options API
      // 局部注册
      resolve(instance[type] || (Component as ComponentOptions)[type], name) ||
      // global registration
      // 全局注册
      resolve(instance.appContext[type], name)

    if (!res && maybeSelfReference) {
      // fallback to implicit self-reference
      return Component
    }

    if (__DEV__ && warnMissing && !res) {
      const extra =
        type === COMPONENTS
          ? `\nIf this is a native custom element, make sure to exclude it from ` +
            `component resolution via compilerOptions.isCustomElement.`
          : ``
      warn(`Failed to resolve ${type.slice(0, -1)}: ${name}${extra}`)
    }

    return res
  } else if (__DEV__) {
    warn(
      `resolve${capitalize(type.slice(0, -1))} ` +
        `can only be used in render() or setup().`
    )
  }
}

function resolve(registry: Record<string, any> | undefined, name: string) {
  return (
    registry &&
    (registry[name] ||
      registry[camelize(name)] ||
      registry[capitalize(camelize(name))])
  )
}
