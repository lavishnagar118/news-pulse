import React from 'react';
import { formatDateTime, formatDate } from '@/lib/formatters';

interface TimelineAxisProps {
  minTime: number;
  maxTime: number;
  tickCount?: number;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  minTime,
  maxTime,
  tickCount = 6,
}) => {
  const duration = maxTime - minTime;
  if (duration <= 0) return null;

  const ticks: { time: number; percent: number; label: string }[] = [];
  const step = duration / (tickCount - 1);

  for (let i = 0; i < tickCount; i++) {
    const time = minTime + i * step;
    const percent = (i / (tickCount - 1)) * 100;
    ticks.push({
      time,
      percent,
      label: formatDateTime(new Date(time).toISOString()),
    });
  }

  return (
    <div className="relative w-full h-8 border-b border-gray-200 select-none">
      {ticks.map((tick, idx) => (
        <div
          key={idx}
          className="absolute top-0 flex flex-col items-center -translate-x-1/2"
          style={{ left: `${tick.percent}%` }}
        >
          <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
            {tick.label}
          </span>
          <div className="w-px h-2 bg-gray-300 mt-1" />
        </div>
      ))}
    </div>
  );
};
