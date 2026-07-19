export interface VpnStatus { status: 'running' | 'stopped'; }

export interface PublicIp {
  public_ip: string;
  region?: string;
  country?: string;
  city?: string;
  location?: string;
  organization?: string;
  timezone?: string;
}

export interface PortForward { port: number; }

// Settings must round-trip whole on PUT, keep unknown fields via index signatures
export interface ServerSelection {
  countries?: string[] | null;
  regions?: string[] | null;
  cities?: string[] | null;
  [key: string]: unknown;
}

export interface VpnSettings {
  type?: string;
  provider: {
    name: string;
    server_selection: ServerSelection;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ServerChoiceLocation { country: string; city: string; servers: number; }
export interface ServerChoices { provider: string; locations: ServerChoiceLocation[]; }

export interface GluetunVersion { version: string; commit: string; created: string; }

export interface UpdaterStatus { status: string; }
export interface DnsStatus { status: string; }
