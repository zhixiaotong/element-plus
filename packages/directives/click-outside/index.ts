import isServer from '@element-plus/utils/isServer'
import { on } from '@element-plus/utils/dom'

import type { DirectiveBinding, ObjectDirective, ComponentPublicInstance } from 'vue'

type DocumentHandler = <T extends Event>(mouseup: T, mousedown: T) => void;

type FlushList = Map<
  HTMLElement,
  {
    documentHandler: DocumentHandler
    bindingFn: (...args: unknown[]) => unknown
  }
>;

const nodeList: FlushList = new Map()

let startClick: Event

if (!isServer) {
  on(document, 'mousedown', e => (startClick = e))
  on(document, 'mouseup', e => {
    for (const { documentHandler } of nodeList.values()) {
      documentHandler(e, startClick)
    }
  })
}

function createDocumentHandler(
  el: HTMLElement,
  binding: DirectiveBinding,
): DocumentHandler {
  const excluds = []
  if (binding.arg && binding.arg.length) {
    excluds.concat(Array.from(binding.arg))
  } else {
    excluds.push(binding.arg)
  }

  return function(mouseup, mousedown) {
    const popperRef = (binding.instance as ComponentPublicInstance<{
      popperRef: Nullable<HTMLElement>
    }>).popperRef

    const hasNoBinding = !binding || !binding.instance
    const targetExists = !mouseup.target || !mousedown.target
    const isInContain = el.contains(mouseup.target as Node) || el.contains(mousedown.target as Node)
    const isSelf = el === mouseup.target
    const isInExcluds = (excluds.length && excluds.some(item => item?.contains(mouseup.target))) || (excluds.length && excluds.includes(mouseup.target))
    const isInPopperRef = (popperRef &&
      (popperRef.contains(mouseup.target as Node) ||
        popperRef.contains(mousedown.target as Node)))

    if (
      hasNoBinding ||
      targetExists ||
      isInContain ||
      isSelf ||
      isInExcluds ||
      isInPopperRef
    ) {
      return
    }
    binding.value()
  }
}

const ClickOutside: ObjectDirective = {
  beforeMount(el, binding) {
    nodeList.set(el, {
      documentHandler: createDocumentHandler(el, binding),
      bindingFn: binding.value,
    })
  },
  updated(el, binding) {
    nodeList.set(el, {
      documentHandler: createDocumentHandler(el, binding),
      bindingFn: binding.value,
    })
  },
  unmounted(el) {
    nodeList.delete(el)
  },
}

export default ClickOutside
