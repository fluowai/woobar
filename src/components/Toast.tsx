import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: unknown) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++;
      setToasts(list => [...list.slice(-3), { id, kind, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const value: ToastContextValue = {
    toast,
    success: (m: string) => toast(m, 'success'),
    error: (e: unknown) => toast(e instanceof Error ? e.message : String(e || 'Erro inesperado'), 'error'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={[
              'cursor-pointer px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-[slideUp_.2s_ease-out]',
              t.kind === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
              t.kind === 'error' && 'bg-red-50 border-red-200 text-red-800',
              t.kind === 'info' && 'bg-stone-900 border-stone-800 text-white',
            ].filter(Boolean).join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
