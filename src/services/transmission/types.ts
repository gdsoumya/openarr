export interface Torrent {
  id: number;
  name: string;
  status: TorrentStatus;
  percentDone: number;
  rateDownload: number;
  rateUpload: number;
  eta: number;
  totalSize: number;
  uploadRatio: number;
  peersConnected: number;
  labels: string[];
  queuePosition: number;
  downloadDir: string;
  errorString: string;
  addedDate: number;
  doneDate: number;
  files: TorrentFile[];
  fileStats: TorrentFileStat[];
  hashString: string;
  isFinished: boolean;
  magnetLink: string;
  sizeWhenDone: number;
  peersGettingFromUs: number;
  peersSendingToUs: number;
}

export interface TorrentFile {
  name: string;
  length: number;
  bytesCompleted: number;
}

export interface TorrentFileStat {
  wanted: boolean;
  priority: number;
}

export enum TorrentStatus {
  Stopped = 0,
  QueuedToVerify = 1,
  Verifying = 2,
  QueuedToDownload = 3,
  Downloading = 4,
  QueuedToSeed = 5,
  Seeding = 6,
}

export interface SessionStats {
  activeTorrentCount: number;
  downloadSpeed: number;
  uploadSpeed: number;
  pausedTorrentCount: number;
  torrentCount: number;
}

export interface TransmissionSession {
  downloadDir: string;
  speedLimitDown: number;
  speedLimitDownEnabled: boolean;
  speedLimitUp: number;
  speedLimitUpEnabled: boolean;
  altSpeedEnabled: boolean;
  altSpeedDown: number;
  altSpeedUp: number;
}

export type SortField = 'name' | 'totalSize' | 'uploadRatio' | 'rateDownload' | 'rateUpload' | 'percentDone' | 'queuePosition' | 'addedDate' | 'status';
