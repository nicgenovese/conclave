import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleArchiveDecision } from '../../src/tools/archiveDecision.js';

describe('handleArchiveDecision', () => {
  let mockArchiveManager: {
    writeDocument: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockArchiveManager = {
      writeDocument: vi.fn()
    };
  });

  it('should archive a go decision', async () => {
    mockArchiveManager.writeDocument.mockResolvedValue(undefined);

    const result = await handleArchiveDecision(
      {
        protocol: 'aave',
        sector: 'DeFi',
        date: '2025-03-01',
        decision: 'go',
        conviction: 8,
        rationale: 'Strong fundamentals and governance.'
      },
      { archiveManager: mockArchiveManager }
    );

    expect(result.success).toBe(true);
    expect(result.storagePath).toBe('decisions/aave-2025-03-01-go.md');
    expect(result.decisionId).toBe('decision-aave-2025-03-01');
    expect(mockArchiveManager.writeDocument).toHaveBeenCalledWith(
      'decisions/aave-2025-03-01-go.md',
      expect.objectContaining({
        protocol: 'aave',
        decision: 'go',
        conviction: 8
      }),
      expect.stringContaining('Strong fundamentals')
    );
  });

  it('should archive a no-go decision', async () => {
    mockArchiveManager.writeDocument.mockResolvedValue(undefined);

    const result = await handleArchiveDecision(
      {
        protocol: 'risky-protocol',
        sector: 'DeFi',
        date: '2025-03-01',
        decision: 'no-go',
        conviction: 3,
        rationale: 'Too many red flags identified.'
      },
      { archiveManager: mockArchiveManager }
    );

    expect(result.success).toBe(true);
    expect(result.storagePath).toBe('decisions/risky-protocol-2025-03-01-no-go.md');
  });

  it('should include risk assessment in decision', async () => {
    mockArchiveManager.writeDocument.mockResolvedValue(undefined);

    await handleArchiveDecision(
      {
        protocol: 'aave',
        sector: 'DeFi',
        date: '2025-03-01',
        decision: 'go',
        conviction: 8,
        rationale: 'Test rationale.',
        riskAssessment: {
          categories: {
            'Smart Contract': 2,
            'Economic': 3,
            'Governance': 2
          },
          overallRating: 2
        }
      },
      { archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.writeDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        riskRating: 'low' // overallRating 2 = low
      }),
      expect.stringContaining('Risk Summary')
    );
  });

  it('should include conditions for conditional decisions', async () => {
    mockArchiveManager.writeDocument.mockResolvedValue(undefined);

    await handleArchiveDecision(
      {
        protocol: 'new-protocol',
        sector: 'DeFi',
        date: '2025-03-01',
        decision: 'conditional',
        conviction: 6,
        rationale: 'Promising but needs audit.',
        conditions: [
          { condition: 'Complete audit', trigger: 'Before any position' }
        ]
      },
      { archiveManager: mockArchiveManager }
    );

    expect(mockArchiveManager.writeDocument).toHaveBeenCalledWith(
      'decisions/new-protocol-2025-03-01-conditional.md',
      expect.objectContaining({
        decision: 'conditional',
        conditions: [{ condition: 'Complete audit', trigger: 'Before any position' }]
      }),
      expect.stringContaining('Conditions')
    );
  });

  it('should handle write errors gracefully', async () => {
    mockArchiveManager.writeDocument.mockRejectedValue(new Error('Permission denied'));

    const result = await handleArchiveDecision(
      {
        protocol: 'test',
        sector: 'DeFi',
        date: '2025-03-01',
        decision: 'go',
        conviction: 5,
        rationale: 'Test.'
      },
      { archiveManager: mockArchiveManager }
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Permission denied');
  });
});
