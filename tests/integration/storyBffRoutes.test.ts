import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionUserFromRequest = vi.fn();
const getReaderStoryRecord = vi.fn();
const getAudiobookAudioFromReaderStory = vi.fn();

vi.mock('@/lib/auth/getSessionUser', () => ({
  getSessionUserFromRequest,
}));

vi.mock('@orchestrators/dashboard/clients/readerStoriesClient', () => ({
  getReaderStoryRecord,
  getAudiobookAudioFromReaderStory,
}));

describe('story-specific BFF routes (ownership)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/audiobook/story/[storyId] returns 401 without session', async () => {
    getSessionUserFromRequest.mockResolvedValue(null);
    const { GET } = await import('@/app/api/audiobook/story/[storyId]/route');
    const res = await GET(new Request('http://localhost/api/audiobook/story/x'), { params: { storyId: 'x' } });
    expect(res.status).toBe(401);
  });

  it('GET /api/audiobook/story/[storyId] returns 404 when story is missing (non-owner)', async () => {
    getSessionUserFromRequest.mockResolvedValue({ email: 'a@b.com', name: 'A' });
    getReaderStoryRecord.mockResolvedValue(null);
    const { GET } = await import('@/app/api/audiobook/story/[storyId]/route');
    const res = await GET(new Request('http://localhost/api/audiobook/story/x'), { params: { storyId: 'x' } });
    expect(res.status).toBe(404);
  });

  it('GET /api/audiobook/story/[storyId] returns 404 when feature is not ready', async () => {
    getSessionUserFromRequest.mockResolvedValue({ email: 'a@b.com', name: 'A' });
    getReaderStoryRecord.mockResolvedValue({
      story_id: 's1',
      user_id: 'a@b.com',
      title: 't',
      source_text: 'x',
      phonics_status: 'ready',
      comprehension_status: 'ready',
      visualization_status: 'ready',
      audiobook_status: 'failed',
      created_at: new Date().toISOString(),
    });
    const { GET } = await import('@/app/api/audiobook/story/[storyId]/route');
    const res = await GET(new Request('http://localhost/api/audiobook/story/s1'), { params: { storyId: 's1' } });
    expect(res.status).toBe(404);
  });

  it('GET /api/audiobook/story/[storyId] returns audio payload when ready', async () => {
    getSessionUserFromRequest.mockResolvedValue({ email: 'a@b.com', name: 'A' });
    getReaderStoryRecord.mockResolvedValue({
      story_id: 's1',
      user_id: 'a@b.com',
      title: 't',
      source_text: 'x',
      phonics_status: 'ready',
      comprehension_status: 'ready',
      visualization_status: 'ready',
      audiobook_status: 'ready',
      created_at: new Date().toISOString(),
    });
    getAudiobookAudioFromReaderStory.mockResolvedValue({ mimeType: 'audio/mpeg', audioBase64: 'qqq=' });
    const { GET } = await import('@/app/api/audiobook/story/[storyId]/route');
    const res = await GET(new Request('http://localhost/api/audiobook/story/s1'), { params: { storyId: 's1' } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { mimeType?: string; audioBase64?: string };
    expect(body.audioBase64).toBe('qqq=');
  });

  it('GET /api/stories/[storyId] returns 404 for missing story', async () => {
    getSessionUserFromRequest.mockResolvedValue({ email: 'a@b.com', name: 'A' });
    getReaderStoryRecord.mockResolvedValue(null);
    const { GET } = await import('@/app/api/stories/[storyId]/route');
    const res = await GET(new Request('http://localhost/api/stories/nope'), { params: { storyId: 'nope' } });
    expect(res.status).toBe(404);
  });
});
