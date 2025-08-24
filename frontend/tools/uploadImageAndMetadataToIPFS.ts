import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { getContract } from 'viem';
import { ERC721_ABI } from '../const/contractDetails';
import { createViemPublicClient } from '../viem/createViemPublicClient';
import { createViemWalletClient } from '../viem/createViemWalletClient';
import { config } from '../lib/config';
import { ToolConfig } from "./allTools";

interface UploadToIPFSArgs {
    filePath: string; // Can be a file path OR a URL
    name: string;
    description: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
    external_url?: string;
    to: string;
}

interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
    isDuplicate?: boolean;
}

export const uploadImageAndMetadataToIPFSTool: ToolConfig<UploadToIPFSArgs> = {
    definition: {
        function: {
            name: "uploadImageAndMetadataToIPFS",
            description: "Upload an image file and its metadata to IPFS using Pinata service and mint EXACTLY ONE NFT. This function should only be called ONCE per user request.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { 
                        type: "string", 
                        description: "Path to the image file to upload OR a direct URL to an image (DALL-E URL)" 
                    },
                    name: { 
                        type: "string", 
                        description: "Name of the NFT" 
                    },
                    description: { 
                        type: "string", 
                        description: "Description of the NFT" 
                    },
                    attributes: {
                        type: "array",
                        description: "Optional array of trait attributes for the NFT",
                        items: {
                            type: "object",
                            properties: {
                                trait_type: { type: "string" },
                                value: { type: ["string", "number"] }
                            }
                        }
                    },
                    external_url: {
                        type: "string",
                        description: "Optional URL to view the NFT in an external site"
                    },
                    to: {
                        type: 'string',
                        description: 'The wallet address to mint the NFT to'
                    }
                },
                required: ["filePath", "name", "description", "to"]
            }
        }
    },
    handler: async ({ filePath, name, description, attributes = [], external_url, to }) => {
        try {
            console.log("Uploading image to IPFS...");
            console.log("filePath:", filePath);
            console.log("name:", name);
            console.log("description:", description);

            // Get Pinata API keys from environment variables
            const apiKey = process.env.PINATA_API_KEY;
            const apiSecret = process.env.PINATA_API_SECRET;

            if (!apiKey || !apiSecret) {
                throw new Error('Pinata API keys not found in environment variables');
            }

            let ipfsData;

            // Check if filePath is a URL or a local file path
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
                // Use the new serverless function to pin the image URL to IPFS
                const apiBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                const pinImageUrl = `${apiBase}/api/pin-image`;
                console.log('Pinning remote image via', pinImageUrl, filePath);
                const pinImageRes = await axios.post(pinImageUrl, { imageUrl: filePath });
                if (!pinImageRes.data || !pinImageRes.data.IpfsHash) {
                    throw new Error('Failed to pin image to IPFS via /api/pin-image');
                }
                ipfsData = {
                    hash: pinImageRes.data.IpfsHash,
                    ipfsUrl: `https://gateway.pinata.cloud/ipfs/${pinImageRes.data.IpfsHash}`
                };
            } else {
                console.log('Uploading from local file:', filePath);
                // Handle file path upload
                const fullPath = path.resolve(filePath);

                // Check if file exists
                if (!fs.existsSync(fullPath)) {
                    throw new Error(`File not found at path: ${fullPath}`);
                }

                const fileName = path.basename(fullPath);
                const fileMetadata = {
                    name: fileName,
                    keyvalues: {
                        description: description || `Uploaded via IPFS upload tool`,
                        timestamp: new Date().toISOString()
                    }
                };

                ipfsData = await uploadToPinata(fullPath, fileName, fileMetadata, apiKey, apiSecret);
            }

            // Ensure the image starts with the correct URL format
            const imageUrl = ipfsData.ipfsUrl.startsWith('ipfs://') ? ipfsData.ipfsUrl : ipfsData.ipfsUrl;

            console.log(`Creating NFT metadata for: ${name}`);
            console.log(`Using image URL: ${imageUrl}`);

            // Create metadata JSON object
            const metadata = {
                name,
                description,
                image: imageUrl, // This will be either the DALL-E URL or ipfs:// URL
                attributes: attributes || [],
                ...(external_url && { external_url })
            };

            console.log(`Creating NFT metadata for: ${name}`);
            console.log(`Using image URL: ${imageUrl}`);

            // Create metadata for Pinata upload (no temporary file needed)
            const metadataFileName = `${name}-metadata`;
            const metadataFileMetadata = {
                name: metadataFileName,
                keyvalues: {
                    type: "NFT-metadata",
                    timestamp: new Date().toISOString()
                }
            };

            // Upload metadata to Pinata directly without creating temporary files
            const metadataIpfsData = await uploadJsonToPinata(metadata, metadataFileName, metadataFileMetadata, apiKey, apiSecret);

            // Calculate URLs after metadata upload
            const imageGatewayUrl = ipfsData.ipfsUrl.startsWith('http') ? ipfsData.ipfsUrl : `https://gateway.pinata.cloud/ipfs/${ipfsData.hash}`;
            const metadataGatewayUrl = `https://gateway.pinata.cloud/ipfs/${metadataIpfsData.hash}`;

            console.log('IPFS upload completed successfully');
            console.log('Image Gateway URL:', imageGatewayUrl);
            console.log('Metadata Gateway URL:', metadataGatewayUrl);
            
            // Mint NFT - ONLY ONCE PER CALL
            console.log("=== STARTING NFT MINTING PROCESS ===");
            const mintResult = await mint(to, metadataIpfsData.ipfsUrl);
            console.log("=== NFT MINTING COMPLETED ===");

            return {
                success: true,
                message: `Image and metadata uploaded successfully to IPFS and NFT minted`,
                imageIpfsHash: ipfsData.hash,
                imageIpfsUrl: ipfsData.ipfsUrl,
                imageGatewayUrl: imageGatewayUrl,
                metadataIpfsHash: metadataIpfsData.hash,
                metadataIpfsUrl: metadataIpfsData.ipfsUrl,
                metadataGatewayUrl: metadataGatewayUrl,
                mintResult: mintResult,
                recipient: to,
                contractAddress: config.contractAddress,
                originalImageUrl: filePath.startsWith('http') ? filePath : null,
                // Include complete details for frontend parsing
                fullDalleUrl: filePath.startsWith('http') ? filePath : null,
                transactionHash: mintResult.transactionHash,
                blockNumber: mintResult.blockNumber?.toString(),
                // Signal that this is complete and should terminate assistant processing
                nftMintingComplete: true
            };

        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw error;
        }
    }
}

