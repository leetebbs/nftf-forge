import { NextRequest, NextResponse } from 'next/server';
import { createViemPublicClient } from '../../../viem/createViemPublicClient';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '../../../const/contractDetails';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    const publicClient = createViemPublicClient();

    console.log('Checking credits for address:', userAddress);

    // Get user's paid token count
    const paidTokenCount = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'getUserPaidTokenCount',
      args: [userAddress as `0x${string}`]
    });

    // Check if user can mint
    const canMint = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'userCanMint',
      args: [userAddress as `0x${string}`]
    });

    // Get mint price for reference
    const mintPrice = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'mintPrice',
      args: []
    });

    return NextResponse.json({
      userAddress,
      paidTokenCount: paidTokenCount.toString(),
      canMint,
      mintPrice: mintPrice.toString(),
      contractAddress: FORGE_PAYMENT_ADDRESS,
      networkName: 'Shape Sepolia',
      chainId: 11011
    });

  } catch (error) {
    console.error('Error checking user credits:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check user credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
