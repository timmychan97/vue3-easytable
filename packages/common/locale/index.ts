import type { LocaleMessage } from './types'
import locale from '@easytable/ve-locale'
import { isFunction } from '../utils/index'

export function createI18N(compName: keyof LocaleMessage) {
  return function (path: string, ...args: any[]) {
    let result = ''

    const messages = locale.getMessage()

    if (messages[compName]) {
      const message = messages[compName][path]
      result = isFunction(message) ? message(...args) : message
    }
    else {
      console.error(
        `can't find ${compName} in ${JSON.stringify(messages)}`,
      )
    }

    return result
  }
}
