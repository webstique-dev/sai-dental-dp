import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import ChartCard from './ChartCard'
import {
  CHART_COLORS,
  CHART_PALETTE,
  AXIS_TICK,
  AXIS_LABEL,
  TOOLTIP_SX,
  LEGEND_SX,
  formatNumber,
} from '../../utils/chartTheme'

const EMPTY = []

/**
 * LineChartCard — time-series line chart.
 * props: title, subtitle, labels[], series[{name, data[], color}],
 *        loading, error, onRetry, empty, emptyText, yLabel, height, formatValue
 */
export function LineChartCard({
  title,
  subtitle,
  labels = EMPTY,
  series = EMPTY,
  loading,
  error,
  onRetry,
  empty,
  emptyText,
  yLabel = '',
  height = 280,
  formatValue,
}) {
  const hasData = labels.length > 0 && series.some((s) => s.data.some((v) => v !== 0))
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} error={error} onRetry={onRetry} empty={empty || !hasData} emptyText={emptyText}>
      <LineChart
        height={height}
        margin={{ top: 16, right: 16, bottom: 40, left: 56 }}
        xAxis={[{ scaleType: 'band', data: labels, tickLabelStyle: AXIS_TICK }]}
        yAxis={[{ label: yLabel, tickLabelStyle: AXIS_TICK, labelStyle: AXIS_LABEL, valueFormatter: (v) => formatNumber(v) }]}
        series={series.map((s) => ({
          data: s.data,
          label: s.name,
          color: s.color || CHART_COLORS.forest,
          showMark: false,
          area: false,
          curve: 'linear',
        }))}
        slotProps={{ legend: { labelStyle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 } } }}
        sx={LEGEND_SX}
        skipAnimation
      />
    </ChartCard>
  )
}

/**
 * BarChartCard — grouped/stacked bar chart.
 * props: labels[], series[{name, data[], color}], layout ('vertical'|'horizontal')
 */
export function BarChartCard({
  title,
  subtitle,
  labels = EMPTY,
  series = EMPTY,
  loading,
  error,
  onRetry,
  empty,
  emptyText,
  yLabel = '',
  xLabel = '',
  height = 280,
  formatValue,
  stacked = false,
  layout = 'vertical',
}) {
  const hasData = labels.length > 0 && series.some((s) => s.data.some((v) => v !== 0))
  const horizontal = layout === 'horizontal'
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} error={error} onRetry={onRetry} empty={empty || !hasData} emptyText={emptyText}>
      <BarChart
        height={height}
        layout={layout}
        margin={{ top: 16, right: 16, bottom: 40, left: 56 }}
        xAxis={
          horizontal
            ? [{ scaleType: 'band', data: labels, tickLabelStyle: AXIS_TICK, label: xLabel }]
            : [{ scaleType: 'band', data: labels, tickLabelStyle: AXIS_TICK, label: xLabel }]
        }
        yAxis={[{ label: yLabel, tickLabelStyle: AXIS_TICK, labelStyle: AXIS_LABEL, valueFormatter: (v) => formatNumber(v) }]}
        series={series.map((s) => ({
          data: s.data,
          label: s.name,
          color: s.color || CHART_COLORS.forest,
          stack: stacked ? 'total' : undefined,
        }))}
        slotProps={{ legend: { labelStyle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 } } }}
        sx={LEGEND_SX}
        skipAnimation
      />
    </ChartCard>
  )
}

/**
 * PieChartCard — distribution donut/pie.
 * props: data[{ id, label, value }], innerRadius
 */
export function PieChartCard({
  title,
  subtitle,
  data = EMPTY,
  loading,
  error,
  onRetry,
  empty,
  emptyText,
  height = 280,
  innerRadius = 55,
  valueLabel,
}) {
  const hasData = data.length > 0 && data.some((d) => Number(d.value) !== 0)
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} error={error} onRetry={onRetry} empty={empty || !hasData} emptyText={emptyText}>
      <PieChart
        height={height}
        margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
        series={[
          {
            data: data.map((d) => ({
              id: d.id,
              value: Number(d.value) || 0,
              label: d.label,
              color: d.color,
            })),
            innerRadius,
            outerRadius: 110,
            paddingAngle: 1.5,
            cornerRadius: 2,
            highlightScope: { faded: 'global', highlighted: 'item' },
            valueFormatter: (v) => (valueLabel ? valueLabel(v.value) : formatNumber(v.value)),
          },
        ]}
        colors={CHART_PALETTE}
        slotProps={{ legend: { labelStyle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 } } }}
        sx={LEGEND_SX}
        skipAnimation
      />
    </ChartCard>
  )
}
