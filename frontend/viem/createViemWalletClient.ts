import { Address, createWalletClient,  http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { shapeSepolia  } from "viem/chains";

export function createViemWalletClient() {
    const fullRpcUrl = process.env.ALCHEMY_FULL_RPCURL;
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
    
    // Priority: full RPC URL > constructed URL > fallback to public RPC
    const rpcUrl = fullRpcUrl || 
        (alchemyKey ? `https://shape-sepolia.g.alchemy.com/v2/${alchemyKey}` : 
        "https://sepolia-rpc.shape.network");

    const account = privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`);
    return createWalletClient({
        account,
        chain: shapeSepolia,
        transport: http(rpcUrl)
    })
}
