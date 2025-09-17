export function NoticeBanner({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
      <span>{message}</span>
      {onClose && (
        <button
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          onClick={onClose}
          type="button"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
