'use client';

import Image from 'next/image';
import { ReactNode } from 'react';
import { RunNodeId, RunState } from '@/lib/roguelike/run-types';

interface Props {
  state: RunState;
  selectableNodes: Set<RunNodeId>;
  onSelect: (nodeId: RunNodeId) => void;
}

interface LayoutNode {
  id: RunNodeId;
  column: number;
  row: number;
  type: string;
  isStart: boolean;
  isBoss: boolean;
}

function nodeImage(type: string) {
  return `/images/map/node-${type}.png`;
}

function nodeColor(type: string) {
  if (type === 'boss') return 'ring-amber-400/80';
  if (type === 'elite') return 'ring-purple-400/80';
  if (type === 'event') return 'ring-emerald-400/80';
  if (type === 'shop') return 'ring-sky-400/80';
  if (type === 'rest') return 'ring-pink-400/80';
  return 'ring-blue-400/60';
}

export default function RunMap({ state, selectableNodes, onSelect }: Props) {
  if (!state.map) {
    return <div className="text-gray-300">맵 데이터가 없습니다.</div>;
  }

  const map = state.map;
  const columns = Array.from({ length: map.columns }, (_, column) => {
    const items = map.nodes.filter((node) => node.column === column);
    const maxRow = Math.max(...items.map((node) => node.row), 0);
    const layout: LayoutNode[] = items.map((node) => ({
      id: node.id,
      column: node.column,
      row: node.row,
      type: node.type,
      isStart: node.id === map.startNodeId,
      isBoss: node.id === map.bossNodeId,
    }));
    for (let row = 0; row <= maxRow; row++) {
      if (!layout.some((item) => item.row === row)) {
        layout.push({ id: `empty-${column}-${row}`, column, row, type: 'empty', isStart: false, isBoss: false });
      }
    }
    return layout.sort((a, b) => a.row - b.row);
  });

  const visited = new Set(state.visitedNodes);
  const isCurrent = (nodeId: RunNodeId) => nodeId === state.currentNodeId;
  const isVisited = (nodeId: RunNodeId) => visited.has(nodeId);

  const mapRows = columns[0]?.at(-1)?.row ? columns[0].length : 3;
  const rowHeight = 130;
  const boardHeight = Math.max(320, mapRows * rowHeight);

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex items-start gap-3 px-2 py-3">
        {columns.map((nodes, colIdx) => (
          <div
            key={colIdx}
            className="relative rounded-xl border border-white/10 bg-black/30 p-2"
            style={{ width: 96, minHeight: boardHeight }}
          >
            <div className="text-center text-xs font-bold text-gray-300 mb-2">열 {colIdx + 1}</div>
            {nodes.map((node) => {
              if (node.type === 'empty') {
                return (
                  <div key={node.id} style={{ height: rowHeight - 14 }} />
                );
              }
              const active = selectableNodes.has(node.id);
              const reached = isVisited(node.id);
              const current = isCurrent(node.id);
              const locked = !active && !reached;
              const classes = [
                'relative transition-all rounded-lg overflow-hidden border',
                node.isBoss ? 'ring-2 ring-amber-300/80' : 'ring-1',
                active ? 'ring-2 ring-emerald-300/90 cursor-pointer scale-100 active:scale-95' : 'opacity-80',
                current ? 'ring-yellow-300/90' : '',
                reached ? 'bg-black/20' : 'bg-black/45',
                locked ? '' : 'ring',
              ].join(' ');

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => active && onSelect(node.id)}
                  className={`${classes} mb-3 flex w-full items-center justify-center ${nodeColor(node.type)} ${active ? 'hover:scale-105' : 'cursor-default'}`}
                  style={{ height: 92 }}
                  disabled={!active}
                  aria-label={`${node.type} 노드 선택`}
                >
                  <div className="absolute inset-0">
                    <Image
                      src={nodeImage(node.type)}
                      alt={node.type}
                      fill
                      sizes="90px"
                      className={`object-cover ${current ? 'brightness-110' : ''}`}
                    />
                    {current && <div className="absolute inset-0 animate-pulse bg-yellow-500/20" />}
                    {reached && !current && <div className="absolute inset-0 bg-black/30" />}
                  </div>
                  <div className="absolute bottom-1 left-1 text-[10px] bg-black/70 px-1 rounded text-white">
                    {node.type}
                  </div>
                  {!active && !reached && <div className="absolute inset-0 bg-black/60" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
