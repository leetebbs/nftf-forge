import  { createViemWalletClient } from "../viem/createViemWalletClient";
import { ToolConfig } from "./allTools";

export const getWalletAddressTool: ToolConfig = {
    definition: {
        function: {
            name: "getWalletAddress",
            description: "Get the AI bot\s wallet address",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },

    handler: async () => {
        const walletClient = createViemWalletClient();
        const addresses = await walletClient.getAddresses();
        return addresses[0];
    }
}