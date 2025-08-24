import { NextRequest, NextResponse } from 'next/server';
import { createViemPublicClient } from '../../../viem/createViemPublicClient';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '../../../const/contractDetails';
import { Address } from 'viem';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const publicClient = createViemPublicClient();

    // Check if user can mint
    const canMint = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'userCanMint',
      args: [userAddress as Address]
    });

    // Get paid token count
    const paidTokenCount = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'getUserPaidTokenCount',
      args: [userAddress as Address]
    });

    // Get mint price
    const mintPrice = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'mintPrice',
      args: []
    });

    return NextResponse.json({
      userAddress,
      canMint,
      paidTokenCount: Number(paidTokenCount),
      mintPrice: mintPrice.toString(),
      mintPriceETH: Number(mintPrice) / 1e18,
      contractAddress: FORGE_PAYMENT_ADDRESS
    });

  } catch (error) {
    console.error('Payment check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check payment status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
