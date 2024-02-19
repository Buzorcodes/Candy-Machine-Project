import React, { useEffect, useState } from 'react';
import {
  PublicKey,
  Transaction,
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

// Define types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// Define Phantom provider interface
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

// Function to get Phantom provider
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

// App component
export default function App() {
  // State variables
  const [provider, setProvider] = useState<PhantomProvider | undefined>(undefined);
  const [walletKey, setWalletKey] = useState<string | undefined>(undefined);
  const [walletBalance, setWalletBalance] = useState<number | undefined>(undefined);
  const [airdrop, setAirdrop] = useState<boolean>(false);
  const [isTransfer, setIsTransfer] = useState<boolean>(false);
  const [createdWallet, setCreatedWallet] = useState<string | undefined>(undefined);
  const [userBalance, setUserBalance] = useState<number | undefined>(undefined);
  const [UserPrivateKey, setUserPrivateKey] = useState<Buffer | undefined>(undefined);

  // Function to get the provider on component mount
  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  // Function to connect wallet
  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      try {
        const response = await solana.connect();
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        setWalletKey(response.publicKey.toString());
        const walletBalance = await connection.getBalance(new PublicKey(response.publicKey.toString()));
        setWalletBalance(walletBalance);
      } catch (err) {
        console.error("Error connecting wallet:", err);
      }
    }
  };

  // Function to disconnect wallet
  const disconnectWallet = async () => {
    const { solana } = window;
    if (solana) {
      try {
        await solana.disconnect();
        setWalletKey(undefined);
      } catch (err) {
        console.error("Error disconnecting wallet:", err);
      }
    }
  }

  // Function to create a new wallet
  const createWallet = () => {
    const { solana } = window;
    if (solana) {
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const newPair = new Keypair();
        const publicKey = new PublicKey(newPair.publicKey).toString();
        const privateKey = newPair.secretKey;

        setCreatedWallet(publicKey);
        setUserPrivateKey(privateKey);
      } catch (err) {
        console.error("Error creating wallet:", err);
      }
    }
  }

  // Function to airdrop tokens
  const tokenAirdrop = async () => {
    const { solana } = window;
    if (solana) {
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const myWallet = await Keypair.fromSecretKey(UserPrivateKey);
        const fromAirDropSignature = await connection.requestAirdrop(new PublicKey(createdWallet), 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(fromAirDropSignature);
        setAirdrop(true);
        getUserBalance();
      } catch (err) {
        console.error("Error airdropping tokens:", err);
      }
    }
  }

  // Function to get user balance
  const getUserBalance = async () => {
    const { solana } = window;
    if (solana) {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const walletBalance = await connection.getBalance(new PublicKey(createdWallet));
      setUserBalance(walletBalance)
    }
  }

  // Function to transfer tokens
  const transferToken = async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const from = Keypair.fromSecretKey(UserPrivateKey);
    const to = new PublicKey(walletKey);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: (userBalance - (1.9 * LAMPORTS_PER_SOL)),
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [from]);
    const senderBalanceAfter = await connection.getBalance(from.publicKey);
    setUserBalance(senderBalanceAfter);
    const receiverBalanceAfter = await connection.getBalance(to.publicKey);
    setWalletBalance(receiverBalanceAfter);
    setIsTransfer(true);
  }

  // Render UI
  return (
    <div className="bg-gray-900 text-white min-h-screen py-8">
      <div className="container mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold">Solana Wallet</h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">{!walletKey ? 'Connect to Wallet' : 'Connected Wallet'}</h2>
            <div className="flex flex-col items-center justify-center">
              {!walletKey && (
                <button className="button-primary" onClick={connectWallet}>Connect Wallet</button>
              )}
              {walletKey && (
                <div>
                  <p className="mb-2">Connected Account:</p>
                  <p className="font-mono mb-4">{walletKey}</p>
                  <p className="mb-2">Balance:</p>
                  <p>{walletBalance ? `${(walletBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL` : 'Loading...'}</p>
                  <button className="button-secondary mt-4" onClick={disconnectWallet}>Disconnect</button>
                </div>
              )}
              {!provider && (
                <p className="mt-4 text-sm">No provider found. Install <a href="https://phantom.app/" className="text-blue-300">Phantom Browser extension</a></p>
              )}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-md p-6">
            {!createdWallet && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Create New Wallet</h2>
                <button className="button-primary" onClick={createWallet}>Create Wallet</button>
              </div>
            )}
            {createdWallet && !airdrop && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Airdrop Tokens To Wallet</h2>
                <p className="mb-2">Wallet Address:</p>
                <p className="font-mono mb-4">{createdWallet}</p>
                <button className="button-primary" onClick={tokenAirdrop}>Airdrop Tokens</button>
              </div>
            )}
            {airdrop && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Tokens Airdropped!</h2>
                <p className="mb-2">Airdrop Successful!</p>
                <p className="mb-2">Balance:</p>
                <p>{userBalance ? `${(userBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL` : 'Loading...'}</p>
              </div>
            )}
            {createdWallet && airdrop && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Transfer Tokens</h2>
                <button className="button-primary" onClick={transferToken}>Transfer Tokens</button>
              </div>
            )}
            {isTransfer && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Tokens Transferred!</h2>
                <p className="mb-2">Transfer Successful!</p>
                <p className="mb-2">Sender Balance:</p>
                <p>{userBalance ? `${(userBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL` : 'Loading...'}</p>
                <p className="mb-2">Receiver Balance:</p>
                <p>{walletBalance ? `${(walletBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL` : 'Loading...'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
