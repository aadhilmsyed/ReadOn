export interface SessionUser {
  name: string;
  email: string;
}

/** Browser-visible session (JWT lives in HttpOnly cookie). */
export interface SessionRecord {
  user: SessionUser;
}

export interface SessionStrategy {
  getSession(): SessionRecord | null;
  createSession(user: SessionUser): SessionRecord;
  clearSession(): void;
}
