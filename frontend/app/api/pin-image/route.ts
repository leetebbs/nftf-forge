import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: for Vercel Edge Functions, remove if not needed

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    // Download image server-side
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Prepare form data for Pinata
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer]), 'image.jpg');

    // Upload to Pinata
    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: formData
    });

    if (!pinataRes.ok) {
      return NextResponse.json({ error: 'Failed to pin image to IPFS' }, { status: 500 });
    }
    const result = await pinataRes.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to pin image',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
