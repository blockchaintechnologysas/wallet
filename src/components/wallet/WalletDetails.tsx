import { Address } from "../common/Address";

export type WalletDetailsProps = {
  address: string;
  balance: string;
  currencySymbol: string;
  mnemonic: string;
  privKey: string;
  busy: boolean;
  onCopy: (value: string, label?: string) => void;
  onSaveKeystore: () => void;
};

export function WalletDetails({
  address,
  balance,
  currencySymbol,
  mnemonic,
  privKey,
  busy,
  onCopy,
  onSaveKeystore,
}: WalletDetailsProps) {
  if (!address) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center">
        <div className="rounded-xl border bg-white p-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
              address
            )}`}
            width={160}
            height={160}
            alt="QR"
          />
        </div>
        <div className="mt-2 text-xs text-slate-500">QR de tu dirección</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>
          Dirección: <Address value={address} />
        </span>
        <button
          className="rounded-lg bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300"
          onClick={() => onCopy(address, "Dirección")}
          type="button"
        >
          Copiar dirección
        </button>
      </div>

      <div className="text-sm">
        Saldo: <span className="font-mono">{balance}</span> {currencySymbol}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm">Frase (guárdala offline):</div>
          <button
            className="rounded-lg bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300 disabled:opacity-50"
            disabled={!mnemonic}
            onClick={() => onCopy(mnemonic, "Frase de recuperación")}
            type="button"
          >
            Copiar frase
          </button>
        </div>
        <div className="rounded border bg-amber-50 p-2 font-mono text-sm break-words">
          {mnemonic || "(oculta/no disponible si importaste por clave o keystore)"}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-rose-700">Clave privada (¡no la compartas!)</div>
          <button
            className="rounded-lg bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300 disabled:opacity-50"
            disabled={!privKey}
            onClick={() => onCopy(privKey, "Clave privada")}
            type="button"
          >
            Copiar clave
          </button>
        </div>
        <div className="rounded border bg-rose-50 p-2 font-mono text-sm break-words">
          {privKey ? privKey : "(oculta/no disponible)"}
        </div>

        <div>
          <button
            className="rounded-xl bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
            disabled={busy}
            onClick={onSaveKeystore}
            type="button"
          >
            Guardar/Descargar Keystore JSON
          </button>
        </div>
      </div>
    </div>
  );
}
