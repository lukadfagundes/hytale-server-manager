import { useToastStore } from '../../stores/toast-store';

const typeStyles = {
  error: 'bg-red-900/90 border-red-500/50 text-red-100',
  warning: 'bg-yellow-900/90 border-yellow-500/50 text-yellow-100',
  info: 'bg-blue-900/90 border-blue-500/50 text-blue-100',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  // Always render container so ARIA live region is established before toasts appear
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`px-4 py-3 rounded-lg border text-sm shadow-lg cursor-pointer ${typeStyles[toast.type]}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
