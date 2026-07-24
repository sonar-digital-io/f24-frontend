export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  'X-CSRFToken': string;
  user_id: number;
}