export async function mint(to: string, metadataIpfsUrl: string) {
    console.log("=== MINTING SINGLE NFT ===");
    console.log("Address to mint to:", to);
    console.log("Metadata IPFS URL:", metadataIpfsUrl);
    
    const publicClient = createViemPublicClient();
    const walletClient = createViemWalletClient();

    const contractAddress = config.contractAddress;

    try {
        console.log("Initiating single NFT mint transaction...");
        
        const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: ERC721_ABI,
            functionName: 'safeMint',
            args: [to, metadataIpfsUrl]
        });
        
        console.log("Transaction hash:", hash);
        console.log("Waiting for transaction receipt...");
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash: hash });
        
        console.log("=== NFT MINTED SUCCESSFULLY ===");
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed);
        console.log("Status:", receipt.status);

        return {
            success: true,
            transactionHash: hash,
            blockNumber: receipt.blockNumber,
            recipient: to,
            message: `Single NFT minted successfully to: ${to}`
        };
        
    } catch (error) {
        console.error("=== MINTING FAILED ===");
        console.error("Error:", error);
        throw new Error(`Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Uploads a file to Pinata IPFS
 * @param filePath - Path to the file to upload
 * @param fileName - Name to use for the file
 * @param metadata - Metadata to attach to the file
 * @param apiKey - Pinata API key
 * @param apiSecret - Pinata API secret
 * @returns A promise that resolves with the IPFS hash and ipfs:// URL
 */
async function uploadToPinata(
    filePath: string, 
    fileName: string, 
    metadata: any, 
    apiKey: string, 
    apiSecret: string
): Promise<{hash: string, ipfsUrl: string}> {
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    
    // Create form data
    const formData = new FormData();
    
    // Add file to form
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, {
        filename: fileName
    });
    
    // Add metadata
    const pinataMetadata = JSON.stringify({
        name: metadata.name,
        keyvalues: metadata.keyvalues
    });
    formData.append('pinataMetadata', pinataMetadata);
    
    // Add options
    const pinataOptions = JSON.stringify({
        cidVersion: 1
    });
    formData.append('pinataOptions', pinataOptions);
    
    try {
        // Make request to Pinata
        const response = await axios.post<PinataResponse>(url, formData, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'pinata_api_key': apiKey,
                'pinata_secret_api_key': apiSecret
            }
        });

        console.log('Pinata upload successful:', response.data);
        const hash = response.data.IpfsHash;
        const ipfsUrl = `ipfs://${hash}`;
        
        return {
            hash,
            ipfsUrl
        };
    } catch (error: any) {
        console.error('Error uploading to Pinata:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('Response:', error.response.data);
        }
        throw new Error(`Failed to upload to Pinata: ${error.message}`);
    }
}

