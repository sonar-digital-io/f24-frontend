export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  'X-CSRFToken': string;
  user_id: number;
}
