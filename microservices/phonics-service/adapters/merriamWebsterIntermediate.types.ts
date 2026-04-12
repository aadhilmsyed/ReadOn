/** Narrow types for Intermediate Dictionary (sd3) JSON — provider-specific. */

export type MwMeta = {
  id?: string;
  uuid?: string;
};

export type MwSound = {
  audio?: string;
};

export type MwPrs = {
  mw?: string;
  ipa?: string;
  sound?: MwSound;
};

export type MwHwi = {
  hw?: string;
  prs?: MwPrs[];
};

export type MwIntermediateEntry = {
  meta?: MwMeta;
  hwi?: MwHwi;
  /** functional label e.g. noun, verb */
  fl?: string;
  shortdef?: string[];
};
