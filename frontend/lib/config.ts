export const config = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  alchemyKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY as string,
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
  // NFT Forge contract address on Shape Sepolia
  contractAddress: "0x158d4964fa28f9e72ccccb9a6cd6699f2982be01" as `0x${string}`,
} as const;
