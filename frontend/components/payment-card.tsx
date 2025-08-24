'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '@/const/contractDetails';

interface PaymentCardProps {
  onPaymentSuccess: () => void;
  targetAddress?: string;
}

export function PaymentCard({ onPaymentSuccess, targetAddress }: PaymentCardProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fallbackMintPrice, setFallbackMintPrice] = useState<bigint | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  // Use target address if provided, otherwise use connected wallet address
  const userAddress = targetAddress || address;

  // Read mint price from contract with better error handling
  const { data: mintPrice, isLoading: mintPriceLoading, error: mintPriceError } = useReadContract({
    address: FORGE_PAYMENT_ADDRESS,
    abi: FORGE_PAYMENT_ABI,
    functionName: 'mintPrice',
    query: {
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Read user's current paid token count
  const { data: paidTokenCount, refetch: refetchPaidTokens } = useReadContract({
    address: FORGE_PAYMENT_ADDRESS,
    abi: FORGE_PAYMENT_ABI,
    functionName: 'getUserPaidTokenCount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      staleTime: 0, // Always consider data stale
      gcTime: 0, // Don't cache
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  });

  // Check if user can mint
  const { data: canMint, refetch: refetchCanMint } = useReadContract({
    address: FORGE_PAYMENT_ADDRESS,
    abi: FORGE_PAYMENT_ABI,
    functionName: 'userCanMint',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      staleTime: 0, // Always consider data stale
      gcTime: 0, // Don't cache
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  });

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handlePayment = async () => {
    console.log('Payment attempt:', { 
      isConnected, 
      address, 
      mintPrice: effectiveMintPrice?.toString(), 
      userAddress 
    });

    if (!isConnected || !address) {
      setError('Please connect your wallet to make payment');
      return;
    }

    if (!effectiveMintPrice) {
      setError('Loading mint price... Please try again');
      return;
    }

    if (!userAddress) {
      setError('No target address specified');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      writeContract({
        address: FORGE_PAYMENT_ADDRESS,
        abi: FORGE_PAYMENT_ABI,
        functionName: 'payForMint',
        value: effectiveMintPrice,
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsLoading(false);
    }
  };

  // Handle transaction confirmation
  React.useEffect(() => {
    if (isConfirmed) {
      setSuccess(true);
      setIsLoading(false);
      refetchPaidTokens();
      refetchCanMint();
      onPaymentSuccess();
    }
  }, [isConfirmed, refetchPaidTokens, refetchCanMint, onPaymentSuccess]);

  // Clear errors when wallet connection changes
  React.useEffect(() => {
    if (isConnected && address) {
      setError(null);
    }
  }, [isConnected, address]);

  // Fallback: Fetch mint price from API if wagmi hook fails
  React.useEffect(() => {
    // Always try API first since we know it works
    if (!fallbackMintPrice && !fallbackError) {
      console.log('Loading mint price from API...');
      fetch('/api/mint-price')
        .then(res => res.json())
        .then(data => {
          if (data.mintPrice) {
            setFallbackMintPrice(BigInt(data.mintPrice));
            setFallbackError(null);
            console.log('API mint price loaded:', data.mintPrice);
          } else if (data.error) {
            setFallbackError(data.error);
            console.error('API returned error:', data.error);
          }
        })
        .catch(err => {
          const errorMsg = 'Failed to load mint price from API';
          setFallbackError(errorMsg);
          console.error('API mint price failed:', err);
        });
    }
  }, [fallbackMintPrice, fallbackError]);

  // Use wagmi price or fallback price
  const effectiveMintPrice = mintPrice || fallbackMintPrice;
  const effectiveMintPriceLoading = mintPriceLoading && !fallbackMintPrice && !fallbackError;

  if (!isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Required
          </CardTitle>
          <CardDescription>
            Connect your wallet to proceed with payment
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Show success state if user already has minting credits
  if (canMint && Number(paidTokenCount || 0) > 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Payment Complete
          </CardTitle>
          <CardDescription className="text-green-600">
            You have {Number(paidTokenCount || 0)} minting credit(s) available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Required
        </CardTitle>
        <CardDescription>
          Pay {effectiveMintPrice ? formatEther(effectiveMintPrice) : '0.01'} ETH to mint your AI-generated NFT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mintPriceError && !fallbackMintPrice && fallbackError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load mint price. Please check your connection and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Payment successful! You can now proceed with minting.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mint Price:</span>
            <span className="font-medium">
              {effectiveMintPrice ? formatEther(effectiveMintPrice) : '0.01'} ETH
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Your Credits:</span>
            <span className="font-medium">
              {Number(paidTokenCount || 0)} token(s)
            </span>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={isLoading || isConfirming || success || effectiveMintPriceLoading || !effectiveMintPrice}
          className="w-full"
        >
          {isLoading || isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isConfirming ? 'Confirming...' : 'Processing...'}
            </>
          ) : success ? (
            'Payment Complete'
          ) : effectiveMintPriceLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Price...
            </>
          ) : !effectiveMintPrice ? (
            'Price Not Available'
          ) : (
            `Pay ${formatEther(effectiveMintPrice)} ETH`
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          After payment, you&apos;ll receive minting credits that allow our AI to create and mint your NFT.
        </p>
      </CardContent>
    </Card>
  );
}
