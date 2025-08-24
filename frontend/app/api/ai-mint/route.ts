import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createAssistant } from '../../../openai/createAssistant';
import { createRun } from '../../../openai/createRun';
import { createThread } from '../../../openai/createThread';
import { performRun } from '../../../openai/performRun';
import { shapes } from '../../../shapes';
import { uploadFileToPinata, uploadJsonToPinata } from '../../../tools/pinataUtils';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Theme configurations (removed alchemy)
const THEMES = {
  shape: {
    name: "Shape Network",
    style: "geometric-crystalline",
    colors: ["deep teals", "electric blues", "iridescent whites"],
    elements: ["3D geometric forms", "crystalline surfaces", "network patterns", "data streams"]
  },
  abstract: {
    name: "Abstract Digital",
    style: "fluid-dynamic",
    colors: ["neon greens", "cyber oranges", "digital purples"],
    elements: ["flowing data", "particle systems", "digital waves", "code fragments"]
  },
  cyberpunk: {
    name: "Cyberpunk City",
    style: "neon-urban",
    colors: ["hot pinks", "electric blues", "acid greens"],
    elements: ["neon grids", "holographic displays", "urban landscapes", "digital rain"]
  },
  nature: {
    name: "Digital Nature",
    style: "organic-tech",
    colors: ["forest greens", "earth browns", "sky blues"],
    elements: ["fractal trees", "digital flowers", "tech-organic fusion", "glowing seeds"]
  },
  space: {
    name: "Cosmic Digital",
    style: "stellar-abstract",
    colors: ["deep space blues", "stellar whites", "nebula purples"],
    elements: ["constellation patterns", "cosmic dust", "digital planets", "light streams"]
  }
} as const;

type ThemeKey = keyof typeof THEMES;

// Art styles for variety
const ART_STYLES = [
  'photorealistic 3D rendering',
  'low-poly geometric',
  'vaporwave aesthetic',
  'glitch art inspired',
  'minimalist vector',
  'maximalist detailed',
  'holographic display',
  'wireframe overlay'
];

/**
 * Generate dynamic prompt based on theme and randomization
 */
function generatePrompt(theme: ThemeKey, walletAddress: string): string {
  const themeConfig = THEMES[theme];
  const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
  const randomStyle = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
  
  // Create unique elements based on wallet address hash
  const walletHash = hashCode(walletAddress);
  const uniqueColorIndex = Math.abs(walletHash) % themeConfig.colors.length;
  const uniqueElementIndex = Math.abs(walletHash >> 8) % themeConfig.elements.length;
  
  const basePrompt = `Create a ${randomStyle} digital illustration with ${themeConfig.style} aesthetics. 

VISUAL ELEMENTS:
- Central focus: ${randomShape} representing ${themeConfig.name}
- Primary color: ${themeConfig.colors[uniqueColorIndex]} with accents from ${themeConfig.colors.join(', ')}
- Key element: ${themeConfig.elements[uniqueElementIndex]}
- Style: ${randomStyle} with dramatic lighting and depth

COMPOSITION:
- High contrast lighting with volumetric effects
- Significant negative space for visual balance
- Sharp details with selective blur for depth of field
- Modern, premium aesthetic suitable for NFT collection

TECHNICAL REQUIREMENTS:
- Square aspect ratio (1:1)
- High resolution suitable for NFT standards
- Rich detail that scales well at different sizes
- Unique visual signature based on wallet: ${walletAddress.slice(-6)}

CRITICAL WORKFLOW: 
1. First, call generateImage tool to create the image - this will return a DALL-E URL
2. download the image from the DALL-E URL
3. Then, call uploadFileToPinata tool EXACTLY ONCE and upload the downloaded image
4. Add the returned image cid to the NFT metadata
5. mint ONE NFT to wallet address ${walletAddress}
6. Do not attempt to save images locally - use the DALL-E URL directly
7. Do not call any minting tools multiple times.

IMPORTANT: the uploadFileToPinata, uploadJsonToPinata tools must be used to upload the image and metadata!`;

  return basePrompt;
}

/**
 * Simple hash function for wallet address
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * POST /api/ai-mint
 * Main endpoint for AI-powered NFT minting with dynamic themes
 * Body: { 
 *   message: "wallet_address",
 *   theme?: ThemeKey (defaults to random selection)
 *   rarity?: "common" | "rare" | "epic" | "legendary" (affects complexity)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables first
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'PINATA_API_KEY', 
      'PINATA_API_SECRET',
      'PRIVATE_KEY',
      'NEXT_PUBLIC_ALCHEMY_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
      console.error('Missing environment variables:', missingEnvVars);
      return NextResponse.json(
        { error: `Missing required environment variables: ${missingEnvVars.join(', ')}` },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, theme, rarity = 'common' } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message (wallet address) is required' },
        { status: 400 }
      );
    }

    // Select theme - either provided or random based on wallet
    const walletHash = hashCode(message);
    const themeKeys = Object.keys(THEMES) as ThemeKey[];
    const selectedTheme: ThemeKey = theme && theme in THEMES 
      ? theme 
      : themeKeys[Math.abs(walletHash) % themeKeys.length];

    console.log('Received wallet address:', message);
    console.log('Selected theme:', selectedTheme);
    console.log('Rarity level:', rarity);

    // 1. Generate prompt
    const aiPrompt = generatePrompt(selectedTheme, message);
    const rarityEnhancement = rarity === 'legendary' 
      ? '\n\nENHANCEMENT: Add extra visual complexity with particle effects, multiple light sources, and intricate details for LEGENDARY rarity.'
      : rarity === 'epic'
      ? '\n\nENHANCEMENT: Include additional atmospheric effects and refined details for EPIC rarity.'
      : rarity === 'rare'
      ? '\n\nENHANCEMENT: Add subtle special effects and enhanced lighting for RARE quality.'
      : '';
    const finalPrompt = aiPrompt + rarityEnhancement;

    // 2. Generate image with OpenAI Assistant (handles full workflow including minting)
    const assistant = await createAssistant(openai);
    const thread = await createThread(openai, finalPrompt);
    const run = await createRun(openai, thread, assistant.id);
    const result = await performRun(openai, thread, run);

    // 3. Check if assistant completed the full workflow first
    console.log('Assistant result:', JSON.stringify(result, null, 2));
    
    if (result && result.type === "text" && result.text) {
      const responseText = result.text.value;
      console.log('Assistant response text:', responseText);
      
      // Look for indicators that the assistant completed the full workflow
      // Priority order: check for our required format first, then fallbacks
      if (responseText.includes("Successfully minted your NFT") || 
          responseText.includes("NFT has been minted") || 
          responseText.includes("the NFT has been minted") ||
          responseText.includes("NFT has been successfully minted") || 
          responseText.includes("Your NFT has been successfully minted") ||
          responseText.includes("NFT MINTED SUCCESSFULLY") || 
          responseText.includes("MINTING COMPLETED") ||
          responseText.includes("NFT minting process has been successfully completed") ||
          responseText.includes("Transaction hash:") ||
          responseText.includes("NFT Transaction Hash:") ||
          responseText.includes("Minting Transaction Hash") ||
          responseText.includes("MINTING FAILED") ||
          responseText.includes("User has already minted") ||
          responseText.includes("Error uploading to IPFS")) {
        
        console.log('Assistant completed full workflow, processing response...');
        console.log('Response text preview:', responseText.substring(0, 500));
        
        // Check for failure cases first
        if (responseText.includes("MINTING FAILED") || 
            responseText.includes("User has already minted") ||
            responseText.includes("Error uploading to IPFS")) {
          return NextResponse.json({
            success: false,
            message: responseText.includes("User has already minted") 
              ? "This wallet has already minted the maximum number of NFTs allowed." 
              : "Minting failed",
            details: responseText,
            error: responseText.includes("User has already minted") ? "MINTING_LIMIT_REACHED" : "MINTING_FAILED"
          }, { status: 400 });
        } else {
          // Success case - extract transaction details and image URL with improved patterns
          // Priority: Parse our standardized format first, then fallbacks
          const txHashMatch = responseText.match(/\*\*NFT Transaction Hash:\*\*\s*\[([0x[a-fA-F0-9]{64})\]/) ||
                             responseText.match(/\*\*Transaction Hash\*\*[:\s]*\[([0x[a-fA-F0-9]{64})\]/) ||
                             responseText.match(/(?:Transaction hash:|Minting Transaction Hash.*?|NFT Transaction Hash.*?): (?:\[)?(0x[a-fA-F0-9]{64})(?:\])?/) ||
                             responseText.match(/\*\*Transaction Hash\*\*[:\s]*`(0x[a-fA-F0-9]{64})`/) ||
                             responseText.match(/(0x[a-fA-F0-9]{64})/);
          
          const metadataHashMatch = responseText.match(/\*\*Metadata IPFS Hash:\*\*\s*\[([a-zA-Z0-9]+)\]/) ||
                                  responseText.match(/Metadata IPFS Hash.*?: ([a-zA-Z0-9]+)/);
          
          const blockMatch = responseText.match(/(?:Transaction confirmed in block:|Minting Block Number.*?|Block Number.*?): (\d+)/);
          
          // More flexible image URL matching patterns - prioritize our standardized format
          const imageUrlMatch = responseText.match(/\*\*Image URL:\*\*\s*\[FULL_DALLE_URL\]\((https:\/\/[^)]+)\)/) ||
                               responseText.match(/\[FULL_DALLE_URL\]\((https:\/\/[^)]+)\)/) ||
                               responseText.match(/Image URL.*?\[FULL_DALLE_URL\]\((https:\/\/[^)]+)\)/) ||
                               responseText.match(/\*\*Image URL:\*\*.*?\[FULL_DALLE_URL\]\((https:\/\/[^)]+)\)/) ||
                               responseText.match(/(https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net[^\s\)]+)/);
          
          // Extract the URL from the match (it might be in different capture groups)
          const extractedImageUrl = imageUrlMatch && imageUrlMatch.length > 1 ? 
            (imageUrlMatch[1] || imageUrlMatch[2] || imageUrlMatch[0]) : null;
          
          const response: {
            success: boolean;
            message: string;
            walletAddress: string;
            transactionHash?: string;
            blockNumber?: string;
            details: string;
            imageUrl?: string;
            metadataHash?: string;
          } = {
            success: true,
            message: "NFT created and minted successfully!",
            walletAddress: message, // Add the target wallet address
            transactionHash: txHashMatch ? txHashMatch[1] : undefined,
            blockNumber: blockMatch ? blockMatch[1] : undefined,
            details: responseText
          };

          // Add image URL if found
          if (extractedImageUrl) {
            response.imageUrl = extractedImageUrl;
            console.log('Extracted image URL:', extractedImageUrl);
          } else {
            console.log('No image URL found in response:', responseText.substring(0, 500));
          }

          // Add metadata hash if found
          if (metadataHashMatch) {
            response.metadataHash = metadataHashMatch[1];
          }
          
          return NextResponse.json(response);
        }
      }
    }

    // 4. Fallback: If assistant didn't complete workflow, try legacy DALL-E extraction
    console.log('Assistant did not complete workflow, falling back to legacy approach...');
    const dalleUrl = extractDalleUrl(result);

    if (!dalleUrl) {
      return NextResponse.json(
        { error: 'Failed to extract DALL-E image URL from OpenAI result.' },
        { status: 500 }
      );
    }

    // 5. Download image from DALL-E URL (fallback legacy approach)
    const imageRes = await fetch(dalleUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: 'Failed to download image from DALL-E URL.' },
        { status: 500 }
      );
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // 6. Upload image to Pinata/IPFS (fallback legacy approach)
    const pinataImageRes = await uploadFileToPinata(imageBuffer, {
      fileName: `nft-image-${Date.now()}.png`,
      apiKey: process.env.PINATA_API_KEY!,
      apiSecret: process.env.PINATA_API_SECRET!,
    });
    const imageCid = pinataImageRes.IpfsHash;

    

    // 7. Create metadata with ipfs:// CID (fallback legacy approach)
    const metadata = {
      name: `AI NFT - ${THEMES[selectedTheme].name}`,
      description: `AI-generated NFT for ${message} (${selectedTheme}, ${rarity})`,
      image: `ipfs://${imageCid}`,
      attributes: [
        { trait_type: 'Theme', value: THEMES[selectedTheme].name },
        { trait_type: 'Rarity', value: rarity },
        { trait_type: 'Wallet', value: message.slice(-6) }
      ]
    };

    // 8. Upload metadata to Pinata/IPFS (fallback legacy approach)
    const pinataMetaRes = await uploadJsonToPinata(metadata, {
      fileName: `nft-metadata-${Date.now()}.json`,
      apiKey: process.env.PINATA_API_KEY!,
      apiSecret: process.env.PINATA_API_SECRET!,
    });
    const metadataCid = pinataMetaRes.IpfsHash;

    // 9. Return metadata CID for minting (fallback legacy approach)
    return NextResponse.json({
      success: true,
      imageCid,
      metadataCid,
      imageUrl: `ipfs://${imageCid}`,
      metadataUrl: `ipfs://${metadataCid}`,
      walletAddress: message,
      theme: selectedTheme,
      rarity,
      message: 'NFT image and metadata uploaded to IPFS. Ready to mint!'
    });

  } catch (error) {
    console.error('AI Mint Error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'An unknown error occurred';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (error.message.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Request timeout - AI processing took too long';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        statusCode = 401;
        errorMessage = 'Authentication failed - check API keys';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded - please try again later';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error type',
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// Utility to extract DALL-E URL from OpenAI result
function extractDalleUrl(result: unknown): string | null {
  // Implement your parsing logic here based on your OpenAI result structure
  // Example:
  if (typeof result === 'string') {
    const match = result.match(/https:\/\/[^\s'"]+\.png[^\s'"]*/);
    return match ? match[0] : null;
  }
  // If result is an object, adjust accordingly
  return null;
}
