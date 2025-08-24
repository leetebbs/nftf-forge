import fs from "fs";
import * as http from 'http';
import { IncomingMessage } from 'http';
import * as https from 'https';
import OpenAI from "openai";
import path from "path";
import { ToolConfig } from "./allTools";

interface GenerateImageArgs {
    prompt: string;
}


export const generateImageTool: ToolConfig<GenerateImageArgs> = {
    definition: {
        function: {
            name: "generateImage",
            description: "Generate an image based on a prompt and save it",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "The prompt to generate the image" }
                },
                required: ["prompt"]
            }
        }
    },
    handler: async ({ prompt }) => {
        return generateImage(prompt);
    }
}

// Standalone function for API use
export async function generateImage(prompt: string): Promise<string> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const response = await client.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            size: "1024x1024",
            quality: "standard",
            n: 1,
        });
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            throw new Error('Image response data is undefined or empty');
        }
        const url = response.data[0].url;
        if (!url) {
            throw new Error('Image URL is undefined');
        }
        console.log("Generated image URL:", url);
        return url;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

/**
 * Downloads an image from a URL and saves it to a specified file path
 * @param url - The URL of the image to download
 * @param filePath - The file path where the image should be saved
 * @returns A promise that resolves with the file path when the download is complete
 */
async function saveImage(url: string, filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Determine if we need http or https
        const requester = url.startsWith('https') ? https : http;
        
        const request = requester.get(url, (response: IncomingMessage) => {
            // Check if response is successful
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }
    
            // Create a write stream to the file
            const fileStream = fs.createWriteStream(filePath);
            
            // Pipe the image data to the file
            response.pipe(fileStream);
            
            // Handle events
            fileStream.on('finish', () => {
                fileStream.close();
                resolve(filePath);
            });
            
            fileStream.on('error', (err: Error) => {
                // Clean up the file if there was an error
                fs.unlink(filePath, () => {});
                reject(err);
            });
        });
        
        request.on('error', (err: Error) => {
            reject(err);
        });
    });
}

/**
 * Downloads an image from a URL and saves it to the tempImage folder in the project root
 * @param imageUrl - The URL of the image to download
 * @returns A promise that resolves with the path to the saved file
 */
async function saveImageToProjectFolder(imageUrl: string): Promise<string> {
    try {
        // Create absolute path to the project root by finding the directory where the script is running
        const projectRoot = process.cwd();
        console.log('Project root:', projectRoot);
        // Create a 'tempImage' directory in the project root if it doesn't exist
        const tempImageDir = path.join(projectRoot, 'tempImage');
        if (!fs.existsSync(tempImageDir)) {
            fs.mkdirSync(tempImageDir);
        }
        
        // Use a fixed filename to overwrite any existing image
        const filename = 'alchemyNFT.jpg';
        const filePath = path.join(tempImageDir, filename);
        
        // Download the image
        const savedPath = await saveImage(imageUrl, filePath);
        
        console.log(`Image downloaded to: ${savedPath}`);
        console.log('Image URL:', imageUrl);
        console.log('File Path:', filePath);
        console.log('Filename:', filename);
        return filePath;
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}