import { createContext, useContext } from 'react';

export type PushToast = (msg: string, icon?: 'check' | 'info' | 'warn') => void;

export const ToastContext = createContext<PushToast>(() => {});

export function useToast(): PushToast {
  return useContext(ToastContext);
}
