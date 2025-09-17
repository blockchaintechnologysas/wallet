import type { HDNodeWallet, Wallet } from "ethers";

export type AnyWallet = Wallet | HDNodeWallet;

export type Token = {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
};

export type TokenFormState = Record<string, { to: string; amount: string }>;

export type ExplorerTx = {
  hash: string;
  from?: { hash?: string } | string | null;
  to?: { hash?: string } | string | null;
  method?: string | null;
  type?: string | null;
  block_number?: number;
  timestamp?: number;
};

export type ResultStatus = "success" | "error";

export type ResultModalState = {
  status: ResultStatus;
  title: string;
  description: string;
};
