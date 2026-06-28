import { useEffect, useMemo, useRef, useState } from "react";
import { hierarchy, pack, type HierarchyCircularNode } from "d3-hierarchy";
import type { TreeNode } from "@/lib/data";
import { fmtEur, fmtEurShort } from "@/lib/format";

interface Props {
  data: TreeNode[];
  height?: number;
  onThemeClick?: (id: string) => void;
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
            const showLabel = isTheme && n.r > 26;
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
                {showLabel && (
                  <text
                    x={n.x}
                    y={n.y - n.r + 14}
                    textAnchor="middle"
                    className="pointer-events-none"
                    style={{ fontSize: 12, fontWeight: 700, fill: "#1c1c1c" }}
                  >
                    {n.data.name}
                  </text>
                )}
                {!isTheme && n.r > 18 && (
                  <text
                    x={n.x}
                    y={n.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none"
                    style={{ fontSize: 10, fill: "#1c1c1c" }}
                  >
                    {n.r > 34 ? n.data.name.split(" ")[0] : ""}
                  </text>
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
