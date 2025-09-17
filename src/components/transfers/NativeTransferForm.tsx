export type NativeTransferFormProps = {
  disabled: boolean;
  currencySymbol: string;
  form: { to: string; amount: string };
  onFormChange: (value: { to: string; amount: string }) => void;
  onSubmit: () => void;
};

export function NativeTransferForm({
  disabled,
  currencySymbol,
  form,
  onFormChange,
  onSubmit,
}: NativeTransferFormProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Enviar {currencySymbol}</h3>
      <input
        className="w-full rounded-lg border p-2"
        placeholder="0x destinatario"
        value={form.to}
        onChange={(event) => onFormChange({ ...form, to: event.target.value })}
      />
      <input
        className="w-full rounded-lg border p-2"
        placeholder="Cantidad (ej. 0.5)"
        value={form.amount}
        onChange={(event) => onFormChange({ ...form, amount: event.target.value })}
      />
      <button
        className="rounded-xl bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        disabled={disabled}
        onClick={onSubmit}
        type="button"
      >
        Enviar
      </button>
    </div>
  );
}
