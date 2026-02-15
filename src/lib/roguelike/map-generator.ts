import { Lane } from '@/types/game';
import {
  RunAct,
  RoguelikeMap,
  RoguelikeMapEdge,
  RoguelikeMapNode,
  RunNodeId,
  RunNodeType,
} from '@/lib/roguelike/run-types';
import { getEnemyTemplate } from '@/lib/roguelike/enemy-generator';
import { pickRandomEvent } from '@/lib/roguelike/events';

const ACT_COLUMNS: Record<RunAct, number> = {
  1: 8,
  2: 9,
  3: 10,
};

const ROW_OPTIONS: ReadonlyArray<2 | 3> = [2, 3];

type RowCount = typeof ROW_OPTIONS[number];

function randomPick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('빈 배열에서 랜덤 선택 불가');
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(Math.random() * maxExclusive);
}

function laneFromRow(row: number): Lane {
  return (['front', 'mid', 'back'][row] as Lane) ?? 'back';
}

function makeNode(
  act: RunAct,
  column: number,
  row: number,
  type: RunNodeType
): RoguelikeMapNode {
  return {
    id: `act-${act}-c${column}-r${row}-${Math.random().toString(36).slice(2, 10)}`,
    act,
    column,
    row,
    type,
    visited: false,
  };
}

function generateRowCount(columns: number): RowCount[] {
  return Array.from({ length: columns }, () => randomPick(ROW_OPTIONS));
}

function pickPathRows(rowCounts: RowCount[]): number[] {
  const pathRows: number[] = [];
  for (let col = 0; col < rowCounts.length; col++) {
    const rows = rowCounts[col];
    if (col === 0) {
      pathRows.push(randomInt(rows));
      continue;
    }
    if (col === rowCounts.length - 1) {
      const min = Math.max(0, pathRows[pathRows.length - 1] - 1);
      const max = Math.min(rows - 1, pathRows[pathRows.length - 1] + 1);
      pathRows.push(randomInt(max - min + 1) + min);
      continue;
    }
    const prev = pathRows[pathRows.length - 1];
    const candidates = [prev];
    if (prev > 0) candidates.push(prev - 1);
    if (prev < rows - 1) candidates.push(prev + 1);
    pathRows.push(randomPick(candidates));
  }
  return pathRows;
}

function countByType(act: RunAct, type: RunNodeType): number {
  switch (type) {
    case 'shop':
      return act === 3 ? 1 : (Math.random() < 0.65 ? 1 : 2);
    case 'rest':
      return 1;
    case 'elite':
      if (act === 1) return Math.random() < 0.6 ? 1 : 2;
      if (act === 2) return 2;
      return 3;
    default:
      return 0;
  }
}

