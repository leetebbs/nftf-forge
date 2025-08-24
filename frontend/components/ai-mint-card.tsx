'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Copy, ExternalLink, Loader2, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';

// List of all available themes (should match backend)
const ALL_THEMES = [
  { key: 'shape', label: 'Shape Network', desc: 'Geometric crystalline, 3D forms' },
  { key: 'abstract', label: 'Abstract Digital', desc: 'Fluid-dynamic, neon, digital waves' },
  { key: 'cyberpunk', label: 'Cyberpunk City', desc: 'Neon-urban, city, digital rain' },
  { key: 'nature', label: 'Digital Nature', desc: 'Organic-tech, fractal trees, flowers' },
  { key: 'space', label: 'Cosmic Digital', desc: 'Stellar-abstract, cosmic, nebula' },
];

const RARITIES = [
  { key: 'common', label: 'Common' },
  { key: 'rare', label: 'Rare' },
  { key: 'epic', label: 'Epic' },
  { key: 'legendary', label: 'Legendary' },
];

interface NFTData {
  imageUrl?: string;
  metadataUrl?: string;
  transactionHash?: string;
  tokenId?: string;
  contractAddress?: string;
  name?: string;
  description?: string;
  walletAddress?: string;
  blockNumber?: string;
}

interface MintResponse {
  success: boolean;
  message: string;
  walletAddress?: string;
  imageUrl?: string;
  transactionHash?: string;
  blockNumber?: string;
  metadataHash?: string;
  error?: string;
  details?: string;
  // Legacy format support (for backward compatibility)
  data?: {
    type: string;
    text?: {
      value: string;
      annotations: unknown[];
    };
    nftData?: NFTData;
  };
}

// Helper function to parse NFT data from AI response
function parseNFTData(responseText: string): NFTData | null {
  try {
    console.log('Full AI response:', responseText);
    
    // Enhanced DALL-E URL detection - look for multiple patterns
    const dalleUrlPatterns = [
      /FULL_DALLE_URL:(https?:\/\/[^\s,\)\]\}\"\']*)/gi,
      /(https?:\/\/[^\s]*(?:blob\.core\.windows\.net|oaidalleapi|openai)[^\s,\)\]\}\"\']*)/gi,
      /(https?:\/\/[^\s]*dalleapi[^\s,\)\]\}\"\']*)/gi,
      /(https?:\/\/[^\s]*\.blob\.core\.windows\.net[^\s,\)\]\}\"\']*)/gi,
      /DALL-E URL[:\s]+(https?:\/\/[^\s,\)\]\}\"\']+)/gi,
      /image.*?URL[:\s]+(https?:\/\/[^\s,\)\]\}\"\']+)/gi,
      /generated.*?image[:\s]+(https?:\/\/[^\s,\)\]\}\"\']+)/gi,
      // Add fallback pattern for truncated URLs that we can still work with
      /(https?:\/\/oaidalleapi[^\s,\)\]\}\"\']*)/gi
    ];
    
    let dalleUrlMatch = null;
    for (const pattern of dalleUrlPatterns) {
      const matches = responseText.match(pattern);
      if (matches && matches[0]) {
        dalleUrlMatch = matches[0];
        // Extract just the URL part if it includes a prefix
        if (dalleUrlMatch.includes('FULL_DALLE_URL:')) {
          dalleUrlMatch = dalleUrlMatch.replace('FULL_DALLE_URL:', '');
        }
        console.log(`Found DALL-E URL with pattern ${pattern}:`, dalleUrlMatch);
        break;
      }
    }
    
    console.log('DALL-E URL matches:', dalleUrlMatch);
    
    // Look for any image URLs as fallback
    const imageUrlMatch = dalleUrlMatch || 
                         responseText.match(/image.*?url[:\s]+(https?:\/\/[^\s,\)\]\}\"\']+)/i)?.[1] ||
                         responseText.match(/generated.*?image.*?(https?:\/\/[^\s,\)\]\}\"\']+)/i)?.[1] ||
                         responseText.match(/image.*?(https?:\/\/[^\s,\)\]\}\"\']+\.(?:jpg|jpeg|png|gif|webp))/i)?.[1] ||
                         responseText.match(/(https?:\/\/[^\s,\)\]\}\"\']+\.(?:jpg|jpeg|png|gif|webp))/i)?.[1];
    
    console.log('Extracted image URL:', imageUrlMatch);
    
    // DEBUG: If no image URL found, let's see what patterns might match
    if (!imageUrlMatch) {
      console.log('No image URL found. Checking for any HTTP URLs in response:');
      const allUrls = responseText.match(/https?:\/\/[^\s,\)\]\}\"\']+/gi);
      console.log('All URLs found:', allUrls);
    }
    
    // Look for IPFS URLs
    const metadataUrlMatch = responseText.match(/metadata.*?url[:\s]+(https?:\/\/[^\s,\)\]]+)/i) ||
                            responseText.match(/ipfs[:\s]+(https?:\/\/[^\s,\)\]]+)/i) ||
                            responseText.match(/(https?:\/\/[^\s]*ipfs[^\s,\)\]]*)/i);
    
    const txHashMatch = responseText.match(/transaction.*?hash[:\s]+([0-9a-fA-F]{64})/i) ||
                       responseText.match(/tx[:\s]+([0-9a-fA-F]{64})/i) ||
                       responseText.match(/hash[:\s]+([0-9a-fA-F]{64})/i);
    
    const tokenIdMatch = responseText.match(/token.*?id[:\s]+(\d+)/i) ||
                        responseText.match(/id[:\s]+(\d+)/i);
    
    const contractMatch = responseText.match(/contract.*?address[:\s]+(0x[0-9a-fA-F]{40})/i) ||
                         responseText.match(/address[:\s]+(0x[0-9a-fA-F]{40})/i);

    // Look for IPFS hash in the response
    const ipfsHashMatch = responseText.match(/ipfs.*?hash[:\s]+([A-Za-z0-9]{46,})/i) ||
                         responseText.match(/QmR[A-Za-z0-9]{44}/i);

    const extractedData = {
      imageUrl: imageUrlMatch,
      metadataUrl: metadataUrlMatch?.[1],
      transactionHash: txHashMatch?.[1],
      tokenId: tokenIdMatch?.[1],
      contractAddress: contractMatch?.[1],
      ipfsHash: ipfsHashMatch?.[1],
      name: "AI NFT Forge",
      description: "AI-generated NFT"
    };

    console.log('Parsed NFT data:', extractedData);

    return extractedData;
  } catch (error) {
    console.error('Error parsing NFT data:', error);
    return null;
  }
}

