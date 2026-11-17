import { NextRequest, NextResponse } from "next/server";

const LEAGUES = ["bra.1", "bra.copa_do_brasil", "conmebol.libertadores", "eng.1", "uefa.champions"];
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const event = req.nextUrl.searchParams.get("event") ?? "";
  if (!LEAGUES.includes(league) || !/^\d+$/.test(event)) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  try {
    const res = await fetch(`${BASE}/${league}/summary?event=${event}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a partida" }, { status: 502 });
  }
}
