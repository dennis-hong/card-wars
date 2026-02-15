'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RunNodeId, RunState } from '@/lib/roguelike/run-types';

interface Props {
  state: RunState;
  selectableNodes: Set<RunNodeId>;
  onSelect: (nodeId: RunNodeId) => void;
}

interface PositionedNode {
  id: RunNodeId;
  type: string;
  x: number;
  y: number;
  floorIndex: number;
}

interface PathData {
  d: string;
  stroke: string;
  width: number;
  style: 'default' | 'active' | 'visited';
}

const FLOOR_SPACING = 112;
const TOP_PADDING = 44;
const BOTTOM_PADDING = 88;
const SIDE_OFFSET = 72;
const DEFAULT_WIDTH = 720;

const NODE_LABELS: Record<string, string> = {
  battle: '전투',
  elite: '엘리트',
  event: '이벤트',
  shop: '상점',
  rest: '휴식',
  boss: '보스',
};

function nodeImage(type: string) {
  return `/images/map/node-${type}.png`;
}

function nodeRingClass(type: string) {
  if (type === 'boss') return 'border-amber-300/90';
  if (type === 'elite') return 'border-purple-400/90';
  if (type === 'event') return 'border-emerald-400/80';
  if (type === 'shop') return 'border-amber-300/75';
  if (type === 'rest') return 'border-pink-300/80';
  return 'border-blue-400/80';
}

function getCurrentFloorIndex(typeMap: RunState['map'], currentNodeId: RunState['currentNodeId']) {
  if (!typeMap || !currentNodeId) return null;
  const node = typeMap.nodes.find((item) => item.id === currentNodeId);
  return node ? node.column : null;
}

