export interface DeterministicRandom {
  next(): number;
}

export const mathRandom: DeterministicRandom = {
  next: Math.random,
};

const UINT32_MAX = 0x100000000;

function mixSeed(seed: number): number {
  let mixed = seed >>> 0;
  mixed ^= mixed << 13;
  mixed ^= mixed >>> 17;
  mixed ^= mixed << 5;
  return mixed >>> 0;
}

export function createSeededRandom(seed: number): DeterministicRandom {
  let state = mixSeed(seed);
  return {
    next: () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / UINT32_MAX;
    },
  };
}

export function randomInt(maxExclusive: number, random: DeterministicRandom): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(random.next() * maxExclusive);
}

export function randomPick<T>(items: readonly T[], random: DeterministicRandom): T {
  const index = randomInt(items.length, random);
  return items[index];
}
