"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const LEAGUES = [
  { id: "bra.1", name: "Brasileirão" },
  { id: "bra.copa_do_brasil", name: "Copa do Brasil" },
  { id: "conmebol.libertadores", name: "Libertadores" },
  { id: "eng.1", name: "Premier League" },
  { id: "uefa.champions", name: "Champions League" },
];

type Team = { name: string; logo?: string; score: string };
type Match = { id: string; date: string; state: "pre" | "in" | "post"; detail: string; clock: string; home: Team; away: Team };

const toYMD = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function parseMatches(data: any): Match[] {
  return (data?.events ?? []).map((e: any) => {
    const c = e.competitions?.[0];
    const side = (k: string): Team => {
      const t = c?.competitors?.find((x: any) => x.homeAway === k);
      return { name: t?.team?.displayName ?? "—", logo: t?.team?.logo, score: t?.score ?? "0" };
    };
    return {
      id: e.id, date: e.date, state: e.status?.type?.state ?? "pre",
      detail: e.status?.type?.shortDetail ?? "", clock: e.status?.displayClock ?? "",
      home: side("home"), away: side("away"),
    };
  }).sort((a: Match, b: Match) => +new Date(a.date) - +new Date(b.date));
}

function Crest({ src, name }: { src?: string; name: string }) {
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={name} className="h-6 w-6 object-contain" loading="lazy" />
    : <div className="h-6 w-6 rounded-full bg-line" />;
}

function MatchRow({ m, onOpen }: { m: Match; onOpen: () => void }) {
  const live = m.state === "in", pre = m.state === "pre";
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left active:bg-line/50">
      <div className="w-12 shrink-0 text-center text-xs">
        {live ? (
          <span className="flex flex-col items-center gap-0.5 font-semibold text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />{m.clock}
          </span>
        ) : pre ? <span className="text-mute">{hora(m.date)}</span> : <span className="text-mute">Fim</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {[m.home, m.away].map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Crest src={t.logo} name={t.name} />
            <span className="truncate text-sm">{t.name}</span>
          </div>
        ))}
      </div>
      {!pre && (
        <div className={`space-y-1.5 text-right text-sm font-semibold tabular-nums ${live ? "text-live" : ""}`}>
          <div>{m.home.score}</div><div>{m.away.score}</div>
        </div>
      )}
    </button>
  );
}

