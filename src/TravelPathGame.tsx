import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { CONFIGS } from './quizData'
import { useSession } from './useSession'
import { saveCompletion, fetchCompletions, type Completions } from './travelPathStore'

// Two datasets, each with its own name list and map TopoJSON. They must stay
// scoped separately because FIPS state codes collide with ISO country codes
// (e.g. 12 is both Florida and Algeria), as do their adjacency graphs.
type DatasetKey = 'world' | 'us'

interface DatasetDef {
  url: string
  object: string
  // Names + aliases + ids for resolving/displaying items in this dataset.
  items: { id: number; name: string; aliases?: string[] }[]
  // Ids to skip when drawing the base map (non-contiguous US states whose
  // antimeridian-crossing geometry would streak across a Mercator frame).
  skipDraw: Set<number>
}

const DATASETS: Record<DatasetKey, DatasetDef> = {
  world: {
    url: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
    object: 'countries',
    items: CONFIGS.world.countries,
    skipDraw: new Set(),
  },
  us: {
    url: CONFIGS.americanstates.dataSource!.url,
    object: CONFIGS.americanstates.dataSource!.objectName,
    items: CONFIGS.americanstates.countries,
    skipDraw: new Set([2, 15]), // Alaska, Hawaii
  },
}

// ── Name lookup (per dataset) ───────────────────────────────────────────────
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

interface NameMaps { toId: Map<string, number>; toName: Map<number, string> }
const NAME_MAPS: Record<DatasetKey, NameMaps> = {
  world: { toId: new Map(), toName: new Map() },
  us: { toId: new Map(), toName: new Map() },
}
;(Object.keys(DATASETS) as DatasetKey[]).forEach(ds => {
  const m = NAME_MAPS[ds]
  DATASETS[ds].items.forEach(c => {
    m.toName.set(c.id, c.name)
    m.toId.set(norm(c.name), c.id)
    c.aliases?.forEach(a => m.toId.set(norm(a), c.id))
  })
})
const displayName = (ds: DatasetKey, id: number) =>
  NAME_MAPS[ds].toName.get(id) ?? String(id)
const itemNoun = (ds: DatasetKey) => (ds === 'us' ? 'state' : 'country')

// ── Challenges ──────────────────────────────────────────────────────────────
// Each is 4–5 land borders apart (verified against the world-atlas border
// graph). Players may take longer routes; any valid chain of bordering
// countries counts.
type Difficulty = 'easy' | 'hard'

interface Challenge {
  key: string
  region: string
  start: number
  dest: number
  difficulty?: Difficulty // default 'easy'; 'hard' routes need 7–8 borders
  archiveOnly?: boolean // never selected as a daily; only shown in the archive
  ds?: DatasetKey // which map dataset this challenge lives in (default 'world')
  // Explicit map frame [[west, south], [east, north]]. Needed because some
  // countries (e.g. France) include far-flung overseas territories in their
  // geometry; fitting to the raw feature bounds would zoom the map all the way
  // out to the Atlantic and light up French Guiana in South America.
  bounds: [[number, number], [number, number]]
}

