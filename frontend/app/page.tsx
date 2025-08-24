'use client';


import { AIMintCard } from '@/components/ai-mint-card';
import { Progress } from '@/components/ui/progress';
import { WalletConnect } from '@/components/wallet-connect';
import { useState } from 'react';
import logo from '../public/logo.png';

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center space-y-8">
      <div className="space-y-4 text-center">
        <img src={logo.src} alt="AI NFT Forge Logo" className="w-24 h-24 mx-auto mb-4" />
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Shape NFT Forge</h1>
        <p className="text-muted-foreground max-w-2xl text-xl">
          Create unique AI-generated NFTs with customizable themes. Choose from multiple visual styles including geometric, abstract, cyberpunk, nature, and cosmic designs.
        </p>
      </div>

      {/* Progress Bar */}
      {isLoading && (
        <div className="w-full max-w-2xl mb-4">
          <Progress value={progress} />
        </div>
      )}

      {/* Wallet Connection and AI Minting Section */}
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-center">
          <WalletConnect />
        </div>

        {/* AI NFT Minting Card */}
        <div className="flex justify-center">
          <AIMintCard 
            onProgress={setProgress} 
            onLoading={setIsLoading}
          />
        </div>
      </div>
    </div>
  );
}
