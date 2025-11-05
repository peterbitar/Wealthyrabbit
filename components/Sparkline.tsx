'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data?: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function Sparkline({
  data = [],
  color = '#10b981',
  width = 60,
  height = 24,
  className = ''
}: SparklineProps) {
  // If no data, generate a simple trend line
  const chartData = data.length > 0
    ? data.map((value, index) => ({ value, index }))
    : [
        { value: 10, index: 0 },
        { value: 15, index: 1 },
        { value: 12, index: 2 },
        { value: 18, index: 3 },
        { value: 20, index: 4 },
      ];

  return (
    <div className={`inline-block ${className}`} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
