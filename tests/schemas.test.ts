import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  AiVerificationResultSchema,
  CreateQuestSchema,
  UpdateQuestSchema,
} from '../src/shared/types.ts';

describe('AiVerificationResultSchema', () => {
  it('accepts a valid conservative needs_review result', () => {
    const result = AiVerificationResultSchema.safeParse({
      status: 'needs_review',
      confidence: 0.62,
      summary: 'A tablet with study notes is visible, but exact page count cannot be proven.',
      evidence_found: ['Tablet displaying typed study notes'],
      criteria_results: [
        {
          criterion: 'At least two pages of digital notes',
          met: 'uncertain',
          note: 'Only one screen is visible in the photo.',
        },
      ],
      limitations: ['Single still image cannot prove total page count.'],
    });

    assert.equal(result.success, true);
  });

  it('rejects out-of-range confidence or invalid status', () => {
    const badConfidence = AiVerificationResultSchema.safeParse({
      status: 'approved',
      confidence: 1.5,
      summary: 'Looks good.',
      evidence_found: [],
      criteria_results: [],
      limitations: [],
    });
    assert.equal(badConfidence.success, false);

    const badStatus = AiVerificationResultSchema.safeParse({
      status: 'auto_pass',
      confidence: 0.9,
      summary: 'Looks good.',
      evidence_found: [],
      criteria_results: [],
      limitations: [],
    });
    assert.equal(badStatus.success, false);
  });
});

describe('Quest schemas', () => {
  it('validates CreateQuestSchema and UpdateQuestSchema', () => {
    const created = CreateQuestSchema.safeParse({
      slug: 'cold-water-wash',
      title: 'Cold Water Wash',
      description: 'Run a full laundry load using cold water settings.',
      instructions: 'Set your washing machine to cold wash and take a photo of the dial.',
      environmental_impact: 'Saves heating energy on every laundry cycle.',
      category: 'Energy Saving',
      difficulty: 'easy',
      quest_type: 'weekly',
      estimated_minutes: 10,
      xp_reward: 40,
      eco_points_reward: 20,
      verification_criteria: 'Dial or display clearly set to cold water wash.',
    });
    assert.equal(created.success, true);

    const updated = UpdateQuestSchema.safeParse({
      xp_reward: 50,
      is_active: false,
    });
    assert.equal(updated.success, true);

    const invalidSlug = CreateQuestSchema.safeParse({
      slug: 'Invalid Slug!',
      title: 'Test Quest',
      description: 'Valid description length here.',
      instructions: 'Valid instructions length here.',
      environmental_impact: 'Valid impact length here.',
      category: 'Energy Saving',
      difficulty: 'easy',
      quest_type: 'daily',
      estimated_minutes: 5,
      xp_reward: 25,
      eco_points_reward: 10,
      verification_criteria: 'Clear photo of the eco action.',
    });
    assert.equal(invalidSlug.success, false);
  });
});
