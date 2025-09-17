import { DEFAULT_RPCS } from "../../constants/network";
import { Section } from "../common/Section";

export type NetworkSettingsProps = {
  rpcUrl: string;
  onRpcUrlChange: (value: string) => void;
  explorer: string;
  onExplorerChange: (value: string) => void;
  chainName: string;
  onChainNameChange: (value: string) => void;
  chainHex: string;
  onChainHexChange: (value: string) => void;
  onAddToMetaMask: () => void;
};

export function NetworkSettings({
  rpcUrl,
  onRpcUrlChange,
  explorer,
  onExplorerChange,
  chainName,
  onChainNameChange,
  chainHex,
  onChainHexChange,
  onAddToMetaMask,
}: NetworkSettingsProps) {
  return (
    <Section
      title="Configuración de Red"
      right={
        <button
          className="px-3 py-2 rounded-xl bg-black text-white text-sm"
          onClick={onAddToMetaMask}
          type="button"
        >
          Añadir a MetaMask
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm">RPC público (selección)</label>
          <select
            className="w-full rounded-lg border p-2"
            value={rpcUrl}
            onChange={(e) => onRpcUrlChange(e.target.value)}
          >
            {DEFAULT_RPCS.map((url) => (
              <option key={url} value={url}>
                {url}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Cambia entre los RPC por defecto de Scolcoin.
          </p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Explorador (Blockscout)</label>
          <input
            className="w-full rounded-lg border p-2"
            value={explorer}
            onChange={(e) => onExplorerChange(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Se usa para historial de transacciones.
          </p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Nombre de red</label>
          <input
            className="w-full rounded-lg border p-2"
            value={chainName}
            onChange={(e) => onChainNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Chain ID (hex)</label>
          <input
            className="w-full rounded-lg border p-2"
            value={chainHex}
            onChange={(e) => onChainHexChange(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Sugerido para Scolcoin: 0xffaa (65450)
          </p>
        </div>
      </div>
    </Section>
  );
}
