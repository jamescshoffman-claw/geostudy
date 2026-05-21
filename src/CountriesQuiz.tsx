import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { CONFIGS, type QuizConfig, type Country, type RegionKey } from './quizData'

// ── AdSense ───────────────────────────────────────────────────────────────
// Loader is in index.html. Replace the slot IDs below with the ones AdSense
// gives you when you create the two ad units in the dashboard.
const AD_CLIENT = 'ca-pub-7665194311315691'
const AD_SLOT_LEFT = '4001990616'

function AdSlot({ slot, className }: { slot: string; className?: string }) {
  const pushed = useRef(false)
  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch { /* adsbygoogle not ready */ }
  }, [])
  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={{ display: 'block', width: '160px', height: '600px' }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
    />
  )
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
  onRestart: () => void
  onStart?: () => void
}

function Quiz({ config, onRestart, onStart }: QuizProps) {
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

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = () => {
    const elapsed = TIMER_SECONDS - timeLeft
    const timeStr = timeLeft === 0 ? 'Time ran out!' : `Finished in ${formatTime(elapsed)}`
    const resultLine = won
      ? `🎉 All ${config.total}/${config.total} countries found!`
      : `✅ ${score}/${config.total} countries found`
    const text = `Countries Quiz – ${config.label}\n${resultLine}\n⏱️ ${timeStr}`
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

    // Use rotate for longitude centering so antimeridian-crossing regions
    // (e.g. Oceania: Samoa/Tonga at -172°/-175°) project correctly.
    const proj = d3.geoMercator()
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [cx, cy] = geoPath.centroid(feature as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3.json<any>('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
      .then(world => {
        if (quizVersionRef.current !== myVersion || !world) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const features = (topojson.feature(world, world.objects.countries) as any).features as any[]

        // Main map paths
        const regionFeatures = features.filter(f => idSet.has(+f.id))
        regionFeatures.forEach(f => featureMap.set(+f.id, f))
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
      setFeedback({ msg: `Not a ${config.regionLabel} country. Keep trying!`, color: '#f87171' })
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
          <span className="quiz-score-lbl">countries</span>
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
            onClick={() => { setStarted(true); onStart?.(); setTimeout(() => inputRef.current?.focus(), 50) }}
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
            placeholder="Type a country name…"
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
  const [adsReady, setAdsReady] = useState(false)

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
      {adsReady && (
        <aside className="quiz-ad-rail quiz-ad-rail--left" aria-hidden="true">
          <AdSlot slot={AD_SLOT_LEFT} />
        </aside>
      )}
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
          onRestart={() => setResetCount(c => c + 1)}
          onStart={() => setAdsReady(true)}
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
