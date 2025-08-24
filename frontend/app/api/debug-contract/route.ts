import { NextResponse } from 'next/server';
import { createViemPublicClient } from '../../../viem/createViemPublicClient';
import { FORGE_PAYMENT_ABI, FORGE_PAYMENT_ADDRESS } from '../../../const/contractDetails';

export async function GET() {
  try {
    console.log('Testing contract connection...');
    
    const publicClient = createViemPublicClient();
    console.log('Public client created');
    
    // Test basic connection
    const chainId = await publicClient.getChainId();
    console.log('Chain ID:', chainId);
    
    // Test contract reading
    console.log('Reading mint price from contract:', FORGE_PAYMENT_ADDRESS);
    const mintPrice = await publicClient.readContract({
      address: FORGE_PAYMENT_ADDRESS,
      abi: FORGE_PAYMENT_ABI,
      functionName: 'mintPrice',
      args: []
    });
    console.log('Mint price read successfully:', mintPrice.toString());

    // Test getting block number
    const blockNumber = await publicClient.getBlockNumber();
    console.log('Current block number:', blockNumber);

    return NextResponse.json({
      success: true,
      chainId,
      mintPrice: mintPrice.toString(),
      mintPriceETH: Number(mintPrice) / 1e18,
      contractAddress: FORGE_PAYMENT_ADDRESS,
      blockNumber: blockNumber.toString(),
      rpcEndpoint: 'Working'
    });

  } catch (error) {
    console.error('Contract debug error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        contractAddress: FORGE_PAYMENT_ADDRESS
      },
      { status: 500 }
    );
  }
}
