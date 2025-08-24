import { Address } from 'viem';
import { createViemWalletClient } from '../viem/createViemWalletClient';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '../const/contractDetails';
import { ToolConfig } from './allTools';

interface UseMintingCreditArgs {
  userAddress: string;
}

export const useMintingCreditTool: ToolConfig<UseMintingCreditArgs> = {
  definition: {
    function: {
      name: "useMintingCredit",
      description: "Use one minting credit for a user after successfully minting an NFT. This should be called ONLY after the NFT has been successfully minted to the user.",
      parameters: {
        type: "object",
        properties: {
          userAddress: {
            type: "string",
            description: "The wallet address of the user whose minting credit should be used"
          }
        },
        required: ["userAddress"]
      }
    }
  },
  handler: async ({ userAddress }: UseMintingCreditArgs) => {
    try {
      const walletClient = createViemWalletClient();
      
      if (!walletClient.account) {
        throw new Error('No wallet account available');
      }

      console.log(`Using minting credit for user: ${userAddress}`);

      // Call useMintingCredit function on the ForgePayment contract
      const hash = await walletClient.writeContract({
        address: FORGE_PAYMENT_ADDRESS,
        abi: FORGE_PAYMENT_ABI,
        functionName: 'useMintingCredit',
        args: [userAddress as Address]
      });

      console.log(`Minting credit used. Transaction hash: ${hash}`);

      return {
        success: true,
        transactionHash: hash,
        userAddress,
        message: `Successfully used minting credit for user ${userAddress}. Transaction: ${hash}`
      };
    } catch (error) {
      console.error('Error using minting credit:', error);
      
      // Check if the error is because user has no paid tokens
      if (error instanceof Error && error.message.includes('User has no paid tokens available')) {
        return {
          success: false,
          error: 'USER_NO_CREDITS',
          message: 'User has no minting credits available. They need to pay first.'
        };
      }
      
      // Check if the error is because only AI wallet can call this
      if (error instanceof Error && error.message.includes('Only AI wallet can use minting credits')) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Only the AI wallet can use minting credits'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to use minting credit'
      };
    }
  }
};
