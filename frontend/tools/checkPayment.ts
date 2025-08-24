import { Address } from 'viem';
import { createViemPublicClient } from '../viem/createViemPublicClient';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '../const/contractDetails';
import { ToolConfig } from './allTools';

interface CheckPaymentArgs {
  userAddress: string;
}

export const checkPaymentTool: ToolConfig<CheckPaymentArgs> = {
  definition: {
    function: {
      name: "checkPayment",
      description: "Check if a user has paid for minting by looking at their paid token count in the ForgePayment contract",
      parameters: {
        type: "object",
        properties: {
          userAddress: {
            type: "string",
            description: "The wallet address of the user to check payment status for"
          }
        },
        required: ["userAddress"]
      }
    }
  },
  handler: async ({ userAddress }: CheckPaymentArgs) => {
    try {
      const publicClient = createViemPublicClient();
      
      // Check if user can mint (has paid tokens available)
      const canMint = await publicClient.readContract({
        address: FORGE_PAYMENT_ADDRESS,
        abi: FORGE_PAYMENT_ABI,
        functionName: 'userCanMint',
        args: [userAddress as Address]
      });

      // Get the exact count of paid tokens
      const paidTokenCount = await publicClient.readContract({
        address: FORGE_PAYMENT_ADDRESS,
        abi: FORGE_PAYMENT_ABI,
        functionName: 'getUserPaidTokenCount',
        args: [userAddress as Address]
      });

      // Get current mint price for reference
      const mintPrice = await publicClient.readContract({
        address: FORGE_PAYMENT_ADDRESS,
        abi: FORGE_PAYMENT_ABI,
        functionName: 'mintPrice',
        args: []
      });

      return {
        success: true,
        userAddress,
        canMint,
        paidTokenCount: Number(paidTokenCount),
        mintPrice: mintPrice.toString(),
        message: canMint 
          ? `User has ${paidTokenCount} paid tokens available for minting`
          : `User has no paid tokens available. They need to pay ${mintPrice} wei (0.01 ETH) to mint`
      };
    } catch (error) {
      console.error('Error checking payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to check payment status'
      };
    }
  }
};
