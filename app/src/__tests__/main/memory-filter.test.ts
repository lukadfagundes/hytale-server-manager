// Tests for the memory discovery filter logic from ipc-handlers.ts
// This filter restricts global memories to only show NPCs discovered by at least one player.

interface Memory {
  npcRole: string;
  displayName: string;
  location: string;
  capturedAt: number;
  isNameOverridden: boolean;
}

type PerPlayerMemories = Record<string, Memory[]>;

// Extracted filter logic matching ipc-handlers.ts implementation
function filterGlobalMemories(globalMemories: Memory[], perPlayer: PerPlayerMemories): Memory[] {
  const discoveredNpcRoles = new Set<string>();
  for (const memories of Object.values(perPlayer)) {
    for (const mem of memories) {
      discoveredNpcRoles.add(mem.npcRole);
    }
  }
  return discoveredNpcRoles.size > 0
    ? globalMemories.filter(m => discoveredNpcRoles.has(m.npcRole))
    : globalMemories;
}

function makeMemory(npcRole: string): Memory {
  return {
    npcRole,
    displayName: npcRole.replace(/_/g, ' '),
    location: 'region',
    capturedAt: Date.now(),
    isNameOverridden: false,
  };
}

describe('memory discovery filter', () => {
  const globalMemories: Memory[] = [
    makeMemory('Goblin_Hermit'),
    makeMemory('Pufferfish'),
    makeMemory('Merchant_Trader'),
    makeMemory('Forest_Spirit'),
  ];

  it('should filter global memories to only include discovered NPC roles', () => {
    const perPlayer: PerPlayerMemories = {
      Alice: [makeMemory('Goblin_Hermit')],
    };

    const result = filterGlobalMemories(globalMemories, perPlayer);

    expect(result).toHaveLength(1);
    expect(result[0].npcRole).toBe('Goblin_Hermit');
  });

  it('should compute discovery set as union of all player memories', () => {
    const perPlayer: PerPlayerMemories = {
      Alice: [makeMemory('Goblin_Hermit')],
      Bob: [makeMemory('Pufferfish')],
    };

    const result = filterGlobalMemories(globalMemories, perPlayer);

    expect(result).toHaveLength(2);
    const roles = result.map(m => m.npcRole);
    expect(roles).toContain('Goblin_Hermit');
    expect(roles).toContain('Pufferfish');
  });

  it('should show NPC known by Player A but not Player B in global view', () => {
    const perPlayer: PerPlayerMemories = {
      Alice: [makeMemory('Goblin_Hermit'), makeMemory('Forest_Spirit')],
      Bob: [makeMemory('Pufferfish')],
    };

    const result = filterGlobalMemories(globalMemories, perPlayer);

    // All 3 discovered roles shown, Merchant_Trader hidden
    expect(result).toHaveLength(3);
    const roles = result.map(m => m.npcRole);
    expect(roles).toContain('Goblin_Hermit');
    expect(roles).toContain('Pufferfish');
    expect(roles).toContain('Forest_Spirit');
    expect(roles).not.toContain('Merchant_Trader');
  });

  it('should hide NPC known by no players from global view', () => {
    const perPlayer: PerPlayerMemories = {
      Alice: [makeMemory('Goblin_Hermit')],
    };

    const result = filterGlobalMemories(globalMemories, perPlayer);

    const roles = result.map(m => m.npcRole);
    expect(roles).not.toContain('Pufferfish');
    expect(roles).not.toContain('Merchant_Trader');
    expect(roles).not.toContain('Forest_Spirit');
  });

  it('should show all global memories when no players have memories (empty perPlayer)', () => {
    const perPlayer: PerPlayerMemories = {};

    const result = filterGlobalMemories(globalMemories, perPlayer);

    expect(result).toHaveLength(4);
  });

  it('should show all global memories when all NPCs are discovered', () => {
    const perPlayer: PerPlayerMemories = {
      Alice: [
        makeMemory('Goblin_Hermit'),
        makeMemory('Pufferfish'),
        makeMemory('Merchant_Trader'),
        makeMemory('Forest_Spirit'),
      ],
    };

    const result = filterGlobalMemories(globalMemories, perPlayer);

    expect(result).toHaveLength(4);
  });

  it('should not affect per-player memory data', () => {
    const aliceMemories = [makeMemory('Goblin_Hermit')];
    const perPlayer: PerPlayerMemories = {
      Alice: aliceMemories,
    };

    filterGlobalMemories(globalMemories, perPlayer);

    // Per-player data is untouched
    expect(perPlayer.Alice).toBe(aliceMemories);
    expect(perPlayer.Alice).toHaveLength(1);
  });

  it('should return filtered count, not total global count', () => {
    const perPlayer: PerPlayerMemories = {
      Alice: [makeMemory('Goblin_Hermit'), makeMemory('Pufferfish')],
    };

    const result = filterGlobalMemories(globalMemories, perPlayer);

    expect(result).toHaveLength(2); // 2 discovered, not 4 total
    expect(result.length).toBeLessThan(globalMemories.length);
  });
});
