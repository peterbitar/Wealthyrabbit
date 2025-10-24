import { NextRequest, NextResponse } from "next/server";
import { listService, ListType } from "@/lib/lists";

export async function GET() {
  const lists = await listService.getLists();
  return NextResponse.json(lists);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Name and type are required" },
      { status: 400 }
    );
  }

  const newList = await listService.createList(name, type as ListType);
  return NextResponse.json(newList, { status: 201 });
}
