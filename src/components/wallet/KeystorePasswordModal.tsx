import { FormEvent } from "react";

type KeystorePasswordModalProps = {
  open: boolean;
  password: string;
  confirmPassword: string;
  error: string | null;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function KeystorePasswordModal({
  open,
  password,
  confirmPassword,
  error,
  busy,
  onPasswordChange,
  onConfirmPasswordChange,
  onClose,
  onSubmit,
}: KeystorePasswordModalProps) {
  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy) {
      onSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          className="absolute right-3 top-3 text-2xl leading-none text-slate-400 hover:text-slate-600 disabled:opacity-50"
          onClick={onClose}
          type="button"
          aria-label="Cerrar"
          disabled={busy}
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold text-slate-800">Proteger keystore</h2>
        <p className="mt-2 text-sm text-slate-600">
          Esta contraseña cifrará tu archivo keystore. Debe tener al menos 8 caracteres.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="keystore-password">
              Contraseña
            </label>
            <input
              id="keystore-password"
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoFocus
              autoComplete="new-password"
              disabled={busy}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="keystore-password-confirm">
              Confirmar contraseña
            </label>
            <input
              id="keystore-password-confirm"
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              autoComplete="new-password"
              disabled={busy}
            />
          </div>

          {error ? <div className="text-sm text-rose-600">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              type="submit"
              disabled={busy}
            >
              Guardar keystore
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
