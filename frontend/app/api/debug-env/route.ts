import { NextResponse } from 'next/server';

export async function GET() {
  const env = {
    NEXT_PUBLIC_ALCHEMY_KEY: process.env.NEXT_PUBLIC_ALCHEMY_KEY ? 'Set' : 'Not set',
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ? 'Set' : 'Not set',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    ALCHEMY_FULL_RPCURL: process.env.ALCHEMY_FULL_RPCURL ? 'Set' : 'Not set',
    PRIVATE_KEY: process.env.PRIVATE_KEY ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({
    environment: env,
    contractAddress: '0x0f8b14c7a8f9ac940c75fd764fa7fd61c1db60c4',
    expectedChainId: 11011
  });
}
