import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, SankeyChart, SunburstChart, TreemapChart } from "echarts/charts";
import { TooltipComponent, LegendComponent, GridComponent, AriaComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

// Register only what we actually use — keeps the bundle small.
echarts.use([
  BarChart, LineChart, SankeyChart, SunburstChart, TreemapChart,
  TooltipComponent, LegendComponent, GridComponent, AriaComponent,
  CanvasRenderer,
]);

interface Props {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
  /** Accessible description of the chart for screen readers. */
  ariaLabel?: string;
}

/** Thin React wrapper around an ECharts instance — no peer-dep baggage. */
export function EChart({ option, className, style, onEvents, ariaLabel }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const inst = useRef<ReturnType<typeof echarts.init> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const chart = echarts.init(el.current, undefined, { renderer: "canvas" });
    inst.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    // aria.enabled lets ECharts emit a generated description on the canvas.
    inst.current?.setOption({ aria: { enabled: true }, ...option }, true);
  }, [option]);

  useEffect(() => {
    const chart = inst.current;
    if (!chart || !onEvents) return;
    for (const [ev, fn] of Object.entries(onEvents)) chart.on(ev, fn);
    return () => {
      for (const ev of Object.keys(onEvents)) chart.off(ev);
    };
  }, [onEvents]);

  return (
    <div
      ref={el}
      className={className}
      role="img"
      aria-label={ariaLabel ?? "Diagramm"}
      style={{ width: "100%", height: 480, ...style }}
    />
  );
}
