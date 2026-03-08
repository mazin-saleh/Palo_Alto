import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
        role="status"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const colors = {
    success: 'bg-emerald-50 border-sage text-emerald-800',
    error: 'bg-coral-light border-coral text-red-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
  };

  return (
    <div
      onClick={onDismiss}
      role="alert"
      className={`${colors[toast.type] || colors.info} border-l-4 px-4 py-3 rounded-lg text-sm shadow-warm cursor-pointer transition-all duration-300 max-w-sm ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      {toast.message}
    </div>
  );
}
