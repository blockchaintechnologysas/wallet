import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Contract,
  JsonRpcProvider,
  HDNodeWallet,
  Wallet,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  parseEther,
  parseUnits,
} from "ethers";

const DEFAULT_RPCS = [
  "https://mainnet-rpc.scolcoin.com",
  "https://mainrpc.scolcoin.com",
  "https://seed.scolcoin.com",
];

const DEFAULT_CHAIN = {
  chainId: 65450,
  chainHex: "0xffaa",
  name: "Scolcoin POA",
  explorer: "https://explorador.scolcoin.com",
  currency: { name: "Scolcoin", symbol: "SCOL", decimals: 18 },
} as const;

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type Token = {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
};

type TokenFormState = Record<string, { to: string; amount: string }>;

type AnyWallet = Wallet | HDNodeWallet;

type ExplorerTx = {
  hash: string;
  from?: { hash?: string } | string | null;
  to?: { hash?: string } | string | null;
  method?: string | null;
  type?: string | null;
  block_number?: number;
  timestamp?: number;
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

function Address({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const normalized = value.toString();
  return (
    <span className="font-mono text-sm break-all" title={normalized}>
      {normalized.slice(0, 8)}…{normalized.slice(-6)}
    </span>
  );
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl shadow p-4 bg-white border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function App(): JSX.Element {
  const [rpcUrl, setRpcUrl] = useState<string>(DEFAULT_RPCS[0]);
  const [explorer, setExplorer] = useState<string>(DEFAULT_CHAIN.explorer);
  const [chainName, setChainName] = useState<string>(DEFAULT_CHAIN.name);
  const [chainHex, setChainHex] = useState<string>(DEFAULT_CHAIN.chainHex);
  const [currency] = useState(DEFAULT_CHAIN.currency);

  const provider = useMemo(() => new JsonRpcProvider(rpcUrl), [rpcUrl]);

  useEffect(() => {
    const href = "https://scolcoin.com/i/scolcoin-logo-light.svg";
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
    link.setAttribute("type", "image/svg+xml");
  }, []);

  const [wallet, setWallet] = useState<AnyWallet | null>(null);
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("-");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [privKey, setPrivKey] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");
  const [resultModal, setResultModal] = useState<
    | {
        status: "success" | "error";
        title: string;
        description: string;
      }
    | null
  >(null);

  const [tokenAddr, setTokenAddr] = useState<string>("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenForms, setTokenForms] = useState<TokenFormState>({});
  const [txs, setTxs] = useState<ExplorerTx[]>([]);
  const [nativeForm, setNativeForm] = useState<{ to: string; amount: string }>(
    { to: "", amount: "" }
  );

  const noticeTimeout = useRef<number | null>(null);
  const bodyOverflow = useRef<string | null>(null);

  const notify = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimeout.current) {
      window.clearTimeout(noticeTimeout.current);
    }
    noticeTimeout.current = window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const openResultModal = useCallback(
    (status: "success" | "error", description: string) => {
      setResultModal({
        status,
        title: status === "success" ? "Confirmación exitosa" : "Confirmación fallida",
        description,
      });
    },
    []
  );

  const closeResultModal = useCallback(() => {
    setResultModal(null);
  }, []);

  useEffect(() => {
    if (isProcessing) {
      bodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = bodyOverflow.current ?? "";
      };
    }
    document.body.style.overflow = bodyOverflow.current ?? "";
  }, [isProcessing]);

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) {
        window.clearTimeout(noticeTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!provider || !wallet) {
      setAddress("");
      setBalance("-");
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const connected = wallet.connect(provider);
        const addr = await connected.getAddress();
        if (cancelled) return;
        setAddress(addr);
        const bal = await provider.getBalance(addr);
        if (cancelled) return;
        setBalance(formatEther(bal));
      } catch (error) {
        console.error("Unable to refresh wallet state", error);
        if (!cancelled) {
          notify("No se pudo actualizar la cartera");
        }
      }
    };

    refresh();

    return () => {
      cancelled = true;
    };
  }, [provider, wallet, notify]);

  const refreshTokenBalance = useCallback(
    async (addr: string, signer: AnyWallet | null) => {
      try {
        const checksum = getAddress(addr);
        const c = new Contract(checksum, ERC20_ABI, provider);
        const account = signer ? await signer.getAddress() : address;
        if (!account) return;
        const [bal, decimalsRaw, symbol] = await Promise.all([
          c.balanceOf(account),
          c.decimals(),
          c.symbol(),
        ]);
        const decimals = Number(decimalsRaw);
        setTokens((prev) =>
          prev.map((token) =>
            token.address.toLowerCase() === checksum.toLowerCase()
              ? {
                  ...token,
                  symbol,
                  decimals,
                  balance: formatUnits(bal, decimals),
                }
              : token
          )
        );
      } catch (error) {
        console.error("Unable to refresh token balance", error);
      }
    },
    [address, provider]
  );

  useEffect(() => {
    if (!wallet || !provider || tokens.length === 0) {
      return;
    }

    let cancelled = false;
    const signer = wallet.connect(provider);

    const refreshBalances = async () => {
      for (const token of tokens) {
        if (cancelled) return;
        await refreshTokenBalance(token.address, signer);
      }
    };

    refreshBalances();

    return () => {
      cancelled = true;
    };
  }, [tokens, wallet, provider, refreshTokenBalance]);

  const fetchTxs = useCallback(
    async (addr: string) => {
      if (!explorer || !addr) {
        setTxs([]);
        return;
      }
      try {
        const base = explorer.replace(/\/$/, "");
        const res = await fetch(
          `${base}/api/v2/addresses/${addr}/transactions?items_count=20`
        );
        if (!res.ok) {
          throw new Error(`Explorer responded with ${res.status}`);
        }
        const data = await res.json();
        setTxs(Array.isArray(data?.items) ? data.items : []);
      } catch (error) {
        console.error("Tx fetch error", error);
      }
    },
    [explorer]
  );

  useEffect(() => {
    if (!address) {
      setTxs([]);
      return;
    }
    fetchTxs(address);
  }, [address, fetchTxs]);

  useEffect(() => {
    setTokenForms((prev) => {
      const next: TokenFormState = { ...prev };
      for (const token of tokens) {
        if (!next[token.address]) {
          next[token.address] = { to: "", amount: "" };
        }
      }
      return next;
    });
  }, [tokens]);

  const copyToClipboard = useCallback(
    (text: string, label = "Contenido") => {
      if (!text) {
        notify("Nada para copiar");
        return;
      }

      const fallbackCopy = () => {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          notify(`${label} copiada`);
        } catch (error) {
          console.error("Clipboard error", error);
          notify(`No se pudo copiar ${label.toLowerCase()}`);
        }
      };

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(
          () => notify(`${label} copiada`),
          fallbackCopy
        );
      } else {
        fallbackCopy();
      }
    },
    [notify]
  );

  const createWallet = useCallback(() => {
    try {
      const w = Wallet.createRandom();
      setWallet(w);
      setAddress(w.address);
      setMnemonic(w.mnemonic?.phrase ?? "");
      setPrivKey(w.privateKey);
      setBalance("-");
      notify("Nueva cartera creada. ¡Guarda la frase de recuperación!");
    } catch (error) {
      console.error("Error creating wallet", error);
      notify("Error creando la cartera");
    }
  }, [notify]);

  const importFromMnemonic = useCallback(
    (phrase: string) => {
      try {
        const normalized = phrase.trim().toLowerCase();
        if (!normalized) {
          notify("Ingresa un mnemónico válido");
          return;
        }
        const w = Wallet.fromPhrase(normalized);
        setWallet(w);
        setAddress(w.address);
        setMnemonic(normalized);
        setPrivKey(w.privateKey);
        notify("Cartera importada desde mnemónico");
      } catch (error) {
        console.error("Invalid mnemonic", error);
        notify("Mnemónico inválido");
      }
    },
    [notify]
  );

  const importFromPrivateKey = useCallback(
    (pk: string) => {
      try {
        const cleaned = pk.trim();
        if (!cleaned) {
          notify("Ingresa una clave privada válida");
          return;
        }
        const prefixed = cleaned.startsWith("0x") ? cleaned : `0x${cleaned}`;
        const w = new Wallet(prefixed);
        setWallet(w);
        setAddress(w.address);
        setMnemonic("");
        setPrivKey(w.privateKey);
        notify("Cartera importada desde clave privada");
      } catch (error) {
        console.error("Invalid private key", error);
        notify("Clave privada inválida");
      }
    },
    [notify]
  );

  const saveKeystore = useCallback(
    async (password: string) => {
      if (!wallet) {
        notify("No hay cartera");
        return;
      }
      const trimmed = password.trim();
      if (trimmed.length < 8) {
        notify("Usa una contraseña de al menos 8 caracteres");
        return;
      }
      setBusy(true);
      try {
        const encJson = await wallet.encrypt(trimmed);
        const ksObj = JSON.parse(encJson);
        const bundle = {
          type: "scol-wallet-keystore" as const,
          version: 1,
          createdAt: new Date().toISOString(),
          chainId: DEFAULT_CHAIN.chainId,
          address,
          keystore: ksObj,
        };
        const bundleStr = JSON.stringify(bundle, null, 2);
        localStorage.setItem("scol_keystore_json", bundleStr);
        const blob = new Blob([bundleStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scolwallet-${address.slice(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
        notify(
          "Keystore guardado. Mantén la contraseña y el archivo en un lugar seguro"
        );
      } catch (error) {
        console.error("Failed to encrypt keystore", error);
        notify("No se pudo cifrar/guardar el keystore");
      } finally {
        setBusy(false);
      }
    },
    [address, notify, wallet]
  );

  const loadKeystore = useCallback(
    async (json: string, password: string) => {
      if (!json) {
        notify("Proporciona un archivo keystore");
        return;
      }
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        notify("Ingresa la contraseña del keystore");
        return;
      }
      setBusy(true);
      try {
        let keystorePayload: unknown = json;
        try {
          const parsed = JSON.parse(json);
          keystorePayload = (parsed as { keystore?: unknown }).keystore ?? parsed;
        } catch (parseError) {
          console.debug("Keystore input is raw JSON", parseError);
        }
        const normalized =
          typeof keystorePayload === "string"
            ? keystorePayload
            : JSON.stringify(keystorePayload);
        const w = await Wallet.fromEncryptedJson(normalized, trimmedPassword);
        const addr = await w.getAddress();
        setWallet(w);
        setAddress(addr);
        setMnemonic("");
        setPrivKey(w.privateKey);
        notify("Keystore cargado");
      } catch (error) {
        console.error("Unable to open keystore", error);
        notify("No se pudo abrir el keystore");
      } finally {
        setBusy(false);
      }
    },
    [notify]
  );

  const sendNative = useCallback(
    async (to: string, amountEth: string) => {
      if (!provider || !wallet) {
        notify("Configura RPC y cartera");
        openResultModal("error", "Configura el RPC y tu cartera antes de enviar.");
        return;
      }
      const trimmedTo = to.trim();
      const trimmedAmount = amountEth.trim();
      if (!isAddress(trimmedTo)) {
        notify("Dirección de destino inválida");
        openResultModal("error", "La dirección de destino no es válida.");
        return;
      }
      let value;
      try {
        value = parseEther(trimmedAmount);
      } catch (error) {
        console.error("Invalid native amount", error);
        notify("Cantidad inválida");
        openResultModal("error", "La cantidad proporcionada no es válida.");
        return;
      }
      setBusy(true);
      setIsProcessing(true);
      try {
        const signer = wallet.connect(provider);
        const tx = await signer.sendTransaction({ to: trimmedTo, value });
        notify(`Enviando… TX: ${tx.hash}`);
        await tx.wait();
        notify("Transacción confirmada");
        openResultModal(
          "success",
          "La transacción se confirmó correctamente en la red."
        );
        const addr = await signer.getAddress();
        const bal = await provider.getBalance(addr);
        setBalance(formatEther(bal));
        setNativeForm({ to: "", amount: "" });
        fetchTxs(addr);
      } catch (error: any) {
        console.error("Native transfer failed", error);
        const message = error?.shortMessage || error?.message || "Error enviando SCOL";
        notify(message);
        openResultModal("error", message);
      } finally {
        setBusy(false);
        setIsProcessing(false);
      }
    },
    [fetchTxs, notify, openResultModal, provider, wallet]
  );

  const addToken = useCallback(
    async (addr: string) => {
      if (!provider) {
        notify("Configura el RPC primero");
        return;
      }
      const trimmed = addr.trim();
      if (!isAddress(trimmed)) {
        notify("Dirección de token inválida");
        return;
      }
      const checksum = getAddress(trimmed);
      try {
        const c = new Contract(checksum, ERC20_ABI, provider);
        const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]);
        const token: Token = {
          address: checksum,
          symbol,
          decimals: Number(decimals),
          balance: "0",
        };
        setTokens((prev) => {
          const exists = prev.some(
            (p) => p.address.toLowerCase() === checksum.toLowerCase()
          );
          return exists ? prev : [...prev, token];
        });
        const signer = wallet ? wallet.connect(provider) : null;
        await refreshTokenBalance(checksum, signer);
        notify(`Token ${symbol} añadido`);
        setTokenAddr("");
      } catch (error) {
        console.error("Unable to add token", error);
        notify("No se pudo añadir el token (¿dirección correcta?)");
      }
    },
    [notify, provider, refreshTokenBalance, wallet]
  );

  const sendToken = useCallback(
    async (addr: string, to: string, amount: string) => {
      if (!provider || !wallet) {
        notify("Configura RPC y cartera");
        openResultModal("error", "Configura el RPC y tu cartera antes de enviar.");
        return;
      }
      const trimmedAddr = addr.trim();
      const trimmedTo = to.trim();
      const trimmedAmount = amount.trim();
      if (!isAddress(trimmedTo)) {
        notify("Dirección de destino inválida");
        openResultModal("error", "La dirección de destino no es válida.");
        return;
      }
      setBusy(true);
      setIsProcessing(true);
      try {
        const checksum = getAddress(trimmedAddr);
        const signer = wallet.connect(provider);
        const c = new Contract(checksum, ERC20_ABI, signer);
        const decimals = Number(await c.decimals());
        const value = parseUnits(trimmedAmount, decimals);
        const tx = await c.transfer(trimmedTo, value);
        notify(`Enviando… TX: ${tx.hash}`);
        await tx.wait();
        notify("Transferencia confirmada");
        openResultModal(
          "success",
          "La transferencia del token se confirmó correctamente."
        );
        await refreshTokenBalance(checksum, signer);
        const addrSigner = await signer.getAddress();
        fetchTxs(addrSigner);
        setTokenForms((prev) => ({
          ...prev,
          [checksum]: { to: "", amount: "" },
        }));
      } catch (error: any) {
        console.error("Token transfer failed", error);
        const message =
          error?.shortMessage || error?.message || "Error enviando token";
        notify(message);
        openResultModal("error", message);
      } finally {
        setBusy(false);
        setIsProcessing(false);
      }
    },
    [fetchTxs, notify, openResultModal, provider, refreshTokenBalance, wallet]
  );

  const addToMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      notify("No se detectó MetaMask / EIP-1193");
      return;
    }
    try {
      const rpcList = rpcUrl ? [rpcUrl] : [];
      const explorerList = explorer ? [explorer] : [];
      const normalizedChainId = chainHex.startsWith("0x")
        ? chainHex
        : `0x${Number(chainHex).toString(16)}`;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: normalizedChainId,
            chainName,
            nativeCurrency: currency,
            rpcUrls: rpcList,
            blockExplorerUrls: explorerList,
          },
        ],
      });
      notify("Red añadida a MetaMask");
    } catch (error) {
      console.error("Unable to add chain", error);
      notify("No se pudo añadir la red");
    }
  }, [chainHex, chainName, currency, explorer, notify, rpcUrl]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {isProcessing && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 px-4 text-white"
          role="status"
          aria-live="assertive"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <div className="text-lg font-semibold uppercase tracking-wide">
            Procesando…
          </div>
          <p className="text-center text-sm text-slate-200">
            Espera la confirmación de la red para completar tu transacción.
          </p>
        </div>
      )}
      {resultModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button
              className="absolute right-3 top-3 text-2xl leading-none text-slate-400 hover:text-slate-600"
              onClick={closeResultModal}
              type="button"
              aria-label="Cerrar"
            >
              &times;
            </button>
            <div
              className={`text-lg font-semibold ${
                resultModal.status === "success"
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {resultModal.title}
            </div>
            <p className="mt-3 text-sm text-slate-600">{resultModal.description}</p>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-white"
                onClick={closeResultModal}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://scolcoin.com/i/Scolcoin-Logo-PaperWallet.png"
              alt="Scolcoin logo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Scolcoin Web Wallet (MVP)
              </h1>
              <p className="text-sm text-slate-500">Non-custodial • EVM</p>
            </div>
          </div>
          <div className="text-sm opacity-70">Versión local para usuarios finales</div>
        </header>

        {notice && (
          <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200 text-emerald-800">
            {notice}
          </div>
        )}

        <Section
          title="Configuración de Red"
          right={
            <button
              className="px-3 py-2 rounded-xl bg-black text-white text-sm"
              onClick={addToMetaMask}
              type="button"
            >
              Añadir a MetaMask
            </button>
          }
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm">RPC público (selección)</label>
              <select
                className="w-full p-2 rounded-lg border"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
              >
                {DEFAULT_RPCS.map((u) => (
                  <option key={u} value={u}>
                    {u}
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
                className="w-full p-2 rounded-lg border"
                value={explorer}
                onChange={(e) => setExplorer(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Se usa para historial de transacciones.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm">Nombre de red</label>
              <input
                className="w-full p-2 rounded-lg border"
                value={chainName}
                onChange={(e) => setChainName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm">Chain ID (hex)</label>
              <input
                className="w-full p-2 rounded-lg border"
                value={chainHex}
                onChange={(e) => setChainHex(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Sugerido para Scolcoin: 0xffaa (65450)
              </p>
            </div>
          </div>
        </Section>

        <Section title="Cartera">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-indigo-600 text-white"
                  onClick={createWallet}
                  type="button"
                  disabled={busy}
                >
                  Crear nueva
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white"
                  onClick={() => {
                    const ks = localStorage.getItem("scol_keystore_json");
                    if (!ks) {
                      notify("No hay keystore en el navegador");
                      return;
                    }
                    const password = window.prompt("Contraseña del keystore") || "";
                    if (password) {
                      void loadKeystore(ks, password);
                    }
                  }}
                  type="button"
                  disabled={busy}
                >
                  Cargar keystore guardado
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm">Importar por mnemónico</label>
                <textarea
                  className="w-full p-2 rounded-lg border"
                  rows={2}
                  placeholder="palabra1 palabra2 …"
                  onBlur={(e) => {
                    const value = e.currentTarget.value;
                    if (value) {
                      importFromMnemonic(value);
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
                  className="w-full p-2 rounded-lg border"
                  placeholder="0x… o sin 0x"
                  onKeyDown={(e) => {
                    const el = e.currentTarget;
                    if (e.key === "Enter" && el.value) {
                      importFromPrivateKey(el.value);
                    }
                  }}
                />
                <p className="text-xs text-slate-500">
                  Asegúrate de usar un entorno confiable antes de pegar tu clave.
                </p>
              </div>

              {wallet && (
                <div className="space-y-3">
                  {address && (
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-3 rounded-xl border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                            address
                          )}`}
                          width={160}
                          height={160}
                          alt="QR"
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-2">QR de tu dirección</div>
                    </div>
                  )}

                  <div className="text-sm flex flex-wrap items-center gap-2">
                    <span>
                      Dirección: <Address value={address} />
                    </span>
                    <button
                      className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs"
                      onClick={() => copyToClipboard(address, "Dirección")}
                      type="button"
                    >
                      Copiar dirección
                    </button>
                  </div>

                  <div className="text-sm">
                    Saldo: <span className="font-mono">{balance}</span> {currency.symbol}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Frase (guárdala offline):</div>
                      <button
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs disabled:opacity-50"
                        disabled={!mnemonic}
                        onClick={() => copyToClipboard(mnemonic, "Frase de recuperación")}
                        type="button"
                      >
                        Copiar frase
                      </button>
                    </div>
                    <div className="p-2 bg-amber-50 border rounded font-mono text-sm break-words">
                      {mnemonic || "(oculta/no disponible si importaste por clave o keystore)"}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm text-rose-700">
                        Clave privada (¡no la compartas!)
                      </div>
                      <button
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs disabled:opacity-50"
                        disabled={!privKey}
                        onClick={() => copyToClipboard(privKey, "Clave privada")}
                        type="button"
                      >
                        Copiar clave
                      </button>
                    </div>
                    <div className="p-2 bg-rose-50 border rounded font-mono text-sm break-words">
                      {privKey ? privKey : "(oculta/no disponible)"}
                    </div>

                    <div>
                      <button
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50"
                        disabled={!wallet || busy}
                        onClick={() => {
                          const password = window.prompt(
                            "Crea una contraseña FUERTE para cifrar tu keystore"
                          );
                          if (password) {
                            void saveKeystore(password);
                          }
                        }}
                        type="button"
                      >
                        Guardar/Descargar Keystore JSON
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Enviar {currency.symbol}</h3>
              <input
                className="w-full p-2 rounded-lg border"
                placeholder="0x destinatario"
                value={nativeForm.to}
                onChange={(e) =>
                  setNativeForm((prev) => ({ ...prev, to: e.target.value }))
                }
              />
              <input
                className="w-full p-2 rounded-lg border"
                placeholder="Cantidad (ej. 0.5)"
                value={nativeForm.amount}
                onChange={(e) =>
                  setNativeForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
              <button
                className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
                disabled={!wallet || !provider || busy}
                onClick={() => sendNative(nativeForm.to, nativeForm.amount)}
                type="button"
              >
                Enviar
              </button>
            </div>
          </div>
        </Section>

        <Section title="Tokens (ERC-20)">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 p-2 rounded-lg border"
                  placeholder="Dirección del token"
                  value={tokenAddr}
                  onChange={(e) => setTokenAddr(e.target.value)}
                />
                <button
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white"
                  onClick={() => tokenAddr && addToken(tokenAddr)}
                  type="button"
                  disabled={busy}
                >
                  Añadir
                </button>
              </div>
              <ul className="space-y-2">
                {tokens.map((token) => {
                  const form = tokenForms[token.address] ?? { to: "", amount: "" };
                  return (
                    <li
                      key={token.address}
                      className="rounded-xl border p-3 bg-slate-50 space-y-2"
                    >
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
                          className="col-span-2 p-2 rounded-lg border"
                          placeholder="0x destinatario"
                          value={form.to}
                          onChange={(e) =>
                            setTokenForms((prev) => {
                              const existing = prev[token.address] ?? {
                                to: "",
                                amount: "",
                              };
                              return {
                                ...prev,
                                [token.address]: {
                                  ...existing,
                                  to: e.target.value,
                                },
                              };
                            })
                          }
                        />
                        <input
                          className="col-span-1 p-2 rounded-lg border"
                          placeholder="Cantidad"
                          value={form.amount}
                          onChange={(e) =>
                            setTokenForms((prev) => {
                              const existing = prev[token.address] ?? {
                                to: "",
                                amount: "",
                              };
                              return {
                                ...prev,
                                [token.address]: {
                                  ...existing,
                                  amount: e.target.value,
                                },
                              };
                            })
                          }
                        />
                      </div>
                      <div>
                        <button
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
                          disabled={!wallet || !provider || busy}
                          onClick={() => sendToken(token.address, form.to, form.amount)}
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

            <div className="space-y-2">
              <h3 className="font-semibold">Historial reciente</h3>
              {!explorer && (
                <div className="text-sm text-slate-500">
                  Configura el explorador para ver transacciones
                </div>
              )}
              <ul className="space-y-2 max-h-[400px] overflow-auto pr-1">
                {txs.map((tx) => (
                  <li key={tx.hash} className="rounded-xl border p-3 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs">{`${tx.hash.slice(0, 12)}…`}</div>
                      <div className="text-xs uppercase tracking-wide">
                        {tx.method || tx.type || "TX"}
                      </div>
                    </div>
                    <div className="text-sm">
                      De <Address value={(tx.from as any)?.hash || (tx.from as string)} /> a{' '}
                      <Address value={(tx.to as any)?.hash || (tx.to as string)} />
                    </div>
                    <div className="text-xs text-slate-500">
                      Bloque #{tx.block_number ?? "?"} •{' '}
                      {tx.timestamp
                        ? new Date(tx.timestamp * 1000).toLocaleString()
                        : "sin fecha"}
                    </div>
                    {explorer && (
                      <a
                        className="text-xs text-blue-600"
                        href={`${explorer.replace(/\/$/, "")}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver en Blockscout ↗
                      </a>
                    )}
                  </li>
                ))}
                {txs.length === 0 && (
                  <li className="text-sm text-slate-500">
                    No hay transacciones recientes o el explorador no respondió.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Section>

        <footer className="text-xs text-slate-500 pt-6">
          <p className="text-center">
            Scolcoin Copyright © 2018 - 2026. All rights reserved. Creado por
            Blockchain Technology S.A.S.
          </p>
        </footer>
      </div>
    </div>
  );
}
