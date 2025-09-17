import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  parseEther,
  parseUnits,
} from "ethers";

import { ERC20_ABI } from "./abi/erc20";
import { DEFAULT_CHAIN, DEFAULT_RPCS } from "./constants/network";
import { useBodyScrollLock } from "./hooks/useBodyScrollLock";
import { useFavicon } from "./hooks/useFavicon";
import { useNotice } from "./hooks/useNotice";
import type {
  AnyWallet,
  ExplorerTx,
  ResultModalState,
  Token,
  TokenFormState,
} from "./types";
import { Section } from "./components/common/Section";
import { NoticeBanner } from "./components/feedback/NoticeBanner";
import { ProcessingOverlay } from "./components/feedback/ProcessingOverlay";
import { ResultModal } from "./components/feedback/ResultModal";
import { TransactionHistory } from "./components/history/TransactionHistory";
import { NetworkSettings } from "./components/network/NetworkSettings";
import { NativeTransferForm } from "./components/transfers/NativeTransferForm";
import { TokenManager } from "./components/tokens/TokenManager";
import { WalletActions } from "./components/wallet/WalletActions";
import { WalletDetails } from "./components/wallet/WalletDetails";
import { KeystorePasswordModal } from "./components/wallet/KeystorePasswordModal";

const FAVICON_URL = "https://scolcoin.com/i/scolcoin-logo-light.svg";

