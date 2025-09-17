export type WalletActionsProps = {
  busy: boolean;
  onCreateWallet: () => void;
  onRequestLoadStoredKeystore: () => void;
  onImportMnemonic: (phrase: string) => void;
  onImportPrivateKey: (privKey: string) => void;
};

export function WalletActions({
  busy,
  onCreateWallet,
  onRequestLoadStoredKeystore,
  onImportMnemonic,
  onImportPrivateKey,
}: WalletActionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-indigo-600 px-3 py-2 text-white"
          onClick={onCreateWallet}
          type="button"
          disabled={busy}
        >
          Crear nueva
        </button>
        <button
          className="rounded-xl bg-slate-900 px-3 py-2 text-white"
          onClick={onRequestLoadStoredKeystore}
          type="button"
          disabled={busy}
        >
          Cargar keystore guardado
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Importar por mnemónico</label>
        <textarea
          className="h-20 w-full rounded-lg border p-2"
          placeholder="palabra1 palabra2 …"
          onBlur={(event) => {
            const value = event.currentTarget.value.trim();
            if (value) {
              onImportMnemonic(value);
            }
          }}
        />
        <p className="text-xs text-slate-500">
          Se procesa localmente. Nunca compartas tu frase secreta.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Importar por clave privada</label>
        <input
          className="w-full rounded-lg border p-2"
          placeholder="0x… o sin 0x"
          onKeyDown={(event) => {
            const input = event.currentTarget;
            if (event.key === "Enter" && input.value) {
              onImportPrivateKey(input.value);
            }
          }}
        />
        <p className="text-xs text-slate-500">
          Asegúrate de usar un entorno confiable antes de pegar tu clave.
        </p>
      </div>
    </div>
  );
}
