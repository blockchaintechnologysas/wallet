import { Address } from "../common/Address";
import type { Token, TokenFormState } from "../../types";

export type TokenManagerProps = {
  tokenAddressInput: string;
  onTokenAddressChange: (value: string) => void;
  onAddToken: () => void;
  tokens: Token[];
  forms: TokenFormState;
  onFormChange: (tokenAddress: string, form: { to: string; amount: string }) => void;
  onSendToken: (tokenAddress: string, form: { to: string; amount: string }) => void;
  disabled: boolean;
};

export function TokenManager({
  tokenAddressInput,
  onTokenAddressChange,
  onAddToken,
  tokens,
  forms,
  onFormChange,
  onSendToken,
  disabled,
}: TokenManagerProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border p-2"
          placeholder="Dirección del token"
          value={tokenAddressInput}
          onChange={(event) => onTokenAddressChange(event.target.value)}
        />
        <button
          className="rounded-xl bg-slate-900 px-3 py-2 text-white"
          onClick={onAddToken}
          type="button"
          disabled={disabled}
        >
          Añadir
        </button>
      </div>
      <ul className="space-y-2">
        {tokens.map((token) => {
          const form = forms[token.address] ?? { to: "", amount: "" };
          return (
            <li key={token.address} className="space-y-2 rounded-xl border bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{token.symbol}</div>
                  <div className="text-xs text-slate-500">
                    <Address value={token.address} />
                  </div>
                </div>
                <div className="font-mono text-right">{token.balance}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 rounded-lg border p-2"
                  placeholder="0x destinatario"
                  value={form.to}
                  onChange={(event) =>
                    onFormChange(token.address, {
                      ...form,
                      to: event.target.value,
                    })
                  }
                />
                <input
                  className="col-span-1 rounded-lg border p-2"
                  placeholder="Cantidad"
                  value={form.amount}
                  onChange={(event) =>
                    onFormChange(token.address, {
                      ...form,
                      amount: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <button
                  className="rounded-xl bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => onSendToken(token.address, form)}
                  type="button"
                >
                  Enviar {token.symbol}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
