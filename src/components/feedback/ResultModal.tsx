import type { ResultModalState } from "../../types";

export function ResultModal({
  result,
  onClose,
}: {
  result: ResultModalState | null;
  onClose: () => void;
}) {
  if (!result) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          className="absolute right-3 top-3 text-2xl leading-none text-slate-400 hover:text-slate-600"
          onClick={onClose}
          type="button"
          aria-label="Cerrar"
        >
          &times;
        </button>
        <div
          className={`text-lg font-semibold ${
            result.status === "success" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {result.title}
        </div>
        <p className="mt-3 text-sm text-slate-600">{result.description}</p>
        <div className="mt-6 flex justify-end">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
