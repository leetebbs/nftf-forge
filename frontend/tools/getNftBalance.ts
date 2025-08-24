import { Address } from "viem";
import { createViemPublicClient } from "../viem/createViemPublicClient";
import { ToolConfig } from "./allTools";

interface GetERC721BalanceArgs {
    contractAddress: Address;
    wallet: Address;
}

export const getERC721BalanceTool: ToolConfig<GetERC721BalanceArgs> = {
    definition: {
        function: {
            name: "getERC721Balance",
            description: "Get the balance of ERC-721 tokens for a user in a specific contract",
            parameters: {
                type: "object",
                properties: {
                    contractAddress: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        description: "The ERC-721 contract address to check the balance of"
                    },
                    wallet: {
                        type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        description: "The wallet address to get the ERC-721 balance of"
                    }
                },
                required: ["contractAddress", "wallet"]
            }
        }
    },
    handler: async ({ contractAddress, wallet }) => {
        const client = createViemPublicClient();
        const balance: any = await client.readContract({
            address: contractAddress,
            abi: [
                {
                    constant: true,
                    inputs: [{ name: "_owner", type: "address" }],
                    name: "balanceOf",
                    outputs: [{ name: "balance", type: "uint256" }],
                    type: "function"
                }
            ],
            functionName: "balanceOf",
            args: [wallet]
        });
        return balance.toString();
    }
}
