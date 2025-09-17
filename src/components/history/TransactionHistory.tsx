import { Address } from "../common/Address";
import type { ExplorerTx } from "../../types";

export type TransactionHistoryProps = {
  explorer: string;
  transactions: ExplorerTx[];
};

export function TransactionHistory({ explorer, transactions }: TransactionHistoryProps) {
  const baseExplorer = explorer.replace(/\/$/, "");

  if (!transactions.length) {
    return (
      <div className="text-sm text-slate-500">
        No hay transacciones recientes o el explorador no respondió.
      </div>
    );
  }

  return (
    <ul className="max-h-[400px] space-y-2 overflow-auto pr-1">
      {transactions.map((tx) => (
        <li key={tx.hash} className="space-y-1 rounded-xl border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs">{`${tx.hash.slice(0, 12)}…`}</div>
            <div className="text-xs uppercase tracking-wide">{tx.method || tx.type || "TX"}</div>
          </div>
          <div className="text-sm">
            De <Address value={(tx.from as any)?.hash || (tx.from as string)} /> a <Address
              value={(tx.to as any)?.hash || (tx.to as string)}
            />
          </div>
          <div className="text-xs text-slate-500">
            Bloque #{tx.block_number ?? "?"} • {" "}
            {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : "sin fecha"}
          </div>
          {explorer && (
            <a
              className="text-xs text-blue-600"
              href={`${baseExplorer}/tx/${tx.hash}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver en Blockscout ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
