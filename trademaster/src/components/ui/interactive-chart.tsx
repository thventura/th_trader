import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'

const useElementSize = <T extends HTMLElement>(): [React.RefObject<T>, { width: number; height: number }] => {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    update()
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      ro.observe(node)
    } else {
      window.addEventListener('resize', update)
    }
    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', update)
    }
  }, [])

  return [ref, size]
}

interface InteractiveChartProps {
  data: number[]
  positive: boolean
  className?: string
  height?: number
  tooltipLabel?: string
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  positive,
  className,
  height: desiredHeight = 160,
  tooltipLabel = 'Valor',
}) => {
  const [containerRef, { width }] = useElementSize<HTMLDivElement>()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [isPointer, setIsPointer] = useState(false)

  const padding = { top: 16, right: 12, bottom: 20, left: 40 }
  const innerW = Math.max(0, width - padding.left - padding.right)
  const innerH = Math.max(0, desiredHeight - padding.top - padding.bottom)

  const minV = data.length > 0 ? Math.min(...data) : 0
  const maxV = data.length > 0 ? Math.max(...data) : 1
  const range = maxV - minV || 1

  const xFor = (i: number) => (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW)
  const yFor = (v: number) => innerH - ((v - minV) / range) * innerH

  const points = data.map((v, i) => [xFor(i), yFor(v)] as const)

  const dPath = useMemo(() => {
    if (!points.length) return ''
    return points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ')
  }, [innerW, innerH, JSON.stringify(data)])

  const gridLines = 3
  const gridYVals = Array.from({ length: gridLines + 1 }, (_, i) => minV + (i * range) / gridLines)

  const handlePointer = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clientX - rect.left - padding.left
    if (x < 0 || x > innerW) { setHoverIdx(null); return }
    const ratio = x / innerW
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1))))
    setHoverIdx(idx)
  }, [innerW, padding.left, data.length])

  const lineColor = positive ? '#22c55e' : '#ef4444'
  const gradId = `perf-grad-${positive ? 'pos' : 'neg'}`

  if (data.length === 0) {
    return (
      <div ref={containerRef} className={`relative w-full flex items-center justify-center ${className ?? ''}`} style={{ height: desiredHeight }}>
        <span className="text-[10px] text-slate-600">Sem dados</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full cursor-crosshair ${className ?? ''}`}
      style={{ height: desiredHeight }}
      onMouseMove={e => { setIsPointer(true); handlePointer(e.clientX) }}
      onMouseLeave={() => { setIsPointer(false); setHoverIdx(null) }}
      onTouchStart={e => { setIsPointer(true); if (e.touches[0]) handlePointer(e.touches[0].clientX) }}
      onTouchMove={e => { if (e.touches[0]) handlePointer(e.touches[0].clientX) }}
      onTouchEnd={() => { setIsPointer(false); setHoverIdx(null) }}
    >
      <svg width={width} height={desiredHeight} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
            <stop offset="55%" stopColor={lineColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>
          <filter id="chart-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${padding.left},${padding.top})`}>
          {gridYVals.map((gy, i) => {
            const y = yFor(gy)
            return (
              <g key={i}>
                <line
                  x1={0} y1={y} x2={innerW} y2={y}
                  stroke="rgba(148,163,184,0.15)"
                  strokeDasharray="2 5"
                  strokeWidth="1"
                />
                {i % 2 === 0 && (
                  <text
                    x={-6} y={y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fill="rgba(148,163,184,0.5)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {Math.abs(gy) < 0.01 ? gy.toFixed(2) : Number.isInteger(gy) ? gy : gy.toFixed(1)}
                  </text>
                )}
              </g>
            )
          })}

          {points.length > 1 && (
            <path
              d={`${dPath} L ${innerW} ${innerH} L 0 ${innerH} Z`}
              fill={`url(#${gradId})`}
              stroke="none"
            />
          )}

          <path
            d={dPath}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            filter="url(#chart-glow)"
          />

          {isPointer && hoverIdx !== null && points[hoverIdx] && (
            <>
              <line
                x1={points[hoverIdx][0]} y1={0}
                x2={points[hoverIdx][0]} y2={innerH}
                stroke="rgba(99,179,237,0.6)"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <circle
                cx={points[hoverIdx][0]}
                cy={points[hoverIdx][1]}
                r={5}
                fill="#0f172a"
                stroke={lineColor}
                strokeWidth={2.5}
                filter="url(#chart-glow)"
              />
            </>
          )}
        </g>
      </svg>

      {isPointer && hoverIdx !== null && points[hoverIdx] && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute pointer-events-none rounded-lg border border-slate-700/60 bg-slate-900/95 backdrop-blur-sm px-2.5 py-1.5 text-xs shadow-xl"
          style={{
            top: Math.max(8, padding.top + (points[hoverIdx]?.[1] ?? 0) - 44),
            left: Math.min(
              Math.max(padding.left + (points[hoverIdx]?.[0] ?? 0) - 55, 4),
              (width || 0) - 116
            ),
            width: 110,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">{tooltipLabel}</span>
            <span className="font-bold text-white tabular-nums">
              {data[hoverIdx] >= 0 ? '+' : ''}{typeof data[hoverIdx] === 'number' ? data[hoverIdx].toFixed(0) : data[hoverIdx]}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-slate-500">Sinal</span>
            <span className="text-slate-300">{hoverIdx + 1}/{data.length}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default InteractiveChart