// 30 challenges, balanced across Europe/Africa/Asia. Each is 4–5 land borders
// apart (the trailing number is the optimal count), verified against the
// world-atlas border graph. `bounds` is auto-derived from each route's mainland
// extent so overseas territories don't distort the frame.
const CHALLENGES: Challenge[] = [
  // ── Europe ──
  { key: 'portugal-poland',  region: 'Europe', start: 620, dest: 616, bounds: [[-13, 34], [28, 57]] }, // Portugal → Poland (4)
  { key: 'france-romania',   region: 'Europe', start: 250, dest: 642, bounds: [[-9, 40], [34, 54]] },  // France → Romania (4)
  { key: 'spain-hungary',    region: 'Europe', start: 724, dest: 348, bounds: [[-13, 34], [27, 54]] }, // Spain → Hungary (4)
  { key: 'netherlands-romania', region: 'Europe', start: 528, dest: 642, bounds: [[-1, 41], [44, 57]] }, // Netherlands → Romania (4)
  { key: 'italy-lithuania',  region: 'Europe', start: 380, dest: 440, bounds: [[3, 35], [29, 59]] },   // Italy → Lithuania (4)
  { key: 'france-serbia',    region: 'Europe', start: 250, dest: 688, bounds: [[-8, 40], [26, 54]] },  // France → Serbia (4)
  { key: 'spain-romania',    region: 'Europe', start: 724, dest: 642, bounds: [[-14, 34], [34, 54]] }, // Spain → Romania (5)
  { key: 'portugal-ukraine', region: 'Europe', start: 620, dest: 804, bounds: [[-15, 34], [46, 57]] }, // Portugal → Ukraine (5)
  { key: 'france-bulgaria',  region: 'Europe', start: 250, dest: 100, bounds: [[-9, 39], [32, 54]] },  // France → Bulgaria (5)
  { key: 'portugal-croatia', region: 'Europe', start: 620, dest: 191, bounds: [[-13, 34], [23, 54]] }, // Portugal → Croatia (5)
  // ── Africa ──
  { key: 'senegal-egypt',    region: 'Africa', start: 686, dest: 818, bounds: [[-23, 9], [43, 40]] },  // Senegal → Egypt (4)
  { key: 'southafrica-ethiopia', region: 'Africa', start: 710, dest: 231, bounds: [[13, -40], [52, 20]] }, // South Africa → Ethiopia (4)
  { key: 'tanzania-egypt',   region: 'Africa', start: 834, dest: 818, bounds: [[19, -17], [43, 36]] }, // Tanzania → Egypt (4)
  { key: 'angola-egypt',     region: 'Africa', start: 24,  dest: 818, bounds: [[9, -23], [42, 37]] },  // Angola → Egypt (4)
  { key: 'nigeria-kenya',    region: 'Africa', start: 566, dest: 404, bounds: [[-2, -8], [46, 27]] },  // Nigeria → Kenya (4)
  { key: 'ivorycoast-sudan', region: 'Africa', start: 384, dest: 729, bounds: [[-18, 1], [44, 37]] },  // Ivory Coast → Sudan (4)
  { key: 'kenya-algeria',    region: 'Africa', start: 404, dest: 12,  bounds: [[-14, -9], [47, 42]] }, // Kenya → Algeria (4)
  { key: 'liberia-chad',     region: 'Africa', start: 430, dest: 148, bounds: [[-19, 2], [28, 28]] },  // Liberia → Chad (4)
  { key: 'southafrica-sudan', region: 'Africa', start: 710, dest: 729, bounds: [[9, -41], [42, 28]] }, // South Africa → Sudan (5)
  { key: 'mozambique-egypt', region: 'Africa', start: 508, dest: 818, bounds: [[9, -33], [44, 38]] },  // Mozambique → Egypt (5)
  // ── Asia ──
  { key: 'saudiarabia-china', region: 'Asia',  start: 682, dest: 156, bounds: [[24, 12], [145, 58]] }, // Saudi Arabia → China (4)
  { key: 'israel-pakistan',  region: 'Asia',   start: 376, dest: 586, bounds: [[20, 21], [83, 45]] },  // Israel → Pakistan (4)
  { key: 'jordan-india',     region: 'Asia',   start: 400, dest: 356, bounds: [[28, 4], [104, 43]] },  // Jordan → India (4)
  { key: 'yemen-afghanistan', region: 'Asia',  start: 887, dest: 4,   bounds: [[30, 9], [79, 43]] },   // Yemen → Afghanistan (4)
  { key: 'thailand-iran',    region: 'Asia',   start: 764, dest: 364, bounds: [[34, 0], [144, 59]] },  // Thailand → Iran (4)
  { key: 'bangladesh-turkey', region: 'Asia',  start: 50,  dest: 792, bounds: [[18, 4], [105, 46]] },  // Bangladesh → Turkey (4)
  { key: 'malaysia-pakistan', region: 'Asia',  start: 458, dest: 586, bounds: [[53, -5], [143, 59]] }, // Malaysia → Pakistan (4)
  { key: 'israel-india',     region: 'Asia',   start: 376, dest: 356, bounds: [[18, 4], [105, 46]] },  // Israel → India (5)
  { key: 'lebanon-china',    region: 'Asia',   start: 422, dest: 156, bounds: [[15, 16], [146, 57]] }, // Lebanon → China (5)
  { key: 'vietnam-saudiarabia', region: 'Asia', start: 704, dest: 682, bounds: [[24, 4], [145, 59]] }, // Vietnam → Saudi Arabia (5)
  // ── USA (hop between bordering states; verified against the us-atlas graph) ──
  { key: 'us-oregon-texas',        region: 'USA', ds: 'us', start: 41, dest: 48, bounds: [[-128, 24], [-91, 48]] }, // Oregon → Texas (4)
  { key: 'us-california-kansas',   region: 'USA', ds: 'us', start: 6,  dest: 20, bounds: [[-127, 29], [-92, 44]] }, // California → Kansas (4)
  { key: 'us-washington-newmexico', region: 'USA', ds: 'us', start: 53, dest: 35, bounds: [[-127, 29], [-101, 51]] }, // Washington → New Mexico (4)
  { key: 'us-florida-ohio',        region: 'USA', ds: 'us', start: 12, dest: 39, bounds: [[-92, 23], [-78, 44]] },  // Florida → Ohio (4)
  { key: 'us-newyork-tennessee',   region: 'USA', ds: 'us', start: 36, dest: 47, bounds: [[-92, 33], [-70, 47]] },  // New York → Tennessee (4)
  { key: 'us-georgia-pennsylvania', region: 'USA', ds: 'us', start: 13, dest: 42, bounds: [[-88, 28], [-73, 44]] }, // Georgia → Pennsylvania (4)
  { key: 'us-minnesota-louisiana', region: 'USA', ds: 'us', start: 27, dest: 22, bounds: [[-99, 27], [-87, 52]] },  // Minnesota → Louisiana (4)
  { key: 'us-arizona-minnesota',   region: 'USA', ds: 'us', start: 4,  dest: 27, bounds: [[-117, 29], [-87, 51]] }, // Arizona → Minnesota (4)
  { key: 'us-maine-ohio',          region: 'USA', ds: 'us', start: 23, dest: 39, bounds: [[-87, 36], [-65, 49]] },  // Maine → Ohio (5)
  { key: 'us-michigan-florida',    region: 'USA', ds: 'us', start: 26, dest: 12, bounds: [[-92, 23], [-78, 48]] },  // Michigan → Florida (5)

  // ── Hard (7–8 borders apart; verified shortest paths) ──
  // Europe
  { key: 'portugal-greece',         region: 'Europe', difficulty: 'hard', start: 620, dest: 300, bounds: [[-14, 34], [31, 53]] }, // Portugal → Greece (8)
  { key: 'spain-greece',            region: 'Europe', difficulty: 'hard', start: 724, dest: 300, bounds: [[-13, 34], [31, 53]] }, // Spain → Greece (7)
  { key: 'portugal-northmacedonia', region: 'Europe', difficulty: 'hard', start: 620, dest: 807, bounds: [[-13, 34], [27, 53]] }, // Portugal → North Macedonia (7)
  // Africa
  { key: 'senegal-southafrica',  region: 'Africa', difficulty: 'hard', start: 686, dest: 710, bounds: [[-23, -41], [38, 31]] }, // Senegal → South Africa (8)
  { key: 'morocco-mozambique',   region: 'Africa', difficulty: 'hard', start: 504, dest: 508, bounds: [[-23, -34], [47, 44]] }, // Morocco → Mozambique (7)
  { key: 'tunisia-southafrica',  region: 'Africa', difficulty: 'hard', start: 788, dest: 710, bounds: [[4, -42], [45, 45]] },   // Tunisia → South Africa (7)
  // Asia
  { key: 'israel-malaysia',  region: 'Asia', difficulty: 'hard', start: 376, dest: 458, bounds: [[16, -4], [129, 47]] }, // Israel → Malaysia (8)
  { key: 'lebanon-cambodia', region: 'Asia', difficulty: 'hard', start: 422, dest: 116, bounds: [[15, 4], [146, 59]] },  // Lebanon → Cambodia (7)
  { key: 'yemen-thailand',   region: 'Asia', difficulty: 'hard', start: 887, dest: 764, bounds: [[27, 2], [113, 44]] },  // Yemen → Thailand (7)
  // USA
  { key: 'us-washington-florida', region: 'USA', ds: 'us', difficulty: 'hard', start: 53, dest: 12, bounds: [[-129, 22], [-76, 51]] }, // Washington → Florida (7)
  { key: 'us-maine-nebraska',     region: 'USA', ds: 'us', difficulty: 'hard', start: 23, dest: 31, bounds: [[-108, 34], [-64, 49]] }, // Maine → Nebraska (8)
  { key: 'us-california-florida',  region: 'USA', ds: 'us', difficulty: 'hard', start: 6,  dest: 12, bounds: [[-128, 23], [-76, 44]] }, // California → Florida (7)

  // ── Bonus (archive-only; never appear as a daily) ──
  { key: 'portugal-czechia',   region: 'Europe', archiveOnly: true, start: 620, dest: 203, bounds: [[-13, 34], [22, 57]] }, // Portugal → Czechia (4)
  { key: 'spain-slovakia',     region: 'Europe', archiveOnly: true, start: 724, dest: 703, bounds: [[-13, 34], [26, 54]] }, // Spain → Slovakia (4)
  { key: 'netherlands-serbia', region: 'Europe', archiveOnly: true, start: 528, dest: 688, bounds: [[1, 40], [25, 57]] },   // Netherlands → Serbia (4)
  { key: 'senegal-cameroon',   region: 'Africa', archiveOnly: true, start: 686, dest: 120, bounds: [[-21, -1], [20, 28]] }, // Senegal → Cameroon (4)
  { key: 'ghana-sudan',        region: 'Africa', archiveOnly: true, start: 288, dest: 729, bounds: [[-10, 1], [44, 37]] },  // Ghana → Sudan (4)
  { key: 'china-jordan',       region: 'Asia',   archiveOnly: true, start: 156, dest: 400, bounds: [[24, 16], [145, 57]] }, // China → Jordan (4)
  { key: 'india-syria',        region: 'Asia',   archiveOnly: true, start: 356, dest: 760, bounds: [[18, 4], [105, 46]] },  // India → Syria (4)
  { key: 'us-texas-montana',   region: 'USA', ds: 'us', archiveOnly: true, start: 48, dest: 30, bounds: [[-118, 23], [-91, 51]] }, // Texas → Montana (4)
  { key: 'us-idaho-texas',     region: 'USA', ds: 'us', archiveOnly: true, start: 16, dest: 48, bounds: [[-120, 23], [-91, 51]] }, // Idaho → Texas (4)
  { key: 'us-newyork-illinois', region: 'USA', ds: 'us', archiveOnly: true, start: 36, dest: 17, bounds: [[-94, 34], [-70, 47]] }, // New York → Illinois (4)
]

