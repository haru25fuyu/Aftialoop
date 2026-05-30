import React, { createContext, useContext, useState, useCallback } from "react";
import { s } from "../styles/component/ToastProvider.styles";

type ToastType = "success" | "error" | "warning" | "default";
type Toast = { id: number; message: string; type: ToastType; };
type ToastContextType = { showToast: (message: string, type?: ToastType) => void; };

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext).showToast;

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const showToast = useCallback((message: string, type: ToastType = "default") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const toastStyle = (type: ToastType) => ({
    ...s.toast,
    ...(type === "success" ? s.toastSuccess : type === "error" ? s.toastError : type === "warning" ? s.toastWarning : {}),
  });

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={s.container}>
        {toasts.map((t) => <div key={t.id} style={toastStyle(t.type)}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