interface AIMintCardProps {
  onProgress?: (value: number) => void;
  onLoading?: (loading: boolean) => void;
}

export function AIMintCard({ onProgress, onLoading }: AIMintCardProps) {
  const { address, isConnected } = useAccount();
  const [targetAddress, setTargetAddress] = useState(address || '');
  const [nftTheme, setNftTheme] = useState<string>('shape');
  const [rarity, setRarity] = useState<string>('common');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(item);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleMint = async () => {
    if (!targetAddress || !isAddress(targetAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }


  setIsLoading(true);
  onLoading?.(true);
  setError(null);
  setResult(null);
  if (onProgress) onProgress(10);

    try {
      // Simulate progress for demo, update as needed for real async steps
      if (onProgress) onProgress(20);
      const response = await fetch('/api/ai-mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: targetAddress,
          theme: nftTheme,
          rarity: rarity
        }),
      });
      if (onProgress) onProgress(60);
      const data = await response.json();
      if (onProgress) onProgress(90);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mint NFT');
      }

      setResult(data);
      if (onProgress) onProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      if (onProgress) onProgress(0);
    } finally {
      setIsLoading(false);
      onLoading?.(false);
      setTimeout(() => {
        if (onProgress) onProgress(0);
      }, 1000);
    }
  };

  // Parse NFT data from the result
  const parsedData = result?.data?.text?.value ? parseNFTData(result.data.text.value) : null;
  
  // Merge direct result data with parsed data, prioritizing direct result data
  const nftData: NFTData | null = {
    ...parsedData,
    // Override with direct API response values if available
    ...(result?.transactionHash && { transactionHash: result.transactionHash }),
    ...(result?.imageUrl && { imageUrl: result.imageUrl }),
    ...(result?.metadataHash && { metadataUrl: `https://gateway.pinata.cloud/ipfs/${result.metadataHash}` }),
    ...(result?.blockNumber && { blockNumber: result.blockNumber }),
    ...(result?.walletAddress && { walletAddress: result.walletAddress }),
  };
  
  // Use the image URL from direct result or parsed data
  const imageUrl = result?.imageUrl || parsedData?.imageUrl;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI NFT Forge</CardTitle>
          <CardDescription>
            Generate and mint a themed NFT using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Wallet Address</Label>
            <Input
              id="address"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x..."
              disabled={isLoading}
            />
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetAddress(address || '')}
                disabled={isLoading}
              >
                Use Connected Wallet
              </Button>
            )}
          </div>

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label>NFT Theme</Label>
            <RadioGroup
              value={nftTheme}
              onValueChange={(value: string) => setNftTheme(value)}
              disabled={isLoading}
              className="grid grid-cols-2 gap-4"
            >
              {ALL_THEMES.map((theme) => (
                <div key={theme.key} className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={theme.key} id={theme.key} />
                  <Label htmlFor={theme.key} className="cursor-pointer flex-1">
                    <div>
                      <div className="font-medium">{theme.label}</div>
                      <div className="text-sm text-muted-foreground">{theme.desc}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Rarity Selection */}
          <div className="space-y-3">
            <Label>Rarity</Label>
            <RadioGroup
              value={rarity}
              onValueChange={(value: string) => setRarity(value)}
              disabled={isLoading}
              className="grid grid-cols-2 gap-4"
            >
              {RARITIES.map((r) => (
                <div key={r.key} className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={r.key} id={r.key} />
                  <Label htmlFor={r.key} className="cursor-pointer flex-1">
                    <div className="font-medium">{r.label}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button 
            onClick={handleMint} 
            disabled={isLoading || !targetAddress}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating & Minting...
              </>
            ) : (
              'Generate & Mint NFT'
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* NFT Display Card */}
      {result && nftData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  NFT Minted Successfully!
                </CardTitle>
                <CardDescription>
                  Your AI-generated NFT has been created
                </CardDescription>
              </div>
              <Badge variant="secondary">
                Minted
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* NFT Image */}
            {(imageUrl || nftData?.imageUrl) && (
              <div className="space-y-2">
                <Label>Generated NFT Image</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative overflow-hidden rounded-lg border bg-muted cursor-pointer group">
                      <img 
                        key={result?.data?.text?.value?.substring(0, 50) || Date.now()} // Force re-render
                        src={imageUrl || nftData?.imageUrl} 
                        alt={nftData?.name || "AI Generated NFT"}
                        className="w-full h-64 object-cover transition-all group-hover:scale-105"
                        onError={(e) => {
                          console.error('Image failed to load:', imageUrl);
                          // Hide the image container if it fails to load
                          const parent = e.currentTarget.parentElement;
                          if (parent) parent.style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-black/50 text-white">
                          AI Generated
                        </Badge>
                      </div>
                      {/* Click to expand overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 rounded-full p-2">
                            <Maximize2 className="h-6 w-6 text-black" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                    <DialogHeader className="p-6 pb-2">
                      <DialogTitle>NFT Full Image</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                      <div className="relative rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={imageUrl || nftData?.imageUrl} 
                          alt={nftData?.name || "AI Generated NFT"}
                          className="w-full h-auto max-h-[70vh] object-contain"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge variant="secondary" className="bg-black/50 text-white">
                            AI Generated
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Action buttons in modal */}
                      <div className="mt-4 flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(imageUrl || nftData?.imageUrl || '', 'image-modal')}
                        >
                          {copiedItem === 'image-modal' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link 
                            href={imageUrl || nftData?.imageUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Original
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Image URL for reference */}
                {(imageUrl || nftData?.imageUrl) && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Image Source</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-xs">
                        {imageUrl || nftData?.imageUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(imageUrl || nftData?.imageUrl || '', 'image')}
                      >
                        {copiedItem === 'image' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      {(imageUrl || nftData?.imageUrl) && (
                        <Link 
                          href={imageUrl || nftData?.imageUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NFT Details */}
            <div className="space-y-3">
              <Separator />
              
              {nftData.name && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm">{nftData.name}</p>
                </div>
              )}

              {nftData.description && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{nftData.description}</p>
                </div>
              )}

              {/* Transaction Details */}
              <div className="grid grid-cols-1 gap-3 text-sm">
                {nftData.transactionHash && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Transaction Hash</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-xs">
                        {nftData.transactionHash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(nftData.transactionHash!, 'tx')}
                      >
                        {copiedItem === 'tx' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Link 
                        href={`https://etherscan.io/tx/${nftData.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {nftData.contractAddress && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Contract Address</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-xs">
                        {nftData.contractAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(nftData.contractAddress!, 'contract')}
                      >
                        {copiedItem === 'contract' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {nftData.tokenId && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Token ID</Label>
                    <code className="block bg-muted px-2 py-1 rounded text-xs">
                      {nftData.tokenId}
                    </code>
                  </div>
                )}

                {nftData.metadataUrl && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Metadata</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-xs">
                        {nftData.metadataUrl}
                      </code>
                      <Link 
                        href={nftData.metadataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Recipient Address */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Minted To</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-xs">
                    {nftData?.walletAddress || result.walletAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(nftData?.walletAddress || result.walletAddress || '', 'address')}
                  >
                    {copiedItem === 'address' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback result display */}
      {result && !nftData && (
        <Card>
          <CardHeader>
            <CardTitle>Process Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Success!</p>
                  <p>{result.message}</p>
                  <p className="text-sm text-muted-foreground">
                    Target Address: {result.walletAddress || 'N/A'}
                  </p>
                  {result.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer">View Details</summary>
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                        {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
