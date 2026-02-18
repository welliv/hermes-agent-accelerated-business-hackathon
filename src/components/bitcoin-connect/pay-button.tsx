import { useState, useEffect, useRef, useCallback } from "react";
import {
  PayButton,
  refreshBalance,
  onConnected,
  onDisconnected,
} from "@getalby/bitcoin-connect-react";
import type { SendPaymentResponse } from "@webbtc/webln-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useWalletStore, useTransactionStore } from "@/stores";
import { WalletCard } from "@/components/wallet-card";
import { WALLET_PERSONAS } from "@/types";
import { TestWalletHelper } from "./test-wallet-helper";

export function PayButtonScenario() {
  const [amount, setAmount] = useState<number>(100);
  const [invoice, setInvoice] = useState<string | undefined>(undefined);
  const [isPaid, setIsPaid] = useState(false);
  const [payment, setPayment] = useState<SendPaymentResponse | undefined>(
    undefined,
  );
  const paidAmountRef = useRef<number>(0);
  const pollingRef = useRef<number | null>(null);
  const isExternalPaymentRef = useRef<boolean>(false);

  const initializeWallets = useWalletStore((state) => state.initializeWallets);
  const getNWCClient = useWalletStore((state) => state.getNWCClient);
  const setWalletBalance = useWalletStore((state) => state.setWalletBalance);
  const setWalletStatus = useWalletStore((state) => state.setWalletStatus);
  const bobWallet = useWalletStore((state) => state.wallets["bob"]);
  const bobConnected = bobWallet?.status === "connected";

  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore(
    (state) => state.updateTransaction,
  );
  const addFlowStep = useTransactionStore((state) => state.addFlowStep);
  const updateFlowStep = useTransactionStore((state) => state.updateFlowStep);
  const addBalanceSnapshot = useTransactionStore(
    (state) => state.addBalanceSnapshot,
  );

  // Stop polling for external payments
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Initialize wallets on mount
  useEffect(() => {
    initializeWallets(["alice", "bob"]);
  }, [initializeWallets]);

  // Sync Alice's Bitcoin Connect state into the wallet store
  useEffect(() => {
    const unsubConnected = onConnected(() =>
      setWalletStatus("alice", "connected"),
    );
    const unsubDisconnected = onDisconnected(() =>
      setWalletStatus("alice", "disconnected"),
    );
    return () => {
      unsubConnected();
      unsubDisconnected();
    };
  }, [setWalletStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handlePaymentComplete = useCallback(
    async (amountSats: number, isExternal: boolean) => {
      stopPolling();
      setIsPaid(true);

      addTransaction({
        type: "payment_received",
        status: "success",
        fromWallet: "alice",
        toWallet: "bob",
        amount: amountSats,
        description: isExternal
          ? `External wallet paid ${amountSats} sats to Bob via PayButton`
          : `Alice paid ${amountSats} sats to Bob via PayButton`,
        snippetIds: isExternal
          ? ["bc-pay-button", "lookup-invoice"]
          : ["bc-pay-button"],
      });

      addFlowStep({
        fromWallet: "alice",
        toWallet: "bob",
        label: isExternal
          ? `External payment: ${amountSats} sats`
          : `Paid ${amountSats} sats via PayButton`,
        direction: "right",
        status: "success",
        snippetIds: isExternal
          ? ["bc-pay-button", "lookup-invoice"]
          : ["bc-pay-button"],
      });

      try {
        const bobClient = getNWCClient("bob");
        if (bobClient) {
          const bobBalance = await bobClient.getBalance();
          const bobBalanceSats = Math.floor(bobBalance.balance / 1000);
          setWalletBalance("bob", bobBalanceSats);
          addBalanceSnapshot({ walletId: "bob", balance: bobBalanceSats });
        }
      } catch (error) {
        console.error("Failed to refresh Bob's balance:", error);
      }

      refreshBalance();
    },
    [
      stopPolling,
      addTransaction,
      addFlowStep,
      getNWCClient,
      setWalletBalance,
      addBalanceSnapshot,
    ],
  );

  // Start polling to detect external payments (QR code scanned by another wallet)
  const startPollingForExternalPayment = useCallback(
    (invoiceString: string) => {
      stopPolling();

      pollingRef.current = setInterval(async () => {
        try {
          const bobClient = getNWCClient("bob");
          if (!bobClient) return;

          const transaction = await bobClient.lookupInvoice({
            invoice: invoiceString,
          });

          if (transaction.state === "settled" && pollingRef.current !== null) {
            stopPolling();
            isExternalPaymentRef.current = true;
            setPayment({
              preimage: transaction.preimage,
            } as SendPaymentResponse);
          }
        } catch (error) {
          console.error("Error polling for external payment:", error);
        }
      }, 2000);
    },
    [stopPolling, getNWCClient],
  );

  const handleClick = useCallback(async () => {
    if (!bobConnected) return undefined;

    const txId = addTransaction({
      type: "invoice_created",
      status: "pending",
      fromWallet: "bob",
      amount: amount,
      description: `Creating invoice for ${amount} sats...`,
      snippetIds: ["make-invoice"],
    });

    const flowStepId = addFlowStep({
      fromWallet: "bob",
      toWallet: "alice",
      label: `Creating invoice for ${amount} sats...`,
      direction: "left",
      status: "pending",
      snippetIds: ["make-invoice"],
    });

    try {
      const bobClient = getNWCClient("bob");
      if (!bobClient) throw new Error("Bob's wallet not connected");

      // Create invoice using Bob's NWC wallet
      const invoiceResponse = await bobClient.makeInvoice({
        amount: amount * 1000, // Convert to millisats
        description: `Payment of ${amount} sats via PayButton`,
      });

      updateTransaction(txId, {
        status: "success",
        description: `Invoice created for ${amount} sats`,
      });

      updateFlowStep(flowStepId, {
        label: `Invoice: ${amount} sats`,
        status: "success",
      });

      // Store the amount for when payment completes
      paidAmountRef.current = amount;
      isExternalPaymentRef.current = false;

      // Start polling for external payments (in case user pays via QR code with another wallet)
      startPollingForExternalPayment(invoiceResponse.invoice);

      // Set the invoice in state and return it to PayButton
      setInvoice(invoiceResponse.invoice);
      return invoiceResponse.invoice;
    } catch (error) {
      console.error("Failed to create invoice:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      updateTransaction(txId, {
        status: "error",
        description: `Failed to create invoice: ${errorMessage}`,
      });

      updateFlowStep(flowStepId, {
        label: "Invoice creation failed",
        status: "error",
      });

      return undefined;
    }
  }, [
    bobConnected,
    amount,
    addTransaction,
    addFlowStep,
    getNWCClient,
    updateTransaction,
    updateFlowStep,
    startPollingForExternalPayment,
  ]);

  // Stable onPaid callback — new arrow function every render would cause PayButton's
  // internal effect to re-run (re-dispatching "bc:onpaid") on every render.
  const handleOnPaid = useCallback(() => {
    handlePaymentComplete(paidAmountRef.current, isExternalPaymentRef.current);
  }, [handlePaymentComplete]);

  const handleReset = () => {
    setInvoice(undefined);
    setPayment(undefined);
    setIsPaid(false);
    paidAmountRef.current = 0;
    isExternalPaymentRef.current = false;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-md:flex-wrap">
        {/* Alice Card - Pays via PayButton */}
        <Card className="flex-1">
          <CardHeader className="pb-2 min-w-xs">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{WALLET_PERSONAS.alice.emoji}</span>
                <span>Alice</span>
              </CardTitle>
              <Badge variant="outline">Bitcoin Connect</Badge>
            </div>
          </CardHeader>
          <div className="flex-1" />
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The PayButton component provides a one-click payment experience.
              It uses the <code>onClick</code> callback to fetch an invoice on
              demand, then opens the payment modal.
            </p>

            {!bobConnected ? (
              <p className="text-sm text-muted-foreground text-center">
                Connect Bob's wallet to enable payments...
              </p>
            ) : (
              <div className="space-y-3">
                {isPaid && (
                  <div className="text-center space-y-2">
                    <div className="text-green-500 font-medium">
                      Payment Complete!
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      New Payment
                    </Button>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Amount (sats)
                  </label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                    placeholder="100"
                    disabled={isPaid}
                  />
                </div>
                <div className="flex justify-center">
                  <PayButton
                    invoice={invoice}
                    payment={payment}
                    onClick={handleClick}
                    onPaid={handleOnPaid}
                  />
                </div>
              </div>
            )}

            <TestWalletHelper showExternalPayment />
          </CardContent>
        </Card>
        {/* Bob's Wallet Card - Receives payment */}
        {bobWallet && <WalletCard wallet={bobWallet} />}
      </div>
    </div>
  );
}
