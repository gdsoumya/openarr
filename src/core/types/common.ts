export interface PaginatedResult<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  records: T[];
}

export type StatusType = 'connected' | 'disconnected' | 'error' | 'connecting';

export interface ConnectionState {
  status: StatusType;
  isLocal: boolean;
  lastChecked: number;
  error?: string;
}
