export interface FileUploadPayload {
  file: File;
  name?: string;
  description?: string;
}

export interface FileUploadResponse {
  uuid: string;
}

export interface FileRecord {
  id: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface FileUpdatePayload {
  name?: string;
  description?: string;
}
