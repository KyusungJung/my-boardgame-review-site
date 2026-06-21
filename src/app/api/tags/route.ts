import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } });
    return NextResponse.json(tags.map((tag) => tag.name));
  } catch {
    return NextResponse.json({ message: "태그를 불러오지 못했습니다." }, { status: 503 });
  }
}