export default function RunMap({ state, selectableNodes, onSelect }: Props) {
  if (!state.map) {
    return <div className="text-gray-300">맵 데이터가 없습니다.</div>;
  }

  const map = state.map;
  const mapRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(DEFAULT_WIDTH);

  const visited = new Set(state.visitedNodes);
  const currentFloorIndex = useMemo(
    () => getCurrentFloorIndex(map, state.currentNodeId),
    [map, state.currentNodeId],
  );

  const isCurrent = (nodeId: RunNodeId) => nodeId === state.currentNodeId;
  const isVisited = (nodeId: RunNodeId) => visited.has(nodeId);

  const floorNodes = useMemo(() => {
    return Array.from({ length: map.columns }, (_, floor) =>
      map.nodes.filter((node) => node.column === floor).sort((a, b) => a.row - b.row),
    );
  }, [map.columns, map.nodes]);

  const floorLayout = useMemo(() => {
    const width = Math.max(320, contentWidth);
    return floorNodes.map((nodes, floorIndex) => {
      const rowY = TOP_PADDING + (map.columns - 1 - floorIndex) * FLOOR_SPACING;
      return nodes.map((node, index) => {
        const x = nodes.length <= 1 ? width / 2 : SIDE_OFFSET + ((index + 1) / (nodes.length + 1)) * (width - SIDE_OFFSET * 2);
        return {
          id: node.id,
          type: node.type,
          x,
          y: rowY,
          floorIndex,
        } satisfies PositionedNode;
      });
    });
  }, [floorNodes, contentWidth, map.columns]);

  const nodeLookup = useMemo(() => {
    const mapNode = new Map<RunNodeId, PositionedNode>();
    for (const nodes of floorLayout) {
      for (const node of nodes) {
        mapNode.set(node.id, node);
      }
    }
    return mapNode;
  }, [floorLayout]);

  const paths = useMemo<PathData[]>(() => {
    return map.edges
      .map((edge) => {
        const from = nodeLookup.get(edge.from);
        const to = nodeLookup.get(edge.to);
        if (!from || !to) return null;

        const activePath = selectableNodes.has(edge.to) || selectableNodes.has(edge.from);
        const visitedPath = isVisited(edge.from) && isVisited(edge.to);

        const style: PathData['style'] = activePath ? 'active' : visitedPath ? 'visited' : 'default';

        const stroke =
          style === 'active'
            ? 'rgba(250, 204, 21, 0.95)'
            : style === 'visited'
              ? isVisited(edge.to)
                ? 'rgba(52, 211, 153, 0.95)'
                : 'rgba(148, 163, 184, 0.45)'
              : 'rgba(148, 163, 184, 0.35)';

        const width = style === 'active' ? 3.2 : 2.3;
        const curve = Math.min(72, FLOOR_SPACING * 0.35);
        const d = `M ${from.x} ${from.y} C ${from.x} ${from.y - curve}, ${to.x} ${to.y + curve}, ${to.x} ${to.y}`;

        return { d, stroke, width, style };
      })
      .filter((item): item is PathData => item !== null);
  }, [map.edges, nodeLookup, isVisited, selectableNodes]);

  const mapHeight = Math.max(420, TOP_PADDING + (map.columns - 1) * FLOOR_SPACING + BOTTOM_PADDING);

  useEffect(() => {
    const onResize = () => {
      if (mapRef.current) {
        setContentWidth(mapRef.current.clientWidth);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!mapRef.current || currentFloorIndex === null) {
      if (mapRef.current && currentFloorIndex === null) {
        mapRef.current.scrollTop = mapRef.current.scrollHeight;
      }
      return;
    }
    const currentY = TOP_PADDING + (map.columns - 1 - currentFloorIndex) * FLOOR_SPACING;
    const target = Math.max(0, currentY - 240);
    mapRef.current.scrollTo({ top: target, behavior: 'smooth' });
  }, [currentFloorIndex, map.columns]);

  return (
    <div
      ref={mapRef}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-gray-950"
      style={{
        backgroundImage:
          'radial-gradient(circle at 24% 20%, rgba(127, 29, 29, 0.22), transparent 44%), radial-gradient(circle at 76% 70%, rgba(120, 35, 35, 0.2), transparent 46%), repeating-linear-gradient(45deg, rgba(255,255,255,0.015), rgba(255,255,255,0.015) 1px, transparent 1px, transparent 8px)',
      }}
    >
      <div className="relative w-full" style={{ height: mapHeight }}>
        <svg
          className="pointer-events-none absolute inset-0 z-10"
          width={Math.max(contentWidth, 320)}
          height={mapHeight}
          viewBox={`0 0 ${Math.max(contentWidth, 320)} ${mapHeight}`}
          preserveAspectRatio="none"
        >
          {paths.map((path, idx) => (
            <path
              key={`path-${idx}`}
              d={path.d}
              fill="none"
              stroke={path.stroke}
              strokeWidth={path.width}
              strokeDasharray={
                path.style === 'active' ? '4 6' : path.style === 'visited' ? '6 8' : '8 10'
              }
              strokeLinecap="round"
            />
          ))}
        </svg>

        {floorLayout.map((nodes, floorIndex) => {
          const floorY = TOP_PADDING + (map.columns - 1 - floorIndex) * FLOOR_SPACING;
          const floorNumber = floorIndex + 1;
          const dimmedFloor = currentFloorIndex !== null && floorIndex < currentFloorIndex;

          return (
            <div key={`floor-${floorIndex}`}>
              <div
                className={`pointer-events-none absolute left-2 top-0 -translate-y-1/2 text-[11px] ${dimmedFloor ? 'text-gray-600' : 'text-gray-300'} ${floorIndex === currentFloorIndex ? 'text-amber-200' : ''}`}
                style={{ top: floorY }}
              >
                {floorNumber}
              </div>

              {nodes.map((node) => {
                const isSelectable = selectableNodes.has(node.id);
                const reached = isVisited(node.id);
                const current = isCurrent(node.id);
                const isBoss = map.bossNodeId === node.id || node.type === 'boss';
                const isLocked = !isSelectable && !reached && !current;
                const nodeSize = isBoss ? 80 : 58;
                const nodeDimmed = dimmedFloor && !current;
                const lockedDim = isLocked || nodeDimmed;
                const glowClass = isSelectable
                  ? 'border-emerald-300/90 bg-emerald-300/15'
                  : 'bg-white/0';

                return (
                  <button
                    key={node.id}
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => isSelectable && onSelect(node.id)}
                    aria-label={`${node.type} 노드 선택`}
                    className={`group absolute z-20 flex touch-manipulation flex-col items-center justify-center transition-transform ${isSelectable ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ left: node.x, top: floorY, width: nodeSize, height: nodeSize, transform: 'translate(-50%, -50%)' }}
                  >
                    <span
                      className={`pointer-events-none absolute inset-0 rounded-full border-2 ${nodeRingClass(node.type)} ${current ? 'border-yellow-200/95 shadow-[0_0_24px_rgba(250,204,21,0.8)]' : ''} ${lockedDim ? 'opacity-45' : ''} ${isBoss ? 'border-amber-200/95 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : ''}`}
                    />

                    {isSelectable && (
                      <span
                        className={`pointer-events-none absolute -inset-2 rounded-full border-2 ${glowClass} animate-ping`}
                      />
                    )}

                    {current && (
                      <span className="pointer-events-none absolute -inset-3 rounded-full border-2 border-yellow-200/90 shadow-[0_0_22px_rgba(250,204,21,0.9)]" />
                    )}

                    <span className="relative block h-full w-full overflow-hidden rounded-full">
                      <Image
                        src={nodeImage(node.type)}
                        alt={node.type}
                        fill
                        sizes={`${nodeSize}px`}
                        className={`object-cover ${lockedDim ? 'opacity-45' : ''} ${current ? 'scale-105' : ''}`}
                      />
                    </span>

                    {node.type === 'elite' && (
                      <span className="pointer-events-none absolute -top-1 -right-1 text-xs text-purple-200">☠</span>
                    )}

                    {reached && (
                      <span className="pointer-events-none absolute top-[-2px] right-[-2px] flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/85 text-xs font-black text-black shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                        ✓
                      </span>
                    )}

                    {nodeDimmed && (
                      <span className="pointer-events-none absolute inset-0 rounded-full bg-black/35" />
                    )}
                  </button>
                );
              })}

              {nodes.map((node) => (
                <div
                  key={`label-${node.id}`}
                  className="absolute -bottom-7 w-20 text-center text-[11px] font-medium text-gray-200"
                  style={{
                    left: node.x - 40,
                    top: floorY + (node.id === map.bossNodeId || node.type === 'boss' ? 44 : 36),
                  }}
                >
                  {NODE_LABELS[node.type] ?? node.type}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