export function generateActMap(act: RunAct): RoguelikeMap {
  const columns = ACT_COLUMNS[act] ?? 8;
  const rowCounts = generateRowCount(columns);
  const columnNodes: RoguelikeMapNode[][] = [];

  for (let col = 0; col < columns; col++) {
    const rowCount = rowCounts[col];
    const nodes: RoguelikeMapNode[] = [];
    for (let row = 0; row < rowCount; row++) {
      nodes.push(makeNode(act, col, row, 'battle'));
    }
    columnNodes.push(nodes);
  }

  const pathRows = pickPathRows(rowCounts);
  const pathNodes = new Set<string>([
    ...pathRows.map((row, col) => `${col}-${row}`),
  ]);

  // Required starts
  columnNodes[0][pathRows[0]] = {
    ...columnNodes[0][pathRows[0]],
    type: 'battle',
  };
  columnNodes[columns - 1][pathRows[columns - 1]] = {
    ...columnNodes[columns - 1][pathRows[columns - 1]],
    type: 'boss',
  };

  // Ensure minimum special nodes
  const targets = {
    shop: countByType(act, 'shop'),
    rest: countByType(act, 'rest'),
    elite: countByType(act, 'elite'),
  };

  const candidatesByType = Object.entries(targets) as Array<[RunNodeType, number]>;

  for (const [type, need] of candidatesByType) {
    let remaining = need;
    const attempts = Array.from({ length: columns * 2 });
    let i = 0;
    while (remaining > 0 && i < attempts.length) {
      const col = 1 + randomInt(columns - 2);
      const row = randomInt(rowCounts[col]);
      const idx = `${col}-${row}`;
      const node = columnNodes[col][row];
      const isPath = pathNodes.has(idx);
      if (!node) {
        i += 1;
        continue;
      }
      if (isPath) {
        i += 1;
        continue;
      }

      if (node.type === 'battle') {
        node.type = type;
        remaining -= 1;
      }
      i += 1;
    }
  }

  // Add a few random events in remaining space
  for (let col = 1; col < columns - 1; col++) {
    for (const node of columnNodes[col]) {
      if (node.type !== 'battle') continue;
      if (Math.random() < 0.22) {
        node.type = 'event';
      }
    }
  }

  // Build edges with min1 max2 outgoing per node
  const edges: RoguelikeMapEdge[] = [];
  const edgeSet = new Set<string>();

  for (let col = 0; col < columns - 1; col++) {
    const fromNodes = columnNodes[col];
    const toRows = rowCounts[col + 1];
    const toNodes = columnNodes[col + 1];
    for (let row = 0; row < fromNodes.length; row++) {
      const from = fromNodes[row];
      const targets = new Set<number>([]);
      const forcedTo = Math.max(0, Math.min(toRows - 1, pathRows[col + 1]));
      targets.add(forcedTo);

      const addCount = 1 + randomInt(2); // 1~2
      while (targets.size < addCount) {
        let candidate = randomInt(toRows);
        if (toRows > 1 && Math.random() < 0.7) {
          const dx = randomInt(3) - 1;
          const prefer = Math.max(0, Math.min(toRows - 1, row + dx));
          candidate = prefer;
        }
        targets.add(candidate);
      }

      for (const targetRow of targets) {
        const toNode = toNodes[targetRow];
        if (!toNode) continue;
        const key = `${from.id}->${toNode.id}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ from: from.id, to: toNode.id });
      }
    }
  }

  // Ensure every node in column >0 has at least one incoming path.
  for (let col = 1; col < columns; col++) {
    const inCount = new Map<RunNodeId, number>();
    for (const edge of edges) {
      if (edge.to && fromColumnFromId(edge.from) === col - 1) {
        inCount.set(edge.to, (inCount.get(edge.to) || 0) + 1);
      }
    }

    for (const node of columnNodes[col]) {
      const incoming = inCount.get(node.id) || 0;
      if (incoming > 0) continue;
      const prev = columnNodes[col - 1];
      const from = randomPick(prev);
      const key = `${from.id}->${node.id}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: from.id, to: node.id });
      }
    }
  }

  const nodes = columnNodes.flat();
  const bossNodeId = columnNodes[columns - 1][pathRows[columns - 1]]?.id ?? columnNodes[columns - 1][0].id;

  // Virtual start node — connects to all column-0 nodes so the player picks their first node
  const startNodeId = '__start__';
  for (const node of columnNodes[0]) {
    edges.push({ from: startNodeId, to: node.id });
  }

  return {
    act,
    columns,
    nodes,
    edges,
    startNodeId,
    bossNodeId,
  };
}

export function attachEncounterData(map: RoguelikeMap): RoguelikeMap {
  const nodes = map.nodes.map((node) => {
    const next = { ...node };

    if (next.type === 'battle' || next.type === 'elite' || next.type === 'boss') {
      next.enemy = getEnemyTemplate(next.act, next.type);
      return next;
    }

    if (next.type === 'event') {
      const event = pickRandomEvent();
      next.eventId = event.id;
    }

    return next;
  });

  return {
    ...map,
    nodes,
  };
}

function fromColumnFromId(nodeId: string): number {
  const match = nodeId.match(/c(\d+)-/);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

export function getNodeById(map: RoguelikeMap | null, nodeId: string): RoguelikeMapNode | undefined {
  if (!map) return undefined;
  return map.nodes.find((n) => n.id === nodeId);
}

export function getReachableNodes(map: RoguelikeMap | null, currentNodeId: string | null): Set<RunNodeId> {
  if (!map || !currentNodeId) return new Set();
  const reachable = new Set<RunNodeId>();
  for (const edge of map.edges) {
    if (edge.from === currentNodeId) reachable.add(edge.to);
  }
  return reachable;
}

export function getNodeRows(map: RoguelikeMap): Record<number, RoguelikeMapNode[]> {
  const grouped: Record<number, RoguelikeMapNode[]> = {};
  for (const node of map.nodes) {
    if (!grouped[node.column]) grouped[node.column] = [];
    grouped[node.column].push(node);
  }
  return grouped;
}

export function getColumnNodeNodes(map: RoguelikeMap): RoguelikeMapNode[][] {
  const rows = getNodeRows(map);
  const result: RoguelikeMapNode[][] = [];
  for (let column = 0; column < map.columns; column++) {
    result.push(rows[column] || []);
  }
  return result;
}

export function laneForNodeRow(row: number): Lane {
  return laneFromRow(row);
}
