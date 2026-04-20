/**
 * Splits reading text into illustration-sized paragraph chunks (~targetWords).
 * Never breaks inside a sentence: coarse split is on newlines, then long blocks
 * are packed from sentence boundaries only.
 */

const DEFAULT_TARGET = 80;

function wordCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Split a block into sentences (best-effort English punctuation). */
export function splitSentences(block: string): string[] {
  const t = block.trim();
  if (!t) return [];
  const parts = t.split(/(?<=[.!?]["']?)\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [t];
}

/**
 * @param storyText full story from the learner
 * @param targetWords approximate words per chunk (balanced greedy packing)
 */
/** When a single sentence has no internal punctuation, split on spaces only (never mid-word). */
function splitLongClauseByWords(clause: string, tw: number): string[] {
  const words = clause.trim().split(/\s+/).filter(Boolean);
  if (words.length <= tw) return [clause.trim()];
  const parts: string[] = [];
  let buf: string[] = [];
  for (const w of words) {
    if (buf.length >= tw) {
      parts.push(buf.join(' '));
      buf = [];
    }
    buf.push(w);
  }
  if (buf.length) parts.push(buf.join(' '));
  return parts;
}

/** Prefer commas, then word-only chunks, so oversized single sentences still progress. */
function atomicClauses(sentence: string, tw: number): string[] {
  const t = sentence.trim();
  if (wordCount(t) <= tw) return [t];
  const commaParts = t.split(/,\s+/).map((s) => s.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    const out: string[] = [];
    for (const p of commaParts) {
      out.push(...atomicClauses(p, tw));
    }
    return out;
  }
  return splitLongClauseByWords(t, tw);
}

export function splitIllustrationParagraphs(storyText: string, targetWords: number = DEFAULT_TARGET): string[] {
  const text = (storyText ?? '').trim();
  if (!text) return [];

  const coarse = text
    .split(/\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const out: string[] = [];
  const tw = Number.isFinite(targetWords) && targetWords > 0 ? targetWords : DEFAULT_TARGET;

  for (const paragraph of coarse) {
    if (wordCount(paragraph) <= tw) {
      out.push(paragraph);
      continue;
    }

    const sentences = splitSentences(paragraph);
    const clauses: string[] = [];
    for (const s of sentences) {
      clauses.push(...atomicClauses(s, tw));
    }

    let buf = '';
    let bufWords = 0;

    const flush = () => {
      const chunk = buf.trim();
      if (chunk) out.push(chunk);
      buf = '';
      bufWords = 0;
    };

    for (const sent of clauses) {
      const w = wordCount(sent);
      if (!buf) {
        buf = sent;
        bufWords = w;
        continue;
      }
      if (bufWords + w > tw && bufWords >= Math.floor(tw * 0.45)) {
        flush();
        buf = sent;
        bufWords = w;
        continue;
      }
      buf = `${buf} ${sent}`.trim();
      bufWords = wordCount(buf);
    }
    flush();
  }

  return out.length ? out : [text];
}