/**
 * Uploads an image from a URL to Pinata IPFS using Pinata's URL pinning service
 * @param imageUrl - URL of the image to upload
 * @param name - Name to use for the file
 * @param apiKey - Pinata API key
 * @param apiSecret - Pinata API secret
 * @returns A promise that resolves with the IPFS hash and ipfs:// URL
 */
async function uploadURLToPinata(
    imageUrl: string,
    name: string,
    apiKey: string,
    apiSecret: string
): Promise<{hash: string, ipfsUrl: string}> {
    const url = 'https://api.pinata.cloud/pinning/pinByHash';
    
    try {
        console.log('Full image URL:', imageUrl);
        console.log('Image URL length:', imageUrl.length);
        
        // Validate URL format
        try {
            new URL(imageUrl);
        } catch (urlError) {
            throw new Error(`Invalid URL format: ${imageUrl}`);
        }
        
        // Use Pinata's pin by URL service instead of downloading
        const pinByUrlEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
        
        const requestData = {
            pinataOptions: {
                cidVersion: 1
            },
            pinataMetadata: {
                name: `${name.replace(/\s+/g, '-').toLowerCase()}.png`,
                keyvalues: {
                    description: `AI-generated NFT image: ${name}`,
                    timestamp: new Date().toISOString(),
                    originalUrl: imageUrl,
                    type: "dalle-image"
                }
            }
        };

        // For URL uploads, we need to use a different approach
        // Let's try using pin by URL if available, otherwise use a workaround
        
        // First, let's try the alternative: pin JSON with the URL reference
        const jsonPinEndpoint = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
        
        const imageReference = {
            name: name,
            description: `AI-generated NFT image: ${name}`,
            image_url: imageUrl,
            timestamp: new Date().toISOString(),
            type: "dalle-url-reference"
        };

        const jsonResponse = await axios.post(jsonPinEndpoint, {
            pinataContent: imageReference,
            pinataOptions: {
                cidVersion: 1
            },
            pinataMetadata: {
                name: `${name.replace(/\s+/g, '-').toLowerCase()}-url-ref`,
                keyvalues: {
                    description: `URL reference for AI-generated NFT image: ${name}`,
                    timestamp: new Date().toISOString(),
                    type: "url-reference"
                }
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'pinata_api_key': apiKey,
                'pinata_secret_api_key': apiSecret
            }
        });

        console.log('Pinata URL reference upload successful:', jsonResponse.data);
        const hash = jsonResponse.data.IpfsHash;
        const ipfsUrl = `ipfs://${hash}`;
        
        return {
            hash,
            ipfsUrl
        };
    } catch (error: any) {
        console.error('Error uploading URL to Pinata:');
        console.error('Image URL:', imageUrl);
        console.error('Error details:', error.message);
        if (axios.isAxiosError(error)) {
            console.error('Axios error code:', error.code);
            console.error('Axios error response:', error.response?.data);
            console.error('Axios error status:', error.response?.status);
        }
        throw new Error(`Failed to upload URL to Pinata: ${error.message}`);
    }
}

/**
 * Uploads JSON data directly to Pinata IPFS without creating temporary files
 * @param jsonData - The JSON object to upload
 * @param fileName - Name to use for the file
 * @param metadata - Metadata to attach to the file
 * @param apiKey - Pinata API key
 * @param apiSecret - Pinata API secret
 * @returns A promise that resolves with the IPFS hash and ipfs:// URL
 */
async function uploadJsonToPinata(
    jsonData: any,
    fileName: string,
    metadata: any,
    apiKey: string,
    apiSecret: string
): Promise<{hash: string, ipfsUrl: string}> {
    try {
        const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
        
        const requestData = {
            pinataContent: jsonData,
            pinataOptions: {
                cidVersion: 1
            },
            pinataMetadata: {
                name: fileName,
                keyvalues: metadata.keyvalues || {}
            }
        };

        console.log('Uploading JSON to Pinata IPFS...');
        console.log('Request data:', JSON.stringify(requestData, null, 2));

        const response = await axios.post(url, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'pinata_api_key': apiKey,
                'pinata_secret_api_key': apiSecret
            }
        });

        console.log('Pinata JSON upload successful:', response.data);
        const hash = response.data.IpfsHash;
        const ipfsUrl = `ipfs://${hash}`;
        
        return {
            hash,
            ipfsUrl
        };
    } catch (error: any) {
        console.error('Error uploading JSON to Pinata:', error);
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.response?.data);
            console.error('Axios error status:', error.response?.status);
        }
        throw new Error(`Failed to upload JSON to Pinata: ${error.message}`);
    }
}