export interface SessionUser {
  name: string;
  email: string;
}

export interface SessionRecord {
  token: string;
  user: SessionUser;
  issuedAt: string;
}

export interface SessionStrategy {
  getSession(): SessionRecord | null;
  createSession(user: SessionUser): SessionRecord;
  clearSession(): void;
}