export default function App(): JSX.Element {
  const [rpcUrl, setRpcUrl] = useState<string>(DEFAULT_RPCS[0]);
  const [explorer, setExplorer] = useState<string>(DEFAULT_CHAIN.explorer);
  const [chainName, setChainName] = useState<string>(DEFAULT_CHAIN.name);
  const [chainHex, setChainHex] = useState<string>(DEFAULT_CHAIN.chainHex);
  const currency = DEFAULT_CHAIN.currency;

  const provider = useMemo(() => new JsonRpcProvider(rpcUrl), [rpcUrl]);

  useFavicon(FAVICON_URL);

  const { notice, notify, clear } = useNotice();

  const [wallet, setWallet] = useState<AnyWallet | null>(null);
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("-");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [privKey, setPrivKey] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultModal, setResultModal] = useState<ResultModalState | null>(null);
  const [isKeystoreModalOpen, setIsKeystoreModalOpen] = useState<boolean>(false);
  const [keystorePassword, setKeystorePassword] = useState<string>("");
  const [keystorePasswordConfirm, setKeystorePasswordConfirm] = useState<string>("");
  const [keystoreModalError, setKeystoreModalError] = useState<string | null>(null);

  const [tokenAddr, setTokenAddr] = useState<string>("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenForms, setTokenForms] = useState<TokenFormState>({});
  const [txs, setTxs] = useState<ExplorerTx[]>([]);
  const [nativeForm, setNativeForm] = useState<{ to: string; amount: string }>(
    { to: "", amount: "" }
  );

  useBodyScrollLock(isProcessing || isKeystoreModalOpen);

  const resetKeystoreModal = useCallback(() => {
    setKeystorePassword("");
    setKeystorePasswordConfirm("");
    setKeystoreModalError(null);
  }, []);

  const openResultModal = useCallback(
    (status: ResultModalState["status"], description: string) => {
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
  }, [notify, provider, wallet]);

  const refreshTokenBalance = useCallback(
    async (addr: string, signer: AnyWallet | null) => {
      try {
        const checksum = getAddress(addr);
        const contract = new Contract(checksum, ERC20_ABI, provider);
        const account = signer ? await signer.getAddress() : address;
        if (!account) return;
        const [bal, decimalsRaw, symbol] = await Promise.all([
          contract.balanceOf(account),
          contract.decimals(),
          contract.symbol(),
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
  }, [provider, refreshTokenBalance, tokens, wallet]);

  const fetchTxs = useCallback(
    async (addr: string) => {
      if (!explorer || !addr) {
        setTxs([]);
        return;
      }
      try {
        const base = explorer.replace(/\/$/, "");
        const res = await fetch(`${base}/api/v2/addresses/${addr}/transactions?items_count=20`);
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
        notify("Cartera importada por clave privada");
      } catch (error) {
        console.error("Invalid private key", error);
        notify("Clave privada inválida");
      }
    },
    [notify]
  );

  const saveKeystore = useCallback(
    async (password: string): Promise<boolean> => {
      if (!wallet) {
        notify("No hay cartera");
        return false;
      }
      const trimmed = password.trim();
      if (trimmed.length < 8) {
        notify("Usa una contraseña de al menos 8 caracteres");
        return false;
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
        const blob = new Blob([encJson], { type: "application/json" });
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
        notify("Keystore guardado. Mantén la contraseña y el archivo en un lugar seguro");
        return true;
      } catch (error) {
        console.error("Failed to encrypt keystore", error);
        notify("No se pudo cifrar/guardar el keystore");
        return false;
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
        openResultModal("success", "La transacción se confirmó correctamente en la red.");
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
        const contract = new Contract(checksum, ERC20_ABI, provider);
        const [symbol, decimals] = await Promise.all([contract.symbol(), contract.decimals()]);
        const token: Token = {
          address: checksum,
          symbol,
          decimals: Number(decimals),
          balance: "0",
        };
        setTokens((prev) => {
          const exists = prev.some((p) => p.address.toLowerCase() === checksum.toLowerCase());
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
        const contract = new Contract(checksum, ERC20_ABI, signer);
        const decimals = Number(await contract.decimals());
        const value = parseUnits(trimmedAmount, decimals);
        const tx = await contract.transfer(trimmedTo, value);
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
        const message = error?.shortMessage || error?.message || "Error enviando token";
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
      const normalizedChainId = chainHex.startsWith("0x") ? chainHex : `0x${Number(chainHex).toString(16)}`;
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

  const handleRequestLoadStoredKeystore = useCallback(() => {
    const ks = localStorage.getItem("scol_keystore_json");
    if (!ks) {
      notify("No hay keystore en el navegador");
      return;
    }
    const password = window.prompt("Contraseña del keystore") || "";
    if (password) {
      void loadKeystore(ks, password);
    }
  }, [loadKeystore, notify]);

  const handleKeystorePasswordChange = useCallback((value: string) => {
    setKeystorePassword(value);
    setKeystoreModalError(null);
  }, []);

  const handleKeystorePasswordConfirmChange = useCallback((value: string) => {
    setKeystorePasswordConfirm(value);
    setKeystoreModalError(null);
  }, []);

  const handleRequestSaveKeystore = useCallback(() => {
    if (!wallet) {
      notify("No hay cartera");
      return;
    }
    resetKeystoreModal();
    setIsKeystoreModalOpen(true);
  }, [notify, resetKeystoreModal, wallet]);

  const handleCloseKeystoreModal = useCallback(() => {
    if (busy) return;
    setIsKeystoreModalOpen(false);
    resetKeystoreModal();
  }, [busy, resetKeystoreModal]);

  const handleConfirmSaveKeystore = useCallback(async () => {
    const trimmed = keystorePassword.trim();
    const confirmTrimmed = keystorePasswordConfirm.trim();
    if (trimmed.length < 8) {
      setKeystoreModalError("Usa una contraseña de al menos 8 caracteres.");
      return;
    }
    if (trimmed !== confirmTrimmed) {
      setKeystoreModalError("Las contraseñas no coinciden.");
      return;
    }
    setKeystoreModalError(null);
    const success = await saveKeystore(trimmed);
    if (success) {
      setIsKeystoreModalOpen(false);
      resetKeystoreModal();
    } else {
      setKeystoreModalError("No se pudo guardar el keystore. Inténtalo nuevamente.");
    }
  }, [keystorePassword, keystorePasswordConfirm, resetKeystoreModal, saveKeystore]);

  const handleNativeFormChange = useCallback((form: { to: string; amount: string }) => {
    setNativeForm(form);
  }, []);

  const handleSendNative = useCallback(() => {
    void sendNative(nativeForm.to, nativeForm.amount);
  }, [nativeForm.amount, nativeForm.to, sendNative]);

  const handleTokenFormChange = useCallback(
    (tokenAddress: string, form: { to: string; amount: string }) => {
      setTokenForms((prev) => ({
        ...prev,
        [tokenAddress]: form,
      }));
    },
    []
  );

  const handleSendToken = useCallback(
    (tokenAddress: string, form: { to: string; amount: string }) => {
      void sendToken(tokenAddress, form.to, form.amount);
    },
    [sendToken]
  );

  const handleAddToken = useCallback(() => {
    if (tokenAddr) {
      void addToken(tokenAddr);
    }
  }, [addToken, tokenAddr]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <ProcessingOverlay visible={isProcessing} />
      <ResultModal result={resultModal} onClose={closeResultModal} />
      <KeystorePasswordModal
        open={isKeystoreModalOpen}
        password={keystorePassword}
        confirmPassword={keystorePasswordConfirm}
        error={keystoreModalError}
        busy={busy}
        onPasswordChange={handleKeystorePasswordChange}
        onConfirmPasswordChange={handleKeystorePasswordConfirmChange}
        onClose={handleCloseKeystoreModal}
        onSubmit={handleConfirmSaveKeystore}
      />

      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://scolcoin.com/i/Scolcoin-Logo-PaperWallet.png"
              alt="Scolcoin logo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Scolcoin Web Wallet</h1>
              <p className="text-sm text-slate-500">Non-custodial • EVM</p>
            </div>
          </div>
          <div className="text-sm opacity-70">Versión local para usuarios finales</div>
        </header>

        <NoticeBanner message={notice} onClose={clear} />

        <NetworkSettings
          rpcUrl={rpcUrl}
          onRpcUrlChange={setRpcUrl}
          explorer={explorer}
          onExplorerChange={setExplorer}
          chainName={chainName}
          onChainNameChange={setChainName}
          chainHex={chainHex}
          onChainHexChange={setChainHex}
          onAddToMetaMask={addToMetaMask}
        />

        <Section title="Cartera">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <WalletActions
                busy={busy}
                onCreateWallet={createWallet}
                onRequestLoadStoredKeystore={handleRequestLoadStoredKeystore}
                onImportMnemonic={importFromMnemonic}
                onImportPrivateKey={importFromPrivateKey}
              />
              <WalletDetails
                address={address}
                balance={balance}
                currencySymbol={currency.symbol}
                mnemonic={mnemonic}
                privKey={privKey}
                busy={busy}
                onCopy={copyToClipboard}
                onSaveKeystore={handleRequestSaveKeystore}
              />
            </div>
            <NativeTransferForm
              currencySymbol={currency.symbol}
              form={nativeForm}
              onFormChange={handleNativeFormChange}
              onSubmit={handleSendNative}
              disabled={!wallet || !provider || busy}
            />
          </div>
        </Section>

        <Section title="Tokens (ERC-20)">
          <div className="grid gap-6 md:grid-cols-2">
            <TokenManager
              tokenAddressInput={tokenAddr}
              onTokenAddressChange={setTokenAddr}
              onAddToken={handleAddToken}
              tokens={tokens}
              forms={tokenForms}
              onFormChange={handleTokenFormChange}
              onSendToken={handleSendToken}
              disabled={!wallet || !provider || busy}
            />
            <div className="space-y-2">
              <h3 className="font-semibold">Historial reciente</h3>
              {!explorer && (
                <div className="text-sm text-slate-500">
                  Configura el explorador para ver transacciones
                </div>
              )}
              <TransactionHistory explorer={explorer} transactions={txs} />
            </div>
          </div>
        </Section>

        <footer className="pt-6 text-center text-xs text-slate-500">
          Scolcoin Copyright © 2018 - 2026. All rights reserved. Creado por Blockchain
          Technology S.A.S.
        </footer>
      </div>
    </div>
  );
}
