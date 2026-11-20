/**
 * Operational states of the outbound Cloud Relay reverse tunnel.
 */
export type RelayConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'SIMULATED'
  | 'ERROR';

/**
 * Live telemetry, domain mapping, and configurable access policy status of the Cloud Relay tunnel.
 */
export interface CloudRelayStatus {
  moduleEnabled: boolean;
  relayEnabled: boolean;
  connectionState: RelayConnectionState;
  venueSlug: string | null;
  customDomain: string | null;
  baseDomain: string;
  publicUrl: string;
  tunnelEndpoint: string;
  pairingTokenConfigured: boolean;
  connectedSince: string | null;
  lastHeartbeatAt: string | null;
  lastError: string | null;
  reconnectAttempt: number;
  nextRetryInSeconds: number;
  activeStreams: number;
  totalProxiedRequests: number;
  totalProxiedWsFrames: number;
  averageLatencyMs: number;
  simulatorMode: boolean;
  clientsEnabled: boolean;
  staffEnabled: boolean;
  adminEnabled: boolean;
  remoteTpeEnabled: boolean;
  remotePrintingEnabled: boolean;
  allowedRoles: string[];
}

/**
 * Public-safe white-label venue branding and Wi-Fi fallback metadata.
 */
export interface PublicBranding {
  establishmentName: string;
  venueSlug: string | null;
  customDomain: string | null;
  primaryColor: string;
  primaryColorStrong: string;
  logoUrl: string | null;
  bannerImageUrl: string | null;
  defaultTheme: 'DARK' | 'LIGHT';
  cloudRelayEnabled: boolean;
  tunnelConnected: boolean;
  clientsEnabled: boolean;
  staffEnabled: boolean;
  effectivePublicUrl: string;
  localFallbackUrl: string;
  wifiEnabled: boolean;
  wifiSsid: string | null;
}

/**
 * Result of an on-demand Cloud Relay connectivity and custom domain DNS diagnostic probe.
 */
export interface CloudRelayDiagnostic {
  success: boolean;
  latencyMs: number;
  status: string;
  message: string;
  resolvedPublicUrl: string;
  dnsVerified: boolean;
  tlsReady: boolean;
}
