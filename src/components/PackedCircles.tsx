import { useEffect, useMemo, useRef, useState } from "react";
import { hierarchy, pack, type HierarchyCircularNode } from "d3-hierarchy";
import type { TreeNode } from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

interface Props {
  data: TreeNode[];
  height?: number;
  onThemeClick?: (id: string) => void;
}

/** Label on a soft cream chip, matching the Moosburg card style. */
function ChipLabel({ x, y, text, bold }: { x: number; y: number; text: string; bold?: boolean }) {
  const fs = bold ? 12 : 10;
  const w = text.length * fs * 0.56 + 10;
  const h = fs + 6;
  return (
    <g className="pointer-events-none">
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={4}
        fill="#faf7f2"
        fillOpacity={0.9}
        stroke="#e4e0d7"
        strokeWidth={0.5}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: fs, fontWeight: bold ? 700 : 500, fill: "#1c1c1c" }}
      >
        {text}
      </text>
    </g>
  );
}

/** Circle-packing view of the Theme → Abschnitt hierarchy (area = amount). */
export function PackedCircles({ data, height = 560, onThemeClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<{ key: string; name: string; value: number } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const root = useMemo(() => {
    if (!w) return null;
    const h = hierarchy<TreeNode>({ name: "root", value: 0, children: data } as TreeNode, (d) => d.children)
      .sum((d) => (d.children && d.children.length ? 0 : d.value))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return pack<TreeNode>().size([w, height]).padding(4)(h);
  }, [data, w, height]);

  const themeId = (n: HierarchyCircularNode<TreeNode>): string | undefined => {
    let cur: HierarchyCircularNode<TreeNode> | null = n;
    while (cur && cur.depth > 1) cur = cur.parent;
    return cur?.data.id;
  };

  return (
    <div ref={ref} style={{ width: "100%" }}>
      {root && (
        <svg width={w} height={height} role="img">
          {root.descendants().filter((n) => n.depth > 0).map((n, i) => {
            const isTheme = n.depth === 1;
            const color = n.data.itemStyle?.color ?? "#ccc";
            const id = themeId(n);
            const key = `${n.data.name}-${i}`;
            const short = n.data.name.length > 18 ? n.data.name.split(/[ ,]/)[0] : n.data.name;
            return (
              <g
                key={key}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ key, name: n.data.name, value: n.value ?? 0 })}
                onMouseLeave={() => setHover((h) => (h?.key === key ? null : h))}
                onClick={() => id && onThemeClick?.(id)}
              >
                <title>{`${n.data.name}\n${fmtEur(n.value ?? 0)}`}</title>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={color}
                  fillOpacity={isTheme ? 0.15 : 0.92}
                  stroke={color}
                  strokeWidth={isTheme ? 1.5 : 0}
                  strokeOpacity={hover?.key === key ? 1 : 0.6}
                />
                {isTheme && n.r > 30 && (
                  <ChipLabel x={n.x} y={n.y - n.r + 12} text={short} bold />
                )}
                {!isTheme && n.r > 22 && (
                  <ChipLabel x={n.x} y={n.y} text={n.r > 46 ? n.data.name : short} />
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover && (
        <p className="text-xs text-ink-muted mt-1">
          {hover.name}: {fmtEurShort(hover.value)}
        </p>
      )}
    </div>
  );
}
