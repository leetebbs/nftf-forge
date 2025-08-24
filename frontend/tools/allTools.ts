
import { generateImageTool } from "./generateImage";
import { getBalanceTool } from "./getBalance";
import { getERC721BalanceTool } from "./getNftBalance";
import { getWalletAddressTool } from "./getWalletAddress";
import { uploadImageAndMetadataToIPFSTool } from "./uploadImageAndMetadataToIPFS";
import {uploadFileToPinata,uploadJsonToPinata} from "./pinataUtils";
export interface ToolConfig<T = any> {
    definition: {
        function: {
            name: string;
            description: string;
            parameters: {
              type: 'object';
              properties: Record<string, unknown>;
              required: string[];  
            }
        }
    }
    handler: (args: T) => Promise<any>;
}

export const tools: Record<string, ToolConfig> =  {
    getERC721Balance: getERC721BalanceTool,
    getBalance: getBalanceTool,
    generateImage: generateImageTool,
    uploadImageAndMetadataToIPFS: uploadImageAndMetadataToIPFSTool,
    getWalletAddress: getWalletAddressTool,
    uploadFileToPinata: {
        definition: {
            function: {
                name: "uploadFileToPinata",
                description: "Uploads a file buffer to Pinata with the given file name and API credentials.",
                parameters: {
                    type: "object",
                    properties: {
                        fileBuffer: { type: "string", description: "The file buffer (as base64 string) to upload." },
                        fileName: { type: "string", description: "The name of the file to be saved on Pinata." },
                        apiKey: { type: "string", description: "Pinata API key." },
                        apiSecret: { type: "string", description: "Pinata API secret." }
                    },
                    required: ["fileBuffer", "fileName", "apiKey", "apiSecret"]
                }
            }
        },
        handler: async ({ fileBuffer, fileName, apiKey, apiSecret }: { fileBuffer: string, fileName: string, apiKey: string, apiSecret: string }) => {
            // Convert base64 string back to Buffer
            const buffer = Buffer.from(fileBuffer, 'base64');
            return uploadFileToPinata(buffer, { fileName, apiKey, apiSecret });
        }
    },
    uploadJsonToPinata: {
        definition: {
            function: {
                name: "uploadJsonToPinata",
                description: "Uploads a JSON object to Pinata with the given file name and API credentials.",
                parameters: {
                    type: "object",
                    properties: {
                        json: { type: "object", description: "The JSON object to upload." },
                        fileName: { type: "string", description: "The name of the file to be saved on Pinata." },
                        apiKey: { type: "string", description: "Pinata API key." },
                        apiSecret: { type: "string", description: "Pinata API secret." }
                    },
                    required: ["json", "fileName", "apiKey", "apiSecret"]
                }
            }
        },
        handler: async ({ json, fileName, apiKey, apiSecret }: { json: any, fileName: string, apiKey: string, apiSecret: string }) => {
            return uploadJsonToPinata(json, { fileName, apiKey, apiSecret });
        }
    }
}
