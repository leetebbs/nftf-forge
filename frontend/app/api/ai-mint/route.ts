import { NextRequest, NextResponse } from 'next/server';
import { shapes } from '../../../shapes';
import { uploadFileToPinata, uploadJsonToPinata } from '../../../tools/pinataUtils';


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

    // 2. Generate image with OpenAI (DALL-E) directly
    // (Assume you have a function to generate the image and get the DALL-E URL)
    // For this refactor, let's assume generateImage returns the DALL-E URL
  const { generateImage } = await import('../../../tools/generateImage');
  const dalleUrl: string = await generateImage(finalPrompt);

    if (!dalleUrl) {
      return NextResponse.json(
        { error: 'Failed to generate DALL-E image URL.' },
        { status: 500 }
      );
    }

    // 3. Download image from DALL-E URL
    const imageRes = await fetch(dalleUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: 'Failed to download image from DALL-E URL.' },
        { status: 500 }
      );
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // 4. Upload image to Pinata/IPFS
    const pinataImageRes = await uploadFileToPinata(imageBuffer, {
      fileName: `nft-image-${Date.now()}.png`,
      apiKey: process.env.PINATA_API_KEY!,
      apiSecret: process.env.PINATA_API_SECRET!,
    });
    const imageCid = pinataImageRes.IpfsHash;

    // 5. Create metadata with ipfs:// CID
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

    // 6. Upload metadata to Pinata/IPFS
const pinataMetaRes = await uploadJsonToPinata(metadata, {
  fileName: `nft-metadata-${Date.now()}.json`,
  apiKey: process.env.PINATA_API_KEY!,
  apiSecret: process.env.PINATA_API_SECRET!,
});
const metadataCid = pinataMetaRes.IpfsHash;

// 7. Mint the NFT using the metadata IPFS URL
const { mint } = await import('../../../tools/uploadImageAndMetadataToIPFS');
let mintResult;
try {
  mintResult = await mint(message, `ipfs://${metadataCid}`);
} catch (err) {
  console.error('Minting failed:', err);
  if (err instanceof Error && err.stack) {
    console.error('Minting error stack:', err.stack);
  }
  return NextResponse.json({
    success: false,
    error: 'Minting failed',
    details: err instanceof Error ? err.message : err,
    errorStack: err instanceof Error && err.stack ? err.stack : undefined,
    imageCid,
    metadataCid,
    imageUrl: `ipfs://${imageCid}`,
    metadataUrl: `ipfs://${metadataCid}`,
    walletAddress: message,
    theme: selectedTheme,
    rarity
  }, { status: 500 });
}

    // Convert BigInt values to strings for JSON serialization
    const safeMintResult = {
      ...mintResult,
      blockNumber: mintResult.blockNumber ? mintResult.blockNumber.toString() : undefined
    };
    return NextResponse.json({
      success: true,
      imageCid,
      metadataCid,
      imageUrl: `ipfs://${imageCid}`,
      metadataUrl: `ipfs://${metadataCid}`,
      walletAddress: message,
      theme: selectedTheme,
      rarity,
      transactionHash: safeMintResult.transactionHash,
      blockNumber: safeMintResult.blockNumber,
      message: 'NFT image and metadata uploaded to IPFS and NFT minted!'
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


