import { type Ref, onMounted, onUnmounted, ref } from 'vue'

import { useGlobalSeedStore } from '@/stores/globalSeedStore'

import { numberControlRegistry } from '../services/NumberControlRegistry'

export enum NumberControlMode {
  FIXED = 'fixed',
  INCREMENT = 'increment',
  DECREMENT = 'decrement',
  RANDOMIZE = 'randomize',
  LINK_TO_GLOBAL = 'linkToGlobal'
}

interface NumberControlOptions {
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

export function useNumberControl(
  modelValue: Ref<number>,
  options: NumberControlOptions
) {
  const controlMode = ref<NumberControlMode>(NumberControlMode.FIXED)
  const controlId = Symbol('numberControl')
  const globalSeedStore = useGlobalSeedStore()

  const applyControl = () => {
    const { min = 0, max = 1000000, step = 1, onChange } = options

    let newValue: number
    switch (controlMode.value) {
      case NumberControlMode.FIXED:
        // Do nothing - keep current value
        return
      case NumberControlMode.INCREMENT:
        newValue = Math.min(max, modelValue.value + step)
        break
      case NumberControlMode.DECREMENT:
        newValue = Math.max(min, modelValue.value - step)
        break
      case NumberControlMode.RANDOMIZE:
        newValue = Math.floor(Math.random() * (max - min + 1)) + min
        break
      case NumberControlMode.LINK_TO_GLOBAL:
        // Use global seed value, constrained by min/max
        newValue = Math.max(min, Math.min(max, globalSeedStore.globalSeed))
        break
      default:
        return
    }

    if (onChange) {
      onChange(newValue)
    } else {
      modelValue.value = newValue
    }
  }

  // Register with singleton registry
  onMounted(() => {
    numberControlRegistry.register(controlId, applyControl)
  })

  // Cleanup on unmount
  onUnmounted(() => {
    numberControlRegistry.unregister(controlId)
  })

  return {
    controlMode,
    applyControl
  }
}
