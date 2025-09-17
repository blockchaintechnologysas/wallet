export const DEFAULT_RPCS = [
  "https://mainnet-rpc.scolcoin.com",
  "https://mainrpc.scolcoin.com",
  "https://seed.scolcoin.com",
] as const;

export const DEFAULT_CHAIN = {
  chainId: 65450,
  chainHex: "0xffaa",
  name: "Scolcoin POA",
  explorer: "https://explorador.scolcoin.com",
  currency: { name: "Scolcoin", symbol: "SCOL", decimals: 18 },
} as const;
