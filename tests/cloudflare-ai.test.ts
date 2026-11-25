import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  buildCloudflareVisionPayload,
  DEFAULT_CLOUDFLARE_MODEL,
  parseCloudflareVisionResponse,
  verifyEvidenceWithCloudflare,
} from '../server/cloudflare-ai.ts';

const CRITERIA = 'Image must show a reusable water bottle near a tap.';
const MODEL = DEFAULT_CLOUDFLARE_MODEL;

describe('Cloudflare Workers AI (Gemma 4) payload & response parsing', () => {
  it('builds multimodal messages payload with base64 data URI image_url', () => {
    const payload = buildCloudflareVisionPayload({
      questTitle: 'Refill Hero',
      questDescription: 'Use a reusable water bottle.',
      verificationCriteria: CRITERIA,
      imageMimeType: 'image/jpeg',
      imageBase64: 'ZmFrZS1qcGVn',
      userNote: 'Filled at campus station',
    });

    assert.equal(payload.messages.length, 2);
    assert.equal(payload.messages[0].role, 'system');
    assert.equal(payload.messages[1].role, 'user');
    assert.ok(Array.isArray(payload.messages[1].content));
    const imageBlock = payload.messages[1].content.find((b) => b.type === 'image_url');
    assert.deepEqual(imageBlock, {
      type: 'image_url',
      image_url: {url: 'data:image/jpeg;base64,ZmFrZS1qcGVn'},
    });
  });

  it('parses a valid fenced JSON response from result.response', () => {
    const validJson = JSON.stringify({
      status: 'approved',
      confidence: 0.91,
      summary: 'A metal reusable bottle is clearly visible next to a kitchen tap.',
      evidence_found: ['Stainless steel bottle', 'Kitchen faucet'],
      criteria_results: [
        {
          criterion: CRITERIA,
          met: 'yes',
          note: 'Reusable bottle is next to the tap.',
        },
      ],
      limitations: [],
    });

    const parsed = parseCloudflareVisionResponse(
      {
        success: true,
        result: {
          response: `\`\`\`json\n${validJson}\n\`\`\``,
        },
      },
      CRITERIA,
      MODEL,
    );

    assert.equal(parsed.status, 'approved');
    assert.equal(parsed.confidence, 0.91);
    assert.equal(parsed.provider_note, `Evaluated via Cloudflare Workers AI (${MODEL})`);
  });

  it('parses a valid JSON response from OpenAI-style choices[0].message.content', () => {
    const validJson = JSON.stringify({
      status: 'needs_review',
      confidence: 0.55,
      summary: 'Bottle is partially obscured.',
      evidence_found: ['Bottle neck visible'],
      criteria_results: [
        {
          criterion: CRITERIA,
          met: 'uncertain',
          note: 'Cannot confirm whether it is reusable.',
        },
      ],
      limitations: ['Bottle body is out of frame.'],
    });

    const parsed = parseCloudflareVisionResponse(
      {
        success: true,
        result: {
          choices: [{message: {content: validJson}}],
        },
      },
      CRITERIA,
      MODEL,
    );

    assert.equal(parsed.status, 'needs_review');
    assert.equal(parsed.confidence, 0.55);
    assert.equal(parsed.provider_note, `Evaluated via Cloudflare Workers AI (${MODEL})`);
  });

  it('falls back to needs_review on API error payload (success: false)', () => {
    const parsed = parseCloudflareVisionResponse(
      {
        success: false,
        errors: [{message: 'Daily free neuron quota exceeded'}],
      },
      CRITERIA,
      MODEL,
    );

    assert.equal(parsed.status, 'needs_review');
    assert.equal(parsed.confidence, 0);
    assert.match(parsed.provider_note || '', /quota exceeded/i);
  });

  it('falls back to needs_review on empty, non-JSON, or schema-invalid response', () => {
    const emptyRes = parseCloudflareVisionResponse({success: true, result: {}}, CRITERIA, MODEL);
    assert.equal(emptyRes.status, 'needs_review');

    const nonJsonRes = parseCloudflareVisionResponse(
      {success: true, result: {response: 'I see a bottle in the photo.'}},
      CRITERIA,
      MODEL,
    );
    assert.equal(nonJsonRes.status, 'needs_review');

    const invalidSchemaRes = parseCloudflareVisionResponse(
      {
        success: true,
        result: {
          response: JSON.stringify({
            status: 'approved',
            confidence: 5,
            summary: 'Invalid confidence',
            evidence_found: [],
            criteria_results: [],
            limitations: [],
          }),
        },
      },
      CRITERIA,
      MODEL,
    );
    assert.equal(invalidSchemaRes.status, 'needs_review');
  });

  it('falls back to needs_review when Cloudflare credentials are missing', async () => {
    const prevId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const prevToken = process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;

    try {
      const result = await verifyEvidenceWithCloudflare({
        questTitle: 'Refill Hero',
        questDescription: 'Use a reusable water bottle.',
        verificationCriteria: CRITERIA,
        imageMimeType: 'image/png',
        imageBase64: Buffer.from('fake-image').toString('base64'),
      });
      assert.equal(result.status, 'needs_review');
      assert.equal(result.confidence, 0);
      assert.match(result.provider_note || '', /not configured/i);
    } finally {
      if (prevId !== undefined) process.env.CLOUDFLARE_ACCOUNT_ID = prevId;
      if (prevToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = prevToken;
    }
  });
});