// ── Daily selection (deterministic from the local calendar date — no server) ──
// Weekdays draw from the easy rotation, Saturdays from the hard rotation; each
// cycles so every day is a different map. Bonus challenges are excluded.
const EASY_POOL = CHALLENGES.filter(c => !c.archiveOnly && (c.difficulty ?? 'easy') === 'easy')
const HARD_POOL = CHALLENGES.filter(c => !c.archiveOnly && c.difficulty === 'hard')
const BONUS_POOL = CHALLENGES.filter(c => c.archiveOnly)
const BY_KEY = new Map(CHALLENGES.map(c => [c.key, c]))

// Launch day = daily #0. The archive of *past* dailies grows one per day from here.
const DAILY_EPOCH = new Date(2026, 4, 30) // 30 May 2026 (local time)

const mod = (x: number, m: number) => ((x % m) + m) % m
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const dayIndex = (d: Date) =>
  Math.round((atMidnight(d).getTime() - atMidnight(DAILY_EPOCH).getTime()) / 86_400_000)

// The challenge for a given calendar day. Saturday (getDay() === 6) is hard.
function dailyFor(date: Date): Challenge {
  const n = dayIndex(date)
  if (date.getDay() === 6) return HARD_POOL[mod(Math.floor(n / 7), HARD_POOL.length)]
  return EASY_POOL[mod(n, EASY_POOL.length)]
}

