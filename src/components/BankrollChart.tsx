'use client';

interface BankrollChartProps {
  history: { date: string; balance: number }[];
  height?: number;
}

export default function BankrollChart({ history, height = 200 }: BankrollChartProps) {
  if (history.length < 2) return null;

  const balances = history.map((h) => h.balance);
  const min = Math.min(...balances) * 0.9;
  const max = Math.max(...balances) * 1.1;
  const range = max - min || 1;

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = history.map((h, i) => {
    const x = padding.left + (i / (history.length - 1)) * chartW;
    const y = padding.top + chartH - ((h.balance - min) / range) * chartH;
    return { x, y, ...h };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const startBalance = history[0].balance;
  const endBalance = history[history.length - 1].balance;
  const isProfit = endBalance >= startBalance;
  const strokeColor = isProfit ? '#E8A838' : '#EF4444';
  const fillColor = isProfit ? 'rgba(232, 168, 56, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines }, (_, i) => min + (range * i) / (gridLines - 1));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 300 }}>
        {gridValues.map((val) => {
          const y = padding.top + chartH - ((val - min) / range) * chartH;
          return (
            <g key={val}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#2d2d50"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize={10}>
                ${val.toFixed(0)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={fillColor} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={strokeColor} stroke="#0f0f23" strokeWidth={2} />
        ))}

        {points.filter((_, i) => i === 0 || i === points.length - 1 || i % 2 === 0).map((p) => (
          <text key={p.date} x={p.x} y={height - 5} textAnchor="middle" fill="#64748b" fontSize={9}>
            {new Date(p.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </text>
        ))}

        <line
          x1={padding.left}
          y1={padding.top + chartH - ((startBalance - min) / range) * chartH}
          x2={width - padding.right}
          y2={padding.top + chartH - ((startBalance - min) / range) * chartH}
          stroke="#4A9EE8"
          strokeDasharray="6 3"
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    </div>
  );
}
