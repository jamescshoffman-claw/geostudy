import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { CONFIGS, type QuizConfig, type Country, type RegionKey } from './quizData'
import { saveScore } from './scores'

// ── Adsterra banner ─────────────────────────────────────────────────────────
// The snippet is a global `atOptions` config plus invoke.js, which locates
// itself via document.currentScript and injects the ad next to its own <script>.
// currentScript is null for dynamically-appended async scripts, so loading it
// straight into the page silently fails. Running it inside a srcdoc iframe makes
// the scripts parse synchronously (currentScript works) and sandboxes the ad.
const AD_KEY = '201d3c619c25505fcf1ea81b9150f6c9'
const AD_W = 160
const AD_H = 300

function AdsterraBanner() {
  const srcDoc =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body>` +
    `<script type="text/javascript">atOptions={'key':'${AD_KEY}','format':'iframe','height':${AD_H},'width':${AD_W},'params':{}};<\/script>` +
    `<script type="text/javascript" src="https://www.highperformanceformat.com/${AD_KEY}/invoke.js"><\/script>` +
    `</body></html>`
  return (
    <iframe
      title="advertisement"
      width={AD_W}
      height={AD_H}
      scrolling="no"
      style={{ border: 0, width: AD_W, height: AD_H, display: 'block', overflow: 'hidden' }}
      srcDoc={srcDoc}
    />
  )
}

// Kosovo is absent from world-atlas (merged into Serbia there); embed its polygon directly.
const KOSOVO_FEATURE = {
  type: 'Feature',
  id: -99,
  geometry: {
    type: 'Polygon',
    coordinates: [[[20.064956,42.546758],[20.077048,42.55991],[20.078185,42.572906],[20.075394,42.586962],[20.075704,42.603085],[20.079218,42.61125],[20.090587,42.627348],[20.10392,42.653108],[20.101956,42.656674],[20.094205,42.666983],[20.037006,42.707363],[20.03612,42.707989],[20.024751,42.723414],[20.026508,42.743206],[20.034673,42.751423],[20.055638,42.763866],[20.065059,42.769458],[20.076325,42.773437],[20.112085,42.766538],[20.149498,42.749872],[20.183398,42.742508],[20.208409,42.763282],[20.20996,42.772972],[20.208409,42.782093],[20.209236,42.791704],[20.217608,42.802737],[20.226083,42.806768],[20.264427,42.817258],[20.345352,42.827439],[20.428034,42.840642],[20.4763,42.855525],[20.498831,42.877875],[20.494367,42.887467],[20.488909,42.899191],[20.466688,42.909501],[20.450979,42.922032],[20.459454,42.950015],[20.476403,42.966371],[20.493457,42.970195],[20.51113,42.970195],[20.530457,42.975156],[20.538415,42.980659],[20.543893,42.987248],[20.553401,43.002596],[20.562393,43.009495],[20.572832,43.00934],[20.584304,43.006911],[20.596396,43.007092],[20.617273,43.02213],[20.643835,43.052257],[20.664919,43.085407],[20.669157,43.109799],[20.661818,43.115948],[20.65169,43.11631],[20.640941,43.115276],[20.632053,43.117266],[20.626058,43.123725],[20.620581,43.133337],[20.612106,43.154938],[20.600117,43.173826],[20.597533,43.184962],[20.604044,43.197959],[20.612312,43.202274],[20.644869,43.203307],[20.666986,43.209663],[20.745328,43.252865],[20.769512,43.260849],[20.79442,43.263071],[20.809717,43.25961],[20.819432,43.257412],[20.838449,43.245863],[20.848474,43.238137],[20.855088,43.231445],[20.8647,43.217337],[20.8616,43.217518],[20.851471,43.219818],[20.839999,43.212092],[20.840619,43.206976],[20.839069,43.192455],[20.836071,43.179433],[20.832041,43.178606],[20.838552,43.170467],[20.912494,43.138805],[20.993431,43.104148],[21.005157,43.099128],[21.025827,43.093366],[21.092593,43.090678],[21.10851,43.081558],[21.124012,43.058277],[21.139309,43.005826],[21.147887,42.992622],[21.165354,42.985103],[21.17941,42.990581],[21.193052,42.997893],[21.209795,42.995878],[21.225298,42.973554],[21.226745,42.942522],[21.23243,42.910896],[21.260542,42.886556],[21.2716,42.884283],[21.294958,42.884386],[21.306327,42.882448],[21.316972,42.877616],[21.336403,42.865473],[21.346738,42.860847],[21.378777,42.855292],[21.398931,42.854569],[21.40844,42.846998],[21.408419,42.841743],[21.408336,42.820747],[21.404099,42.803978],[21.39056,42.770414],[21.387149,42.754962],[21.383945,42.749976],[21.379191,42.747004],[21.378674,42.744136],[21.388699,42.739046],[21.405546,42.7353],[21.4178,42.73557],[21.441823,42.736101],[21.542488,42.725817],[21.565226,42.720184],[21.580522,42.710211],[21.612665,42.680393],[21.629408,42.672203],[21.644084,42.672306],[21.687389,42.686827],[21.708886,42.687189],[21.738652,42.68215],[21.74425,42.679425],[21.764387,42.669619],[21.772758,42.647501],[21.767074,42.638716],[21.756532,42.633626],[21.744543,42.629647],[21.734725,42.624247],[21.735551,42.621276],[21.730074,42.601018],[21.728833,42.598305],[21.726973,42.596393],[21.720152,42.593887],[21.718291,42.591019],[21.719738,42.586678],[21.726766,42.577945],[21.727697,42.574147],[21.717671,42.551151],[21.667855,42.490095],[21.627858,42.460381],[21.618969,42.449245],[21.616902,42.433923],[21.621863,42.402167],[21.617419,42.386639],[21.596645,42.372092],[21.537321,42.35863],[21.51603,42.341939],[21.514893,42.317832],[21.553857,42.273984],[21.564066,42.246289],[21.561815,42.247164],[21.519854,42.239025],[21.499287,42.238663],[21.48151,42.247784],[21.471973,42.23913],[21.467557,42.235123],[21.457222,42.237035],[21.44792,42.244141],[21.436345,42.24688],[21.419912,42.240058],[21.421462,42.231351],[21.428697,42.222566],[21.429834,42.215848],[21.419085,42.215021],[21.384255,42.224943],[21.366788,42.223858],[21.360602,42.220114],[21.353766,42.215977],[21.294958,42.148979],[21.293718,42.140168],[21.295785,42.134794],[21.298782,42.129419],[21.300332,42.120893],[21.301263,42.10061],[21.300796,42.098425],[21.299299,42.091411],[21.28886,42.089706],[21.245727,42.096167],[21.237804,42.097354],[21.229298,42.103822],[21.225402,42.106785],[21.216203,42.121151],[21.199873,42.14115],[21.164423,42.16704],[21.12639,42.188925],[21.112954,42.194402],[21.106236,42.195798],[21.098484,42.195953],[21.074403,42.184455],[21.04094,42.15997],[21.029238,42.151408],[21.003916,42.141951],[20.975145,42.134658],[20.90417,42.116668],[20.810543,42.092936],[20.784912,42.082032],[20.765378,42.064333],[20.755353,42.042784],[20.743054,41.993484],[20.741814,41.970773],[20.751439,41.940338],[20.754423,41.930904],[20.751052,41.910218],[20.750495,41.906797],[20.739953,41.888039],[20.723313,41.866619],[20.714398,41.859163],[20.702953,41.849591],[20.681456,41.84401],[20.671844,41.849307],[20.652827,41.86928],[20.643422,41.873647],[20.637014,41.870365],[20.626162,41.855198],[20.61872,41.850522],[20.602391,41.849876],[20.590298,41.854733],[20.567147,41.873182],[20.567767,41.88052],[20.562703,41.892845],[20.562496,41.900105],[20.567251,41.912172],[20.573348,41.917675],[20.580583,41.921732],[20.588748,41.929586],[20.59929,41.94788],[20.59929,41.960567],[20.594329,41.973718],[20.589678,41.993639],[20.558259,42.055109],[20.552161,42.07379],[20.551954,42.105803],[20.549371,42.123476],[20.538622,42.150116],[20.500795,42.211223],[20.481674,42.230705],[20.473665,42.237123],[20.456973,42.250497],[20.333363,42.317883],[20.317964,42.319821],[20.249647,42.318607],[20.237762,42.319924],[20.229597,42.32672],[20.220915,42.343101],[20.219468,42.350207],[20.221225,42.36372],[20.218848,42.371446],[20.21306,42.377518],[20.197454,42.38744],[20.192803,42.393693],[20.194043,42.4001],[20.204379,42.411831],[20.204689,42.420099],[20.199728,42.427799],[20.186292,42.437437],[20.180814,42.443095],[20.152702,42.493402],[20.152599,42.493609],[20.152599,42.493712],[20.152392,42.493712],[20.135546,42.509629],[20.085626,42.530015],[20.064956,42.546758]]]
  },
  properties: {}
}

const W = 960
const H = 600
// Inset SVG uses a narrower viewBox so text/paths render at higher apparent size
const IW = 380
const IH = 580
const TIMER_SECONDS = 600
const safeId = (id: number) => String(id).replace('-', 'n')
const cpId  = (id: number) => `cp-${safeId(id)}`
const icpId = (id: number) => `icp-${safeId(id)}`
const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// ── Inner quiz (re-mounts on every tab switch or restart) ─────────────────

interface QuizProps {
  config: QuizConfig
  quizKey: string
  onRestart: () => void
}

function Quiz({ config, quizKey, onRestart }: QuizProps) {
  const [score, setScore] = useState(0)
  const [foundNames, setFoundNames] = useState<string[]>([])
  const [missedNames, setMissedNames] = useState<string[]>([])
  const [inputVal, setInputVal] = useState('')
  const [inputStatus, setInputStatus] = useState<'' | 'correct' | 'wrong'>('')
  const [feedback, setFeedback] = useState<{ msg: string; color: string } | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [copied, setCopied] = useState(false)

  const svgRef   = useRef<SVGSVGElement>(null)
  const insetRef = useRef<SVGSVGElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const foundSetRef  = useRef(new Set<number>())
  const lookupRef    = useRef(new Map<string, Country>())
  const gameOverRef  = useRef(false)
  const quizVersionRef = useRef(0)
  const fbTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const markFoundRef = useRef<(c: Country) => void>(() => {})
  const giveUpRef    = useRef<() => void>(() => {})

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!started || gameOver) return
    const id = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(id)
  }, [started, gameOver])

  useEffect(() => {
    if (timeLeft === 0 && started && !gameOverRef.current) giveUpRef.current()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started])

  // Persist the result once per finished game (saveScore no-ops when signed out).
  const savedRef = useRef(false)
  useEffect(() => {
    if (!gameOver || savedRef.current) return
    savedRef.current = true
    saveScore({
      quizKey,
      score,
      total: config.total,
      won,
      elapsedSeconds: TIMER_SECONDS - timeLeft,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver])

  // ── Share ─────────────────────────────────────────────────────────────────

  const itemNoun = config.itemNoun ?? 'country'
  const itemNounPlural = config.itemNounPlural ?? 'countries'

  const handleShare = () => {
    const elapsed = TIMER_SECONDS - timeLeft
    const timeStr = timeLeft === 0 ? 'Time ran out!' : `Finished in ${formatTime(elapsed)}`
    const resultLine = won
      ? `🎉 All ${config.total}/${config.total} ${itemNounPlural} found!`
      : `✅ ${score}/${config.total} ${itemNounPlural} found`
    const text = `Geo Study – ${config.label}\n${resultLine}\n⏱️ ${timeStr}`
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
      .catch(() => { window.prompt('Copy your results:', text) })
  }

  // ── D3 map setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    const lk = new Map<string, Country>()
    config.countries.forEach(c => {
      lk.set(c.name.toLowerCase(), c)
      c.aliases?.forEach(a => lk.set(a.toLowerCase(), c))
    })
    lookupRef.current = lk

    const svgEl = svgRef.current
    if (!svgEl) return
    const insetEl = insetRef.current

    const myVersion = ++quizVersionRef.current

    function showFeedback(msg: string, color: string) {
      setFeedback({ msg, color })
      clearTimeout(fbTimerRef.current)
      fbTimerRef.current = setTimeout(() => setFeedback(null), 1800)
    }

    // ── Main map ──────────────────────────────────────────────────────────
    const svg = d3.select(svgEl)
    svg.on('.zoom', null)
    svg.selectAll('*').remove()
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0c1f35')

    // geoAlbersUsa composites Alaska/Hawaii into the contiguous frame; Mercator
    // uses rotate for longitude centering so antimeridian-crossing regions
    // (e.g. Oceania: Samoa/Tonga at -172°/-175°) project correctly.
    const proj: d3.GeoProjection = config.projectionType === 'albersUsa'
      ? d3.geoAlbersUsa()
          .scale(config.projScale)
          .translate([W / 2, H / 2])
      : d3.geoMercator()
          .rotate([-config.projCenter[0], 0])
          .center([0, config.projCenter[1]])
          .scale(config.projScale)
          .translate([W / 2, H / 2])

    const geoPath = d3.geoPath().projection(proj)
    const zoomG = svg.append<SVGGElement>('g')

    zoomG.append('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .datum(d3.geoGraticule()() as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', geoPath as any)
      .attr('fill', 'none').attr('stroke', '#112236').attr('stroke-width', 0.4)

    const countriesG    = zoomG.append<SVGGElement>('g')

    // Dashed ring on main map indicating countries shown in the inset panel
    if (config.inset) {
      const [cx, cy] = proj(config.inset.projCenter) ?? [0, 0]
      const northPt: [number, number] = [config.inset.projCenter[0], config.inset.projCenter[1] + 4]
      const [, ny] = proj(northPt) ?? [cx, cy - 20]
      const r = Math.abs(cy - ny) * 1.6
      zoomG.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#8ba7c2').attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4 3')
        .attr('opacity', 0.5)
        .attr('pointer-events', 'none')
    }

    const calloutG      = zoomG.append<SVGGElement>('g')
    const foundLabelsG  = zoomG.append<SVGGElement>('g')
    const missedLabelsG = zoomG.append<SVGGElement>('g')

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', ({ transform }) => zoomG.attr('transform', String(transform)))
    svg.call(zoomBehavior)
    svg.call(zoomBehavior.transform, d3.zoomIdentity)

    // ── Inset map ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let insetCountriesG: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let insetGeoPath: d3.GeoPath | null = null
    let insetProj: d3.GeoProjection | null = null

    if (config.inset && insetRef.current) {
      const insetSvg = d3.select(insetRef.current)
      insetSvg.selectAll('*').remove()
      insetSvg.append('rect').attr('width', IW).attr('height', IH).attr('fill', '#0c1f35')

      insetProj = d3.geoMercator()
        .center(config.inset.projCenter)
        .scale(config.inset.projScale)
        .translate([IW / 2, IH / 2])

      insetGeoPath = d3.geoPath().projection(insetProj)
      const insetG = insetSvg.append<SVGGElement>('g')

      insetG.append('path')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .datum(d3.geoGraticule()() as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('d', insetGeoPath as any)
        .attr('fill', 'none').attr('stroke', '#112236').attr('stroke-width', 0.4)

      insetCountriesG = insetG.append<SVGGElement>('g')

      // Callout indicators in the inset, always visible, color updates when found/missed
      const insetCalloutG = insetG.append<SVGGElement>('g')
      config.inset.callouts?.forEach(ic => {
        const [px, py] = insetProj([ic.lon, ic.lat]) ?? [0, 0]
        const g = insetCalloutG.append('g').attr('id', `i-callout-${safeId(ic.id)}`)
        g.append('line')
          .attr('x1', px).attr('y1', py)
          .attr('x2', px + ic.dx).attr('y2', py + ic.dy)
          .attr('stroke', '#8ba7c2').attr('stroke-width', 1.5)
        g.append('circle')
          .attr('cx', px).attr('cy', py).attr('r', 2).attr('fill', '#8ba7c2')
      })

      const insetZoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.8, 16])
        .on('zoom', ({ transform }) => insetG.attr('transform', String(transform)))
      insetSvg.call(insetZoom)
      insetSvg.call(insetZoom.transform, d3.zoomIdentity)
    }

    // ── Small-country callout indicators ──────────────────────────────────
    const smallIds = new Set(config.smallDef.map(s => s.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureMap = new Map<number, any>()

    config.smallDef.forEach(sc => {
      const [px, py] = proj([sc.lon, sc.lat]) ?? [0, 0]
      const g = calloutG.append('g').attr('id', `callout-${safeId(sc.id)}`)
      g.append('line')
        .attr('x1', px).attr('y1', py)
        .attr('x2', px + sc.dx).attr('y2', py + sc.dy)
        .attr('stroke', '#8ba7c2').attr('stroke-width', 1.5)
      g.append('circle')
        .attr('cx', px).attr('cy', py).attr('r', 1.8).attr('fill', '#8ba7c2')
    })

    // ── Helpers ───────────────────────────────────────────────────────────
    function addMapLabel(
      country: Country,
      group: d3.Selection<SVGGElement, unknown, null, undefined>,
      color: string,
    ) {
      if (smallIds.has(country.id)) {
        const sc = config.smallDef.find(s => s.id === country.id)
        if (!sc) return
        const [px, py] = proj([sc.lon, sc.lat]) ?? [0, 0]
        const g = d3.select<SVGGElement, unknown>(`#callout-${safeId(country.id)}`)
        g.select('line').attr('stroke', color)
        g.select('circle').attr('fill', color)
        g.append('text')
          .attr('x', px + sc.dx).attr('y', py + sc.dy)
          .attr('text-anchor', sc.dx > 0 ? 'start' : 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '7.5px').attr('font-weight', 'bold')
          .attr('font-family', 'Geist, system-ui, sans-serif')
          .attr('fill', color)
          .attr('stroke', 'rgba(0,0,0,0.8)').attr('stroke-width', '2')
          .style('paint-order', 'stroke fill')
          .attr('pointer-events', 'none')
          .text(country.name)
      } else {
        const feature = featureMap.get(country.id)
        if (!feature) return
        let cx: number, cy: number
        if (country.labelPos) {
          ;[cx, cy] = proj(country.labelPos) ?? [NaN, NaN]
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;[cx, cy] = geoPath.centroid(feature as any)
        }
        if (isNaN(cx) || isNaN(cy) || cx < 0 || cx > W || cy < 0 || cy > H) return
        group.append('text')
          .attr('x', cx).attr('y', cy)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('font-size', '8px').attr('font-weight', 'bold')
          .attr('font-family', 'Geist, system-ui, sans-serif')
          .attr('pointer-events', 'none')
          .attr('fill', color)
          .attr('stroke', 'rgba(0,0,0,0.75)').attr('stroke-width', '2.5')
          .style('paint-order', 'stroke fill')
          .text(country.name)
      }
    }

    markFoundRef.current = (country: Country) => {
      foundSetRef.current.add(country.id)
      const n = foundSetRef.current.size
      d3.select(`#${cpId(country.id)}`).classed('country-found', true)
      d3.select(`#${icpId(country.id)}`).classed('country-found', true)
      const icDataFound = config.inset?.callouts?.find(ic => ic.id === country.id)
      const iCalloutFound = d3.select(`#i-callout-${safeId(country.id)}`)
      iCalloutFound.select('line').attr('stroke', '#4ade80')
      iCalloutFound.select('circle').attr('fill', '#4ade80')
      if (icDataFound && insetProj) {
        const [px, py] = insetProj([icDataFound.lon, icDataFound.lat]) ?? [0, 0]
        iCalloutFound.append('text')
          .attr('x', px + icDataFound.dx + (icDataFound.dx > 0 ? 5 : -5))
          .attr('y', py + icDataFound.dy)
          .attr('text-anchor', icDataFound.dx > 0 ? 'start' : 'end')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '14px').attr('font-weight', '600')
          .attr('font-family', 'Geist, system-ui, sans-serif')
          .attr('fill', '#4ade80')
          .attr('stroke', 'rgba(0,0,0,0.9)').attr('stroke-width', '3')
          .style('paint-order', 'stroke fill')
          .attr('pointer-events', 'none')
          .text(country.name)
      }
      addMapLabel(country, foundLabelsG, '#4ade80')
      setScore(n)
      setFoundNames(prev => [...prev, country.name].sort((a, b) => a.localeCompare(b)))
      showFeedback(`✓ ${country.name}!`, '#4ade80')
      if (n === config.total) {
        setWon(true)
        setGameOver(true)
        gameOverRef.current = true
      }
    }

    giveUpRef.current = () => {
      if (gameOverRef.current) return
      gameOverRef.current = true
      setGameOver(true)
      const missed = config.countries
        .filter(c => !foundSetRef.current.has(c.id))
        .sort((a, b) => a.name.localeCompare(b.name))
      missed.forEach(c => {
        d3.select(`#${cpId(c.id)}`).classed('country-missed', true)
        d3.select(`#${icpId(c.id)}`).classed('country-missed', true)
        const icDataMissed = config.inset?.callouts?.find(ic => ic.id === c.id)
        const iCalloutMissed = d3.select(`#i-callout-${safeId(c.id)}`)
        iCalloutMissed.select('line').attr('stroke', '#fff')
        iCalloutMissed.select('circle').attr('fill', '#fff')
        if (icDataMissed && insetProj) {
          const [px, py] = insetProj([icDataMissed.lon, icDataMissed.lat]) ?? [0, 0]
          iCalloutMissed.append('text')
            .attr('x', px + icDataMissed.dx + (icDataMissed.dx > 0 ? 5 : -5))
            .attr('y', py + icDataMissed.dy)
            .attr('text-anchor', icDataMissed.dx > 0 ? 'start' : 'end')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '14px').attr('font-weight', '600')
            .attr('font-family', 'Geist, system-ui, sans-serif')
            .attr('fill', '#fff')
            .attr('stroke', 'rgba(0,0,0,0.9)').attr('stroke-width', '3')
            .style('paint-order', 'stroke fill')
            .attr('pointer-events', 'none')
            .text(c.name)
        }
        addMapLabel(c, missedLabelsG, '#fff')
      })
      setMissedNames(missed.map(c => c.name))
      showFeedback(`Game over! You got ${foundSetRef.current.size} / ${config.total}`, '#94a3b8')
    }

    // ── Load TopoJSON ─────────────────────────────────────────────────────
    const idSet = new Set(config.countries.map(c => c.id))
    const dataUrl = config.dataSource?.url ?? 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
    const objectName = config.dataSource?.objectName ?? 'countries'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3.json<any>(dataUrl)
      .then(world => {
        if (quizVersionRef.current !== myVersion || !world) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const features = (topojson.feature(world, world.objects[objectName]) as any).features as any[]

        // Main map paths
        const regionFeatures = features.filter(f => idSet.has(+f.id))
        regionFeatures.forEach(f => featureMap.set(+f.id, f))

        // Kosovo isn't in world-atlas; inject the hardcoded polygon if this quiz includes it
        if (idSet.has(-99)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          featureMap.set(-99, KOSOVO_FEATURE as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          regionFeatures.push(KOSOVO_FEATURE as any)
        }
        countriesG
          .selectAll('path')
          .data(regionFeatures)
          .join('path')
          .attr('class', 'country-path')
          .attr('id', (d: unknown) => cpId(+(d as { id: string }).id))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('d', geoPath as any)

        // Inset map paths
        if (config.inset && insetCountriesG && insetGeoPath) {
          const insetIdSet = new Set(config.inset.ids)
          const insetFeatures = features.filter(f => insetIdSet.has(+f.id))
          insetCountriesG
            .selectAll('path')
            .data(insetFeatures)
            .join('path')
            .attr('class', 'country-path')
            .attr('id', (d: unknown) => icpId(+(d as { id: string }).id))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('d', insetGeoPath as any)
        }
      })
      .catch(() => {/* network error */})

    const handleWheel = (e: WheelEvent) => e.preventDefault()
    svgEl.addEventListener('wheel', handleWheel, { passive: false })
    if (insetEl) insetEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      svgEl.removeEventListener('wheel', handleWheel)
      if (insetEl) insetEl.removeEventListener('wheel', handleWheel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputVal(val)
    if (!val || gameOverRef.current) return
    const c = lookupRef.current.get(val.trim().toLowerCase())
    if (c && !foundSetRef.current.has(c.id)) {
      markFoundRef.current(c)
      setInputVal('')
      setInputStatus('correct')
      setTimeout(() => setInputStatus(''), 500)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || gameOverRef.current) return
    const val = inputVal.trim().toLowerCase()
    if (!val) return
    const c = lookupRef.current.get(val)
    if (c && !foundSetRef.current.has(c.id)) {
      markFoundRef.current(c)
      setInputVal('')
      setInputStatus('correct')
      setTimeout(() => setInputStatus(''), 500)
    } else if (c) {
      setFeedback({ msg: `Already got ${c.name}!`, color: '#fbbf24' })
      setInputStatus('wrong')
      setTimeout(() => setInputStatus(''), 400)
    } else {
      const article = /^[aeiou]/i.test(config.regionLabel) ? 'an' : 'a'
      setFeedback({ msg: `Not ${article} ${config.regionLabel} ${itemNoun}. Keep trying!`, color: '#f87171' })
      setInputStatus('wrong')
      setTimeout(() => setInputStatus(''), 400)
    }
  }

  const pct = Math.round((score / config.total) * 100)
  const timerWarning = timeLeft <= 60 && started && !gameOver

  return (
    <div className="quiz-inner">
      {/* Stats + Timer */}
      <div className="quiz-stats">
        <div className="quiz-score">
          <span className="quiz-score-num">{score}</span>
          <span className="quiz-score-sep"> / </span>
          <span className="quiz-score-den">{config.total}</span>
          <span className="quiz-score-lbl">{itemNounPlural}</span>
        </div>
        <div className={`quiz-timer${timerWarning ? ' quiz-timer--warning' : ''}`}>
          {formatTime(timeLeft)}
        </div>
        <div className="quiz-prog-wrap">
          <div className="quiz-prog-bg">
            <div className="quiz-prog-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="quiz-prog-label">{pct}%</div>
        </div>
      </div>

      {/* Input / Start row */}
      {!started && !gameOver ? (
        <div className="quiz-start-row">
          <button
            className="quiz-btn quiz-btn-start"
            onClick={() => { setStarted(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          >
            Start Quiz
          </button>
        </div>
      ) : (
        <div className="quiz-input-row">
          <input
            ref={inputRef}
            className={`quiz-input ${inputStatus}`}
            type="text"
            placeholder={`Type a ${itemNoun} name…`}
            value={inputVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={gameOver}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            data-lpignore="true"
          />
          {!gameOver && (
            <button className="quiz-btn quiz-btn-giveup" onClick={() => giveUpRef.current()}>
              Give Up
            </button>
          )}
          {gameOver && (
            <button className="quiz-btn quiz-btn-restart" onClick={onRestart}>
              Restart
            </button>
          )}
        </div>
      )}

      <div className="quiz-feedback" style={{ color: feedback?.color }}>
        {feedback?.msg ?? ' '}
      </div>

      {won && <div className="quiz-win-banner">{config.winMsg}</div>}

      {gameOver && (
        <button
          className={`quiz-btn-share${copied ? ' quiz-btn-share--copied' : ''}`}
          onClick={handleShare}
        >
          {copied ? '✓ Copied to clipboard!' : '📋 Share my results'}
        </button>
      )}

      {/* Maps */}
      <div className="quiz-maps-area">
        <div className="quiz-map-wrap">
          <span className="quiz-map-hint">Pinch to zoom</span>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} />
        </div>
        {config.inset && (
          <div className="quiz-map-wrap quiz-map-inset">
            <span className="quiz-map-hint">Pinch to zoom</span>
            <span className="quiz-inset-label">{config.inset.label}</span>
            <svg ref={insetRef} viewBox={`0 0 ${IW} ${IH}`} />
          </div>
        )}
      </div>

      {/* Found / missed tags (hidden in fixed layout) */}
      {foundNames.length > 0 && (
        <div className="quiz-tags-section">
          <h3 className="quiz-tags-title">Found ({foundNames.length})</h3>
          <div className="quiz-found-tags">
            {foundNames.map(n => <span key={n} className="quiz-tag">{n}</span>)}
          </div>
        </div>
      )}
      {missedNames.length > 0 && (
        <div className="quiz-tags-section" style={{ marginTop: 16 }}>
          <h3 className="quiz-tags-title">Missed ({missedNames.length})</h3>
          <div className="quiz-missed-tags">
            {missedNames.map(n => <span key={n} className="quiz-missed-tag">{n}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page wrapper (owns tab state) ──────────────────────────────────────────

export default function CountriesQuiz() {
  const [tab, setTab] = useState<RegionKey>('europe')
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    document.title = 'Geo Study: Countries Quiz'
    return () => {
      document.title = 'James'
    }
  }, [])

  const switchTab = (r: RegionKey) => {
    setTab(r)
    setResetCount(0)
  }

  return (
    <>
      {/* Ad banners flanking the map (wide viewports only) */}
      <aside className="quiz-ad-rail quiz-ad-rail--left" aria-hidden="true">
        <AdsterraBanner />
      </aside>
      <aside className="quiz-ad-rail quiz-ad-rail--right" aria-hidden="true">
        <AdsterraBanner />
      </aside>

      <div className="quiz-page">
        <div className="quiz-header">
          <h1 className="quiz-title">Countries Quiz</h1>
          <p className="quiz-subtitle">
            Test your geography knowledge. Type each country's name to find it on the
            interactive map and see how many you can identify before the timer runs out.
          </p>
        </div>

        <div className="quiz-tabs">
          {(Object.keys(CONFIGS) as RegionKey[]).map(r => (
            <button
              key={r}
              className={`quiz-tab-btn ${tab === r ? 'active' : ''}`}
              onClick={() => switchTab(r)}
            >
              {CONFIGS[r].label}
            </button>
          ))}
        </div>

        <Quiz
          key={`${tab}-${resetCount}`}
          config={CONFIGS[tab]}
          quizKey={tab}
          onRestart={() => setResetCount(c => c + 1)}
        />
      </div>

      <section className="quiz-about">
        <h2>About Geo Study</h2>
        <p>
          Geo Study is a free interactive geography quiz that challenges you to name
          countries by region on a real world map. Whether you're prepping for a trivia
          night, brushing up before a trip, or just curious how much of the world you
          actually know, the quiz is a quick way to measure and improve your geographic
          literacy.
        </p>

        <h3>How to play</h3>
        <p>
          Pick a region tab (World, Europe, Asia, Africa, Americas, or Oceania), click
          <em> Start Quiz</em>, and start typing country names into the input box. Each
          correct answer is marked green on the map. You have ten minutes per round.
          Aliases and common alternate spellings are accepted, so "USA," "United States,"
          and "America" all work. The map supports pinch-to-zoom on touch devices and
          scroll-wheel zoom on desktop, which is handy for spotting smaller countries.
        </p>

        <h3>Tips for improving</h3>
        <p>
          The fastest way to get better is to play, give up, and then study the missed
          countries in the list shown at the end of each round. Tiny island nations and
          countries with names that don't look like their English versions (Côte d'Ivoire,
          Eswatini, Czechia) are the most commonly forgotten. Spending a minute reviewing
          a missed region before retrying makes a noticeable difference on the next run.
        </p>

        <h3>Why a country quiz?</h3>
        <p>
          Geography is one of those skills that compounds quietly. News headlines make
          more sense, travel planning gets easier, and conversations about world events
          feel less abstract. The goal of Geo Study isn't to memorize a list. It's to
          build a mental map of the world that sticks.
        </p>
      </section>
    </>
  )
}
