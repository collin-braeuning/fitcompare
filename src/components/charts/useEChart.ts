import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'

/**
 * Bridges ECharts' imperative lifecycle into React's declarative one.
 *
 * Callers describe *what* the chart should show (a memoised option object) and
 * this hook handles create / update / resize / dispose. Every chart used to
 * repeat that boilerplate, and two of the three leaked their instance or their
 * resize listener.
 *
 * The instance is exposed as state rather than a ref so that effects needing it
 * (event subscriptions, imperative actions) can list it as a dependency and
 * re-run correctly when the chart is recreated.
 *
 * @param option Re-applied whenever its identity changes — memoise it with
 *   `useMemo`, or the chart will redraw on every render. `null` skips drawing.
 */
export function useEChart(option: echarts.EChartsOption | null) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chart, setChart] = useState<echarts.ECharts | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const instance = echarts.init(container, 'dark')
    setChart(instance)

    // ResizeObserver rather than a window listener: the chart also needs to
    // resize when its card changes size without the window doing so.
    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      instance.dispose()
      setChart(null)
    }
  }, [])

  useEffect(() => {
    // `notMerge: true` — the option is a complete description of the chart, so
    // a rebuild must not inherit series left over from the previous data set.
    if (chart && option) chart.setOption(option, true)
  }, [chart, option])

  return { containerRef, chart }
}
