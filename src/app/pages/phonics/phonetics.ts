import { WordData } from '../../types';

const API_KEY = process.env.DICTIONARY_API_KEY;
const TIMEOUT = 5000; // 5 seconds timeout

export async function fetchPhonetics(word: string): Promise<WordData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${API_KEY}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const entry = data[0];
    if (typeof entry === 'string') {
      // API returned suggestions instead of definitions
      return null;
    }

    const phonetic = entry.hwi?.prs?.[0]?.mw ?? '';
    const audio_url = entry.hwi?.prs?.[0]?.sound?.audio
      ? `https://media.merriam-webster.com/audio/prons/en/us/mp3/${entry.hwi.prs[0].sound.audio[0]}/${entry.hwi.prs[0].sound.audio}.mp3`
      : null;
    const definition = entry.shortdef?.[0] ?? '';

    return {
      word,
      phonetic,
      audio_url,
      definition
    };

  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`Request timeout for word: ${word}`);
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchPhonetics(word); // Retry the request
      }
      console.error(`Error fetching phonetics for word ${word}:`, error.message);
    } else {
      console.error(`Unknown error fetching phonetics for word ${word}`);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
} 