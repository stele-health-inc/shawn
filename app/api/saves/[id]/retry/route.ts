import { after } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { processSave } from "@/lib/process";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthorized(req))) return unauthorized();
  const { id } = await params;
  after(() => processSave(id));
  return Response.json({ ok: true }, { status: 202 });
}
