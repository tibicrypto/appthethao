'use client';

import React from 'react';
import styles from './SVGCharts.module.css';

interface ChartDataItem {
  label: string; // e.g. "14/06" or "CN"
  value: number;
}

interface SVGBarChartProps {
  data: ChartDataItem[];
  color?: string;
  title?: string;
  valueSuffix?: string;
}

export function SVGBarChart({ 
  data, 
  color = 'var(--color-cyan)', 
  valueSuffix = '' 
}: SVGBarChartProps) {
  const values = data.map(d => d.value);
  const maxValue = Math.max(...values, 100); // Prevent division by zero
  
  // Padding & dimension calculations
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 25;
  
  const contentWidth = chartWidth - paddingLeft - paddingRight;
  const contentHeight = chartHeight - paddingTop - paddingBottom;
  
  const barWidth = contentWidth / data.length * 0.5;
  const barSpacing = contentWidth / data.length;

  return (
    <div className={styles.chartWrapper}>
      <svg 
        viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
        className={styles.chartSvg}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + contentHeight * (1 - ratio);
          const gridVal = Math.round(maxValue * ratio);
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={chartWidth - paddingRight} 
                y2={y} 
                className={styles.gridLine}
              />
              <text 
                x={paddingLeft - 8} 
                y={y + 4} 
                fill="var(--text-muted)" 
                fontSize="10" 
                textAnchor="end"
                fontWeight="500"
              >
                {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
              </text>
            </g>
          );
        })}

        {/* Chart Bars */}
        {data.map((item, idx) => {
          const x = paddingLeft + (idx * barSpacing) + (barSpacing - barWidth) / 2;
          const valRatio = item.value / maxValue;
          const barHeight = Math.max(contentHeight * valRatio, 4); // Min height of 4px for visual indication
          const y = paddingTop + contentHeight - barHeight;

          return (
            <g key={idx}>
              {/* Invisible Background bar for better hover target */}
              <rect
                x={x - (barSpacing - barWidth) / 4}
                y={paddingTop}
                width={barSpacing - (barSpacing - barWidth) / 2}
                height={contentHeight}
                className={styles.barBackground}
                rx="4"
              />
              {/* Actual value bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                className={styles.bar}
                rx="6"
              />
              {/* Tooltip text (visible on bar hover via overlay/title) */}
              <title>{`${item.value}${valueSuffix}`}</title>
              {/* X Axis Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 6}
                className={styles.axisText}
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* X Axis base line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + contentHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + contentHeight}
          className={styles.axisLine}
        />
      </svg>
    </div>
  );
}

interface SVGLineChartProps {
  data: ChartDataItem[];
  color?: string;
  valueSuffix?: string;
}

export function SVGLineChart({
  data,
  color = 'var(--color-purple)',
  valueSuffix = ''
}: SVGLineChartProps) {
  const values = data.map(d => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 10);
  const valRange = maxVal - minVal || 10;
  
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;
  
  const contentWidth = chartWidth - paddingLeft - paddingRight;
  const contentHeight = chartHeight - paddingTop - paddingBottom;
  
  const spacing = contentWidth / (data.length - 1 || 1);

  // Generate points coordinates
  const points = data.map((item, idx) => {
    const x = paddingLeft + (idx * spacing);
    const y = paddingTop + contentHeight - ((item.value - minVal) / valRange) * contentHeight;
    return { x, y, value: item.value, label: item.label };
  });

  // Construct SVG Path String
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Area path below the line for nice gradient styling
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + contentHeight} L ${points[0].x} ${paddingTop + contentHeight} Z`
    : '';

  return (
    <div className={styles.chartWrapper}>
      <svg 
        viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
        className={styles.chartSvg}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + contentHeight * (1 - ratio);
          const gridVal = Number((minVal + valRange * ratio).toFixed(1));
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={chartWidth - paddingRight} 
                y2={y} 
                className={styles.gridLine}
              />
              <text 
                x={paddingLeft - 8} 
                y={y + 4} 
                fill="var(--text-muted)" 
                fontSize="10" 
                textAnchor="end"
                fontWeight="500"
              >
                {gridVal}
              </text>
            </g>
          );
        })}

        {/* Gradient Definition for Area */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Line Area Gradient */}
        {areaD && (
          <path 
            d={areaD} 
            fill="url(#areaGradient)" 
            className={styles.lineArea}
          />
        )}

        {/* Connection Path Line */}
        {pathD && (
          <path
            d={pathD}
            fill="transparent"
            stroke={color}
            strokeWidth="3.5"
            className={styles.line}
          />
        )}

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="var(--bg-primary)"
              stroke={color}
              className={styles.point}
            />
            <title>{`${p.value}${valueSuffix}`}</title>
            {/* Label below axis */}
            <text
              x={p.x}
              y={chartHeight - 6}
              className={styles.axisText}
            >
              {p.label}
            </text>
          </g>
        ))}

        {/* X Axis base line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + contentHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + contentHeight}
          className={styles.axisLine}
        />
      </svg>
    </div>
  );
}
