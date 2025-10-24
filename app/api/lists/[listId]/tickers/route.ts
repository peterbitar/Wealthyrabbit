import { NextRequest, NextResponse } from "next/server";
import { listService } from "@/lib/lists";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params;
  const body = await request.json();
  const { symbol } = body;

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  const ticker = await listService.addTicker(listId, symbol);
  if (!ticker) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json(ticker, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params;
  const { searchParams } = new URL(request.url);
  const tickerId = searchParams.get("tickerId");

  if (!tickerId) {
    return NextResponse.json(
      { error: "Ticker ID is required" },
      { status: 400 }
    );
  }

  const success = await listService.removeTicker(listId, tickerId);
  if (!success) {
    return NextResponse.json(
      { error: "List or ticker not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
