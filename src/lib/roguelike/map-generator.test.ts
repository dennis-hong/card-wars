import { describe, expect, it } from 'vitest';
import { DeterministicRandom } from '@/lib/rng';
import { attachEncounterData, generateActMap } from '@/lib/roguelike/map-generator';

function createSeededRandom(seed = 1): DeterministicRandom {
  let value = seed >>> 0;
  return {
    next: () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    },
  };
}

describe('generateActMap', () => {
  it('builds a deterministic map with valid start/boss structure', () => {
    const map = generateActMap(1, createSeededRandom(42));
    const columnZeroNodes = map.nodes.filter((node) => node.column === 0);
    const bossNode = map.nodes.find((node) => node.id === map.bossNodeId);

    expect(map.startNodeId).toBe('__start__');
    expect(map.columns).toBeGreaterThanOrEqual(8);
    expect(columnZeroNodes.length).toBeGreaterThan(0);
    expect(bossNode?.type).toBe('boss');

    const startEdges = map.edges.filter((edge) => edge.from === map.startNodeId);
    expect(startEdges.map((edge) => edge.to).sort()).toEqual(
      columnZeroNodes.map((node) => node.id).sort(),
    );

    const nodeById = new Map(map.nodes.map((node) => [node.id, node]));
    for (const node of map.nodes) {
      if (node.column === 0) continue;
      const hasIncoming = map.edges.some((edge) => {
        if (edge.to !== node.id) return false;
        const fromNode = nodeById.get(edge.from);
        return Boolean(fromNode && fromNode.column === node.column - 1);
      });
      expect(hasIncoming).toBe(true);
    }
  });
});

describe('attachEncounterData', () => {
  it('attaches encounter payloads to combat/event nodes', () => {
    const map = generateActMap(1, createSeededRandom(7));
    const enriched = attachEncounterData(map, createSeededRandom(99));

    for (const node of enriched.nodes) {
      if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
        expect(node.enemy).toBeDefined();
      }
      if (node.type === 'event') {
        expect(node.eventId).toBeTruthy();
      }
    }
  });
});
