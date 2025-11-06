import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    blobTokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
  });
}
