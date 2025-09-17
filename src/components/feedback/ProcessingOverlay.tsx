export function ProcessingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 px-4 text-white"
      role="status"
      aria-live="assertive"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <div className="text-lg font-semibold uppercase tracking-wide">Procesando…</div>
      <p className="text-center text-sm text-slate-200">
        Espera la confirmación de la red para completar tu transacción.
      </p>
    </div>
  );
}
