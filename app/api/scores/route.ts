import { NextRequest, NextResponse } from "next/server";

const LEAGUES = ["bra.1", "bra.copa_do_brasil", "conmebol.libertadores", "eng.1", "uefa.champions"];
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "bra.1";
  const dates = req.nextUrl.searchParams.get("dates");
  if (!LEAGUES.includes(league)) return NextResponse.json({ error: "Liga inválida" }, { status: 400 });
  if (dates && !/^\d{8}$/.test(dates)) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  try {
    const res = await fetch(`${BASE}/${league}/scoreboard${dates ? `?dates=${dates}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os jogos" }, { status: 502 });
  }
}
