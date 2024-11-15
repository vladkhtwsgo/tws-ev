export interface WhiteListEntity {
  email: string;
  createdAt: string;
  requestId: string;
  score: number;
}

export interface BlackListEntity extends WhiteListEntity {
  recheckAttempts: number;
}
