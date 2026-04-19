import { describe, expect, it } from 'vitest';
import {
  buildMerriamWebsterAudioUrl,
  isProbablyValidHttpUrl,
  merriamWebsterAudioSubdirectory,
} from '@phonics/utils/audioUrl';

describe('merriamWebsterAudioSubdirectory', () => {
  it('uses bix prefix rule', () => {
    expect(merriamWebsterAudioSubdirectory('bixhello01')).toBe('bix');
  });

  it('uses gg prefix rule', () => {
    expect(merriamWebsterAudioSubdirectory('gghello01')).toBe('gg');
  });

  it('uses number folder for leading digit', () => {
    expect(merriamWebsterAudioSubdirectory('3d000001')).toBe('number');
  });

  it('uses number folder for leading punctuation', () => {
    expect(merriamWebsterAudioSubdirectory('_foo01')).toBe('number');
  });

  it('uses first letter otherwise', () => {
    expect(merriamWebsterAudioSubdirectory('pajama02')).toBe('p');
  });
});

describe('buildMerriamWebsterAudioUrl', () => {
  it('builds documented 3-D example shape', () => {
    const u = buildMerriamWebsterAudioUrl('3d000001');
    expect(u).toBe(
      'https://media.merriam-webster.com/audio/prons/en/us/mp3/number/3d000001.mp3',
    );
    expect(isProbablyValidHttpUrl(u)).toBe(true);
  });

  it('builds documented pajama example shape', () => {
    const u = buildMerriamWebsterAudioUrl('pajama02');
    expect(u).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/p/pajama02.mp3');
    expect(isProbablyValidHttpUrl(u)).toBe(true);
  });

  it('returns null for empty audio id', () => {
    expect(buildMerriamWebsterAudioUrl('')).toBeNull();
    expect(buildMerriamWebsterAudioUrl(null)).toBeNull();
  });
});

describe('isProbablyValidHttpUrl', () => {
  it('rejects non-urls', () => {
    expect(isProbablyValidHttpUrl('not a url')).toBe(false);
    expect(isProbablyValidHttpUrl('')).toBe(false);
  });
});
