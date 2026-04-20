import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getCreditBalanceUnified = vi.fn();
const chargeCreditsUnified = vi.fn();
const createReaderStoryRecord = vi.fn();
const patchReaderStoryAssets = vi.fn();
const patchReaderStoryRecord = vi.fn();

vi.mock('@orchestrators/dashboard/creditsUnified', () => ({
  getCreditBalanceUnified,
  chargeCreditsUnified,
}));

vi.mock('@orchestrators/dashboard/clients/readerStoriesClient', () => ({
  createReaderStoryRecord,
  patchReaderStoryAssets,
  patchReaderStoryRecord,
}));

function jsonResponse(obj: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } }),
  );
}

function audioResponse() {
  const buf = Buffer.from([0xff, 0xf3, 0x00]);
  return Promise.resolve(new Response(buf, { status: 200, headers: { 'content-type': 'audio/mpeg' } }));
}

describe('generateStoryForUser', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.clearAllMocks();
    getCreditBalanceUnified.mockResolvedValue({ balance: 100 });
    createReaderStoryRecord.mockResolvedValue({ story_id: 'story-1' });
    patchReaderStoryAssets.mockResolvedValue(undefined);
    patchReaderStoryRecord.mockResolvedValue(undefined);
    chargeCreditsUnified.mockResolvedValue(undefined);

    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/process')) return jsonResponse({ success: true, data: [] });
      if (url.includes('/comprehension/questions') && !url.includes('/questions/')) {
        return jsonResponse({ questions: [{ id: 'q1' }], resultId: 'res-1' });
      }
      if (url.includes('/images/storybook')) return jsonResponse({ success: true });
      if (url.includes('/tts')) return audioResponse();
      return jsonResponse({ error: 'unexpected' }, 404);
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('creates a story, calls all four upstream endpoints with story context, persists statuses, and charges per ready feature', async () => {
    const { generateStoryForUser } = await import('@orchestrators/story/generateStoryOrchestrator');

    const result = await generateStoryForUser({
      userId: 'user@example.com',
      title: 'T',
      sourceText: ' Hello world ',
    });

    expect(result.storyId).toBe('story-1');
    expect(result.features).toEqual({
      phonics: 'ready',
      comprehension: 'ready',
      visualization: 'ready',
      audiobook: 'ready',
    });

    expect(createReaderStoryRecord).toHaveBeenCalledWith({
      user_id: 'user@example.com',
      title: 'T',
      source_text: 'Hello world',
    });

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/process'))).toBe(true);
    expect(urls.some((u) => u.includes('/comprehension/questions'))).toBe(true);
    expect(urls.some((u) => u.includes('/images/storybook'))).toBe(true);
    expect(urls.some((u) => u.includes('/tts'))).toBe(true);

    const storybookCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes('/images/storybook'));
    expect(storybookCall).toBeDefined();
    const body = JSON.parse(String(storybookCall?.[1]?.body));
    expect(body).toMatchObject({ storyId: 'story-1', storyText: 'Hello world', userId: 'user@example.com' });

    expect(patchReaderStoryAssets).toHaveBeenCalledWith(
      'story-1',
      'user@example.com',
      expect.objectContaining({
        comprehension_result_id: 'res-1',
        audiobook_audio_base64: expect.any(String),
      }),
      expect.any(Number),
    );

    expect(chargeCreditsUnified).toHaveBeenCalledTimes(4);
    expect(chargeCreditsUnified).toHaveBeenCalledWith('user@example.com', 5, 'storygen:phonics:story-1');
  });

  it('does not charge credits for features that failed during preparation', async () => {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/process')) return Promise.resolve(new Response('fail', { status: 500 }));
      if (url.includes('/comprehension/questions') && !url.includes('/questions/')) {
        return jsonResponse({ questions: [{ id: 'q1' }], resultId: 'res-1' });
      }
      if (url.includes('/images/storybook')) return jsonResponse({ success: true });
      if (url.includes('/tts')) return audioResponse();
      return jsonResponse({ error: 'unexpected' }, 404);
    });

    const { generateStoryForUser } = await import('@orchestrators/story/generateStoryOrchestrator');

    const result = await generateStoryForUser({
      userId: 'user@example.com',
      title: 'T',
      sourceText: 'Hello',
    });

    expect(result.features.phonics).toBe('failed');
    expect(result.features.comprehension).toBe('ready');
    expect(chargeCreditsUnified).toHaveBeenCalledTimes(3);
    expect(chargeCreditsUnified).not.toHaveBeenCalledWith(
      'user@example.com',
      5,
      expect.stringContaining('storygen:phonics'),
    );
  });
});
