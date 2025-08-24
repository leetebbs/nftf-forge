import { Address, formatEther } from "viem";
import { createViemPublicClient } from "../viem/createViemPublicClient";
import { ToolConfig } from "./allTools";

interface GetBalanceArgs {
    wallet: Address;
}

export const getBalanceTool: ToolConfig<GetBalanceArgs> = {
    definition: {
        function: {
            name: "getBalance",
            description: "Get the balance of a wallet",
            parameters: {
                type: "object",
                properties: {
                    wallet: { type: "string",
                        pattern: "^0x[a-fA-F0-9]{40}$",
                        description: "The wallet address to get the balance of"
                     }
                },
                required: ["wallet"]
            }
        }
    },
    handler: async ({ wallet }) => {
        const client = createViemPublicClient();
        const balance = await client.getBalance({ address: wallet });
        return formatEther(balance);
    }
}