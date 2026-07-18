export interface PortainerSnapshot {
  Time: number;
  DockerVersion: string;
  Swarm: boolean;
  TotalCPU: number;
  TotalMemory: number;
  RunningContainerCount: number;
  StoppedContainerCount: number;
  HealthyContainerCount: number;
  UnhealthyContainerCount: number;
  VolumeCount: number;
  ImageCount: number;
  StackCount: number;
}

export interface PortainerEndpoint {
  Id: number;
  Name: string;
  Type: number;
  URL: string;
  // 1 = up, 2 = down
  Status: number;
  Snapshots?: PortainerSnapshot[];
}

export interface DockerPort { IP?: string; PrivatePort: number; PublicPort?: number; Type: string; }

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;   // running | exited | paused | restarting | created | dead
  Status: string;  // "Up 3 minutes (healthy)"
  Ports: DockerPort[];
  Labels: Record<string, string>;
}

export interface ContainerInspect {
  Id: string;
  Name: string;
  Created: string;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    StartedAt: string;
    FinishedAt: string;
    ExitCode: number;
    Health?: { Status: string; FailingStreak: number };
  };
  Config: { Image: string; Env: string[]; Labels: Record<string, string>; Tty?: boolean };
  Mounts: Array<{ Type: string; Source: string; Destination: string; RW: boolean }>;
  HostConfig: { RestartPolicy?: { Name: string } };
  NetworkSettings?: { Networks?: Record<string, { IPAddress: string }> };
}

export interface DockerStatsRaw {
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number; online_cpus?: number };
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number };
  memory_stats: { usage?: number; limit?: number; stats?: { cache?: number; inactive_file?: number } };
}

export interface ContainerStats {
  cpuPercent: number;
  memUsed: number;
  memLimit: number;
}

export interface PortainerStack {
  Id: number;
  Name: string;
  // 1 = active, 2 = inactive
  Status: number;
  Type: number;
  EndpointId: number;
  Env: Array<{ name: string; value: string }>;
}

export interface DockerImage {
  Id: string;
  RepoTags: string[] | null;
  Size: number;
  Created: number;
}
