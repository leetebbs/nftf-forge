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

    console.log('Force refreshing contract data for address:', userAddress);
    console.log('Contract address:', FORGE_PAYMENT_ADDRESS);
    console.log('Using RPC:', publicClient.transport);

    // Get latest block to ensure we're reading fresh data
    const latestBlock = await publicClient.getBlockNumber();
    console.log('Latest block:', latestBlock);

    // Get user's paid token count with latest block
    const paidTokenCount = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'getUserPaidTokenCount',
      args: [userAddress as `0x${string}`],
      blockNumber: latestBlock
    });

    // Check if user can mint with latest block
    const canMint = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'userCanMint',
      args: [userAddress as `0x${string}`],
      blockNumber: latestBlock
    });

    // Get mint price for reference
    const mintPrice = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'mintPrice',
      args: [],
      blockNumber: latestBlock
    });

    return NextResponse.json({
      userAddress,
      paidTokenCount: paidTokenCount.toString(),
      canMint,
      mintPrice: mintPrice.toString(),
      contractAddress: FORGE_PAYMENT_ADDRESS,
      latestBlock: latestBlock.toString(),
      networkName: 'Shape Sepolia',
      chainId: 11011,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error force refreshing contract data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh contract data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