// Past dailies (epoch .. yesterday), newest first.
function pastDailies(today: Date): { date: Date; ch: Challenge }[] {
  const out: { date: Date; ch: Challenge }[] = []
  for (let i = dayIndex(today) - 1; i >= 0; i--) {
    const d = atMidnight(DAILY_EPOCH)
    d.setDate(d.getDate() + i)
    out.push({ date: d, ch: dailyFor(d) })
  }
  return out
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const W = 960
const H = 560

interface GeoData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  byId: Map<number, any>
  adj: Map<number, Set<number>>
}

// Cache one GeoData (features + border adjacency) per dataset.
const geoCache: Partial<Record<DatasetKey, GeoData>> = {}
const geoPromises: Partial<Record<DatasetKey, Promise<GeoData>>> = {}

function loadGeo(ds: DatasetKey): Promise<GeoData> {
  if (geoCache[ds]) return Promise.resolve(geoCache[ds]!)
  if (geoPromises[ds]) return geoPromises[ds]!
  const { url, object } = DATASETS[ds]
  const promise = d3
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .json<any>(url)
    .then(topo => {
      const geoms = topo.objects[object].geometries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const features = (topojson.feature(topo, topo.objects[object]) as any).features
      const neighbors = topojson.neighbors(geoms)
      const idByIndex: number[] = geoms.map((g: { id: string }) => +g.id)
      const adj = new Map<number, Set<number>>()
      geoms.forEach((g: { id: string }, i: number) => {
        const id = +g.id
        if (!adj.has(id)) adj.set(id, new Set())
        neighbors[i].forEach((j: number) => adj.get(id)!.add(idByIndex[j]))
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byId = new Map<number, any>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features.forEach((f: any) => byId.set(+f.id, f))
      geoCache[ds] = { features, byId, adj }
      return geoCache[ds]!
    })
  geoPromises[ds] = promise
  return promise
}

// Shortest chain of bordering countries (inclusive of both endpoints).
function shortestPath(adj: Map<number, Set<number>>, a: number, b: number): number[] {
  const prev = new Map<number, number>()
  const seen = new Set([a])
  const queue = [a]
  while (queue.length) {
    const cur = queue.shift()!
    if (cur === b) break
    for (const n of adj.get(cur) ?? []) {
      if (!seen.has(n)) { seen.add(n); prev.set(n, cur); queue.push(n) }
    }
  }
  if (a !== b && !prev.has(b)) return []
  const path = [b]
  let cur = b
  while (cur !== a) { cur = prev.get(cur)!; path.unshift(cur) }
  return path
}

// ── Component ───────────────────────────────────────────────────────────────
interface TravelPathProps {
  mode: 'daily' | 'archive'
  onNavigate: (to: string) => void
}

export default function TravelPath({ mode, onNavigate }: TravelPathProps) {
  const [geoReady, setGeoReady] = useState(false)
  const [active, setActive] = useState<Challenge | null>(null)
  const [path, setPath] = useState<number[]>([])
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ msg: string; color: string } | null>(null)
  const [won, setWon] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const [par, setPar] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [completions, setCompletions] = useState<Completions>({})
  const [today] = useState(() => new Date()) // fixed for the session

  // Load completed-challenge markers; refetch when the user signs in/out so a
  // signed-in user's cross-device history merges with local progress.
  const { session } = useSession()
  useEffect(() => {
    fetchCompletions().then(setCompletions).catch(() => {})
  }, [session])

  const svgRef = useRef<SVGSVGElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const geoRef = useRef<GeoData | null>(null)
  const geoDsRef = useRef<DatasetKey | null>(null)
  const projRef = useRef<d3.GeoProjection | null>(null)
  const geoPathRef = useRef<d3.GeoPath | null>(null)

  const gameOver = won || gaveUp
  const challenge = active
  const activeKey = active?.key ?? null
  const ds: DatasetKey = challenge?.ds ?? 'world'
  const steps = Math.max(0, path.length - 1)

  // ── Start a challenge ─────────────────────────────────────────────────────
  const selectChallenge = (ch: Challenge) => {
    const cds = ch.ds ?? 'world'
    setActive(ch)
    setPath([ch.start])
    setInput('')
    setFeedback(null)
    setWon(false)
    setGaveUp(false)
    setCopied(false)
    setPar(null)
    const apply = (g: GeoData) => {
      geoRef.current = g
      geoDsRef.current = cds
      setPar(shortestPath(g.adj, ch.start, ch.dest).length - 1)
      setGeoReady(true)
    }
    const cached = geoCache[cds]
    if (cached) apply(cached)
    else { setGeoReady(false); loadGeo(cds).then(apply).catch(() => {}) }
    setTimeout(() => inputRef.current?.focus(), 60)
  }

  const clearActive = () => {
    setActive(null)
    setPath([])
    setFeedback(null)
    setWon(false)
    setGaveUp(false)
  }

  // Title, warm the world dataset, and auto-start today's puzzle in daily mode.
  useEffect(() => {
    document.title = mode === 'archive'
      ? 'Travel Path Archive · Geo Study'
      : 'Travel Path · Geo Study'
    loadGeo('world').catch(() => {})
    if (mode === 'daily') selectChallenge(dailyFor(today))
    else clearActive()
    return () => { document.title = 'James' }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ── Draw the map, framed to the current challenge ─────────────────────────
  useEffect(() => {
    if (!geoReady || !challenge || !svgRef.current || !geoRef.current) return
    if (geoDsRef.current !== (challenge.ds ?? 'world')) return // geo still loading
    const { features } = geoRef.current
    const skip = DATASETS[challenge.ds ?? 'world'].skipDraw
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0c1f35')

    const proj = d3.geoMercator()
    const geoPath = d3.geoPath(proj)
    // Fit to the challenge's explicit lon/lat frame. A MultiPoint of the two
    // corners avoids the spherical-polygon winding ambiguity that would make a
    // Polygon fit the whole globe. See the `bounds` note on Challenge.
    const [[w, s], [e, n]] = challenge.bounds
    proj.fitExtent(
      [[16, 16], [W - 16, H - 16]],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'MultiPoint', coordinates: [[w, s], [e, n]] } as any,
    )
    projRef.current = proj
    geoPathRef.current = geoPath

    // Everything that should pan/zoom together goes inside this group.
    const g = svg.append('g')
    g.append('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .datum(d3.geoGraticule()() as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', geoPath as any)
      .attr('fill', 'none').attr('stroke', '#112236').attr('stroke-width', 0.4)

    g.selectAll('path.tp-c')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .data(features.filter((f: any) => !skip.has(+f.id)))
      .join('path')
      .attr('class', 'tp-c')
      // Normalize to numeric id: atlases zero-pad ids (world-atlas: Algeria
      // "012"; us-atlas: Alabama "01"), but adjacency/path use numeric ids.
      .attr('id', (d: unknown) => `tp-cp-${+(d as { id: string }).id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', geoPath as any)

    g.append('g').attr('class', 'tp-labels')

    // Pan / scroll-zoom / pinch-zoom, mirroring the Countries Quiz map.
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([[0, 0], [W, H]])
      .on('zoom', ({ transform }) => g.attr('transform', String(transform)))
    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity)

    const svgEl = svgRef.current
    const handleWheel = (e: WheelEvent) => e.preventDefault()
    svgEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => svgEl.removeEventListener('wheel', handleWheel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoReady, activeKey])

  // ── Recolour map + draw labels as the route grows ─────────────────────────
  useEffect(() => {
    if (!geoReady || !challenge || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    const geoPath = geoPathRef.current
    svg.selectAll<SVGPathElement, unknown>('path[id^="tp-cp-"]').attr('class', 'tp-c')

    const setCls = (id: number, cls: string) =>
      svg.select(`#tp-cp-${id}`).attr('class', `tp-c ${cls}`)

    path.forEach((id, i) => {
      if (i === 0) return
      setCls(id, id === challenge.dest ? 'tp-c-dest tp-c-reached' : 'tp-c-path')
    })
    setCls(challenge.start, 'tp-c-start')
    if (!path.includes(challenge.dest)) setCls(challenge.dest, 'tp-c-dest')

    // Labels for every highlighted country
    const labels = svg.select('.tp-labels')
    labels.selectAll('*').remove()
    if (!geoPath || !geoRef.current) return
    const labelIds = new Set<number>([challenge.start, challenge.dest, ...path])
    labelIds.forEach(id => {
      const feat = geoRef.current!.byId.get(id)
      if (!feat) return
      const [cx, cy] = geoPath.centroid(feat)
      if (isNaN(cx) || isNaN(cy)) return
      const color = id === challenge.start ? '#93c5fd'
        : id === challenge.dest ? '#f8c4ad'
        : '#bbf7d0'
      labels.append('text')
        .attr('x', cx).attr('y', cy)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '11px').attr('font-weight', '700')
        .attr('font-family', 'Geist, system-ui, sans-serif')
        .attr('fill', color)
        .attr('stroke', 'rgba(0,0,0,0.85)').attr('stroke-width', '3')
        .style('paint-order', 'stroke fill')
        .attr('pointer-events', 'none')
        .text(displayName(challenge.ds ?? 'world', id))
    })
  }, [geoReady, path, activeKey])

  // ── Submit a guess ────────────────────────────────────────────────────────
  const flash = (msg: string, color: string) => setFeedback({ msg, color })

  const submitGuess = () => {
    if (!challenge || gameOver) return
    const raw = input.trim()
    if (!raw) return
    const id = NAME_MAPS[ds].toId.get(norm(raw))
    if (id == null) {
      flash(`"${raw}" isn't a ${itemNoun(ds)} we recognize.`, '#f87171')
      return
    }
    if (path.includes(id)) {
      flash(`${displayName(ds, id)} is already on your route.`, '#fbbf24')
      return
    }
    const last = path[path.length - 1]
    const adj = geoRef.current?.adj
    if (!adj?.get(last)?.has(id)) {
      flash(`${displayName(ds, id)} doesn't border ${displayName(ds, last)}.`, '#f87171')
      return
    }
    const next = [...path, id]
    setPath(next)
    setInput('')
    if (id === challenge.dest) {
      setWon(true)
      flash(`You made it to ${displayName(ds, id)}! 🎉`, '#4ade80')
      const stepsNow = next.length - 1
      saveCompletion(challenge.key, stepsNow)
      setCompletions(prev => ({
        ...prev,
        [challenge.key]: challenge.key in prev ? Math.min(prev[challenge.key], stepsNow) : stepsNow,
      }))
    } else {
      flash(`✓ ${displayName(ds, id)}`, '#4ade80')
    }
  }

  const undo = () => {
    if (gameOver || path.length <= 1) return
    setPath(p => p.slice(0, -1))
    setFeedback(null)
    inputRef.current?.focus()
  }

  const showSolution = () => {
    if (!challenge || !geoRef.current) return
    const sol = shortestPath(geoRef.current.adj, challenge.start, challenge.dest)
    setPath(sol)
    setGaveUp(true)
    flash(`One shortest route — ${sol.length - 1} borders.`, '#94a3b8')
  }

  const handleShare = () => {
    if (!challenge) return
    const chain = path.map(id => displayName(ds, id)).join(' → ')
    const text = `Travel Path · Geo Study\n${displayName(ds, challenge.start)} → ${displayName(ds, challenge.dest)}\n${won ? `Solved in ${steps} borders` : 'Gave up'}${par != null ? ` (best ${par})` : ''}\n${chain}`
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
      .catch(() => window.prompt('Copy your route:', text))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const renderCard = (ch: Challenge, dateLabel?: string) => {
    const best = completions[ch.key]
    const done = best !== undefined
    const diff = ch.difficulty ?? 'easy'
    return (
      <button
        key={dateLabel ?? ch.key}
        className={`tp-level${done ? ' tp-level--done' : ''}`}
        onClick={() => selectChallenge(ch)}
      >
        {dateLabel && <span className="tp-level-date">{dateLabel}</span>}
        <span className={`tp-level-diff tp-level-diff--${diff}`}>{diff === 'hard' ? 'Hard' : 'Easy'}</span>
        <span className="tp-level-route">
          <strong>{displayName(ch.ds ?? 'world', ch.start)}</strong>
          <span className="tp-level-arrow">→</span>
          <strong>{displayName(ch.ds ?? 'world', ch.dest)}</strong>
        </span>
        {done && (
          <span className="tp-level-done">✓ Completed in {best} {best === 1 ? 'border' : 'borders'}</span>
        )}
        <span className="tp-level-go">{done ? 'Replay →' : 'Play →'}</span>
      </button>
    )
  }

  const past = mode === 'archive' ? pastDailies(today) : []
  const diff = challenge ? (challenge.difficulty ?? 'easy') : 'easy'

  return (
    <div className="tp-page">
      <div className="tp-header">
        <h1 className="tp-title">{mode === 'archive' ? 'Travel Path Archive' : 'Travel Path'}</h1>
        <p className="tp-subtitle">
          {mode === 'archive'
            ? 'Replay past daily challenges, plus a handful of bonus maps. Hop between bordering countries (or US states) from start to destination.'
            : 'A new border-hopping challenge every day — name the countries (or US states) that border each other from start to destination. Saturdays are hard.'}
        </p>
      </div>

      {!challenge && mode === 'daily' && (
        <div className="tp-loading-block">Loading today's challenge…</div>
      )}

      {!challenge && mode === 'archive' && (
        <>
          <div className="tp-how">
            <h2 className="tp-how-title">How to play</h2>
            <ol className="tp-how-list">
              <li>Each challenge gives you a <strong>start</strong> and a <strong>destination</strong> (countries, or US states).</li>
              <li>Type the name of a place that <strong>shares a land border</strong> with your current one to step into it.</li>
              <li>Keep hopping across borders until you reach the destination.</li>
              <li><strong>Easy</strong> challenges solve in <strong>4–5 borders</strong>, <strong>Hard</strong> ones in <strong>7–8</strong>.</li>
            </ol>
          </div>

          <div className="tp-region-group">
            <div className="tp-region-head">
              Past dailies
              <span className="tp-region-count">{past.length} so far</span>
            </div>
            {past.length === 0 ? (
              <p className="tp-archive-empty">No past dailies yet — today's is the very first. Check back tomorrow!</p>
            ) : (
              <div className="tp-levels">{past.map(({ date, ch }) => renderCard(ch, fmtDate(date)))}</div>
            )}
          </div>

          <div className="tp-region-group">
            <div className="tp-region-head">
              Bonus challenges
              <span className="tp-region-count">{BONUS_POOL.length} maps</span>
            </div>
            <div className="tp-levels">{BONUS_POOL.map(ch => renderCard(ch))}</div>
          </div>
        </>
      )}

      {challenge && (
        <div className="tp-game">
          <div className="tp-route-banner">
            {mode === 'archive'
              ? <button className="tp-levels-back" onClick={clearActive}>← Archive</button>
              : <span className="tp-daily-label">🗓 {fmtDate(today)}</span>}
            <span className={`tp-level-diff tp-level-diff--${diff}`}>{diff === 'hard' ? 'Hard' : 'Easy'}</span>
            <div className="tp-route-ends">
              <span className="tp-end tp-end--start">{displayName(ds, challenge.start)}</span>
              <span className="tp-route-arrow">→</span>
              <span className="tp-end tp-end--dest">{displayName(ds, challenge.dest)}</span>
            </div>
            <div className="tp-route-meta">
              <span className="tp-stat"><strong>{steps}</strong> borders</span>
              {par != null && <span className="tp-stat tp-stat--muted">best {par}</span>}
            </div>
          </div>

          <div className="tp-chain">
            {path.map((id, i) => (
              <span key={`${id}-${i}`} className="tp-chain-wrap">
                {i > 0 && <span className="tp-chain-sep">›</span>}
                <span className={
                  'tp-chip'
                  + (id === challenge.start ? ' tp-chip--start' : '')
                  + (id === challenge.dest ? ' tp-chip--dest' : '')
                  + (i === path.length - 1 && !gameOver && id !== challenge.start ? ' tp-chip--current' : '')
                }>
                  {displayName(ds, id)}
                </span>
              </span>
            ))}
          </div>

          {!gameOver && (
            <div className="tp-input-row">
              <input
                ref={inputRef}
                className="tp-input"
                type="text"
                placeholder={`Type a ${itemNoun(ds)} bordering ${displayName(ds, path[path.length - 1])}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitGuess() }}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore
              />
              <button className="tp-btn tp-btn-undo" onClick={undo} disabled={path.length <= 1}>
                Undo
              </button>
            </div>
          )}

          <div className="tp-feedback" style={{ color: feedback?.color }}>
            {feedback?.msg ?? ' '}
          </div>

          {won && (
            <div className="tp-win">
              🎉 Reached {displayName(ds, challenge.dest)} in <strong>{steps}</strong> borders
              {par != null && steps === par && ' — the best possible route!'}
              {par != null && steps > par && ` (best is ${par})`}
            </div>
          )}
          {gaveUp && (
            <div className="tp-win tp-win--gaveup">
              Here's one shortest route to {displayName(ds, challenge.dest)}.
            </div>
          )}

          <div className="tp-map-wrap">
            <span className="tp-map-hint">Scroll or pinch to zoom</span>
            {!geoReady && <div className="tp-map-loading">Loading map…</div>}
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} />
          </div>

          <div className="tp-controls">
            {!gameOver ? (
              <>
                <button className="tp-btn tp-btn-reset" onClick={() => challenge && selectChallenge(challenge)}>
                  Reset
                </button>
                <button className="tp-btn tp-btn-giveup" onClick={showSolution}>
                  Show a solution
                </button>
              </>
            ) : (
              <>
                <button className="tp-btn tp-btn-reset" onClick={() => challenge && selectChallenge(challenge)}>
                  Try again
                </button>
                <button
                  className={`tp-btn tp-btn-share${copied ? ' tp-btn-share--copied' : ''}`}
                  onClick={handleShare}
                >
                  {copied ? '✓ Copied!' : '📋 Share route'}
                </button>
              </>
            )}
          </div>

          {gameOver && mode === 'daily' && (
            <p className="tp-daily-note">
              That's today's daily — a new challenge unlocks tomorrow.{' '}
              <button className="tp-link" onClick={() => onNavigate('/archive')}>
                Play past challenges →
              </button>
            </p>
          )}
          {gameOver && mode === 'archive' && (
            <p className="tp-daily-note">
              <button className="tp-link" onClick={clearActive}>← Back to the archive</button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
