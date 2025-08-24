import { createPublicClient, http } from "viem";
import { shapeSepolia } from "viem/chains";

export function createViemPublicClient() {
    const fullRpcUrl = process.env.ALCHEMY_FULL_RPCURL;
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
    
    // Priority: full RPC URL > constructed URL > fallback to public RPC
    const rpcUrl = fullRpcUrl || 
        (alchemyKey ? `https://shape-sepolia.g.alchemy.com/v2/${alchemyKey}` : 
        "https://sepolia-rpc.shape.network");

    return createPublicClient({
        chain: shapeSepolia,
        transport: http(rpcUrl)
    })
}
