import { NextResponse } from 'next/server';
import { createViemPublicClient } from '../../../viem/createViemPublicClient';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '../../../const/contractDetails';

export async function GET() {
  try {
    const publicClient = createViemPublicClient();

    // Get mint price from contract
    const mintPrice = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'mintPrice',
      args: []
    });

    return NextResponse.json({
      mintPrice: mintPrice.toString(),
      mintPriceETH: Number(mintPrice) / 1e18,
      contractAddress: FORGE_PAYMENT_ADDRESS,
      networkName: 'Shape Sepolia',
      chainId: 11011
    });

  } catch (error) {
    console.error('Error getting mint price:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get mint price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
