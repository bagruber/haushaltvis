import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

interface Props {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
}

/** Thin React wrapper around an ECharts instance — no peer-dep baggage. */
export function EChart({ option, className, style, onEvents }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

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
    inst.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const chart = inst.current;
    if (!chart || !onEvents) return;
    for (const [ev, fn] of Object.entries(onEvents)) chart.on(ev, fn);
    return () => {
      for (const ev of Object.keys(onEvents)) chart.off(ev);
    };
  }, [onEvents]);

  return <div ref={el} className={className} style={{ width: "100%", height: 480, ...style }} />;
}
