export interface RemoteAdapterTask {
  id: string;
  [key: string]: unknown;
}

export interface RemoteAdapterStartPayload {
  client_id: string;
}

export interface RemoteAdapterStopPayload {
  client_id: string;
  state: string;
  error_code: number;
  error_message: string;
}

export interface RemoteAdapterDownloadQuery {
  client_id: string;
  index: number;
  chunk_size: number;
}

export interface RemoteAdapterUploadMetadata {
  client_id: string;
  total_count: number;
  total_size: number;
  index: number;
  chunk_size: number;
}

export interface RemoteAdapterLogPayload {
  level: string;
  logger: string;
  message: string;
  module: string;
  function_name: string;
  line_number: number;
  created: number;
  process: number;
  thread: number;
}
