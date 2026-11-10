import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastKind = 'info' | 'success' | 'warning' | 'danger'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  /** Nút xác nhận màu đỏ (chặn, xoá…). */
  danger?: boolean
  icon?: string
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

export const useUiStore = defineStore('ui', () => {
  const toast = reactive({ open: false, message: '', kind: 'info' as ToastKind })
  const confirmState = reactive<ConfirmState>({ open: false, title: '' })
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let resolver: ((v: boolean) => void) | undefined
  const busy = ref(false)

  function showToast(message: string, kind: ToastKind = 'info', ms = 2400) {
    toast.message = message
    toast.kind = kind
    toast.open = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.open = false), ms)
  }

  /** Mở bottom sheet xác nhận, trả về true nếu người dùng đồng ý. */
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    resolver?.(false)
    Object.assign(confirmState, { confirmText: undefined, cancelText: undefined, danger: false, icon: undefined, message: undefined }, opts, { open: true })
    return new Promise<boolean>((resolve) => (resolver = resolve))
  }

  function answerConfirm(v: boolean) {
    confirmState.open = false
    resolver?.(v)
    resolver = undefined
  }

  return { toast, confirmState, busy, showToast, confirm, answerConfirm }
})