function Section({ title, items, onOpen, live }: { title: string; items: Match[]; onOpen: (m: Match) => void; live?: boolean }) {
  if (!items.length) return null;
  return (
    <section className={`mb-4 overflow-hidden rounded-xl bg-card ${live ? "ring-1 ring-live/50" : ""}`}>
      <h2 className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${live ? "text-live" : "text-mute"}`}>
        {live && <span className="h-2 w-2 animate-pulse rounded-full bg-live" />}{title} ({items.length})
      </h2>
      {items.map((m) => <MatchRow key={m.id} m={m} onOpen={() => onOpen(m)} />)}
    </section>
  );
}

function Detail({ league, match, onClose }: { league: string; match: Match; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/summary?league=${league}&event=${match.id}`)
        .then((r) => r.json())
        .then((d) => { if (!alive) return; d.error ? setErr(d.error) : (setData(d), setErr("")); })
        .catch(() => alive && setErr("Sem conexão"));
    load();
    const t = match.state === "in" ? setInterval(load, 30000) : undefined;
    return () => { alive = false; if (t) clearInterval(t); };
  }, [league, match.id, match.state]);

  const homeId = data?.header?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "home")?.team?.id;
  const events = (data?.keyEvents ?? []).filter((k: any) => /goal|card|penalty/i.test(k.type?.text ?? k.type?.type ?? ""));
  const teams = data?.boxscore?.teams ?? [];
  const home = teams.find((t: any) => t.team?.id === homeId) ?? teams[0];
  const away = teams.find((t: any) => t !== home);
  const val = (t: any, n: string) => t?.statistics?.find((s: any) => s.name === n)?.displayValue ?? "0";
  const STATS = [
    ["Posse de bola (%)", "possessionPct"], ["Chutes", "totalShots"], ["Chutes no gol", "shotsOnTarget"],
    ["Escanteios", "wonCorners"], ["Faltas", "foulsCommitted"], ["Cartões amarelos", "yellowCards"],
  ];
  const icon = (t: string) => (/red/i.test(t) ? "🟥" : /yellow|card/i.test(t) ? "🟨" : "⚽");

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-bg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-bg px-4 py-3">
          <span className="text-sm text-mute">{match.state === "in" ? `Ao vivo · ${match.clock}` : match.detail}</span>
          <button onClick={onClose} className="rounded-full bg-card px-3 py-1 text-sm">Fechar</button>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6 text-center">
          {[match.home, match.away].map((t, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 ${i ? "order-3" : ""}`}>
              <div className="h-14 w-14"><Crest src={t.logo} name={t.name} /></div>
              <span className="text-sm">{t.name}</span>
            </div>
          ))}
          <div className="order-2 text-3xl font-bold tabular-nums">
            {match.state === "pre" ? hora(match.date) : `${match.home.score} - ${match.away.score}`}
          </div>
        </div>
        {err && <p className="px-4 pb-6 text-center text-sm text-live">{err}</p>}
        {!data && !err && <p className="px-4 pb-6 text-center text-sm text-mute">Carregando…</p>}
        {data && (
          <div className="space-y-5 px-4 pb-8">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-mute">Lances</h3>
              {events.length === 0 && <p className="text-sm text-mute">Nenhum gol ou cartão até agora.</p>}
              {events.map((k: any, i: number) => (
                <div key={i} className="flex gap-3 border-b border-line py-2 text-sm">
                  <span className="w-10 shrink-0 text-mute">{k.clock?.displayValue}</span>
                  <span>{icon(k.type?.text ?? "")}</span>
                  <span>{k.shortText ?? k.text}</span>
                </div>
              ))}
            </div>
            {home && away && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-mute">Estatísticas</h3>
                {STATS.map(([label, key]) => {
                  const h = parseFloat(val(home, key)) || 0, a = parseFloat(val(away, key)) || 0;
                  const pct = h + a ? (h / (h + a)) * 100 : 50;
                  return (
                    <div key={key} className="mb-3">
                      <div className="mb-1 flex justify-between text-sm tabular-nums">
                        <span>{val(home, key)}</span><span className="text-mute">{label}</span><span>{val(away, key)}</span>
                      </div>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const [league, setLeague] = useState(LEAGUES[0].id);
  const [day, setDay] = useState(toInput(new Date()));
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Match | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/scores?league=${league}&dates=${day.replaceAll("-", "")}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMatches(parseMatches(d)); setErr("");
    } catch (e: any) {
      setErr(e.message || "Erro ao carregar");
    } finally { setLoading(false); }
  }, [league, day]);

  useEffect(() => { load(); }, [load]);

  const hasLive = matches.some((m) => m.state === "in");
  useEffect(() => {
    if (!hasLive) return;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [hasLive, load]);

  const groups = useMemo(() => ({
    live: matches.filter((m) => m.state === "in"),
    pre: matches.filter((m) => m.state === "pre"),
    post: matches.filter((m) => m.state === "post"),
  }), [matches]);

  const quick = [["Ontem", -1], ["Hoje", 0], ["Amanhã", 1]] as const;

  return (
    <main className="mx-auto min-h-screen max-w-lg pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 [scrollbar-width:none]">
          {LEAGUES.map((l) => (
            <button key={l.id} onClick={() => setLeague(l.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${league === l.id ? "bg-accent font-semibold" : "bg-card text-mute"}`}>
              {l.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          {quick.map(([label, n]) => (
            <button key={label} onClick={() => setDay(toInput(addDays(n)))}
              className={`rounded-lg px-3 py-1 text-sm ${day === toInput(addDays(n)) ? "bg-line font-semibold" : "text-mute"}`}>
              {label}
            </button>
          ))}
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
            className="ml-auto rounded-lg bg-card px-2 py-1 text-sm [color-scheme:dark]" aria-label="Escolher data" />
        </div>
      </header>

      <div className="px-3 pt-4">
        {loading && <p className="py-12 text-center text-sm text-mute">Carregando jogos…</p>}
        {!loading && err && (
          <div className="py-12 text-center">
            <p className="mb-3 text-sm text-live">{err}</p>
            <button onClick={() => load()} className="rounded-full bg-card px-4 py-1.5 text-sm">Tentar de novo</button>
          </div>
        )}
        {!loading && !err && matches.length === 0 && (
          <p className="py-12 text-center text-sm text-mute">Nenhum jogo nesta data. Troque o dia ou a competição.</p>
        )}
        {!loading && !err && (
          <>
            <Section title="Ao vivo" items={groups.live} onOpen={setOpen} live />
            <Section title="Agendados" items={groups.pre} onOpen={setOpen} />
            <Section title="Encerrados" items={groups.post} onOpen={setOpen} />
          </>
        )}
      </div>

      {open && <Detail league={league} match={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
