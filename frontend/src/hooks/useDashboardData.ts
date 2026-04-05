import { useState, useEffect } from 'react';

export interface DashboardStatus {
  running: boolean;
  configPath: string | null;
  scheduler: {
    running: boolean;
    totalChecks: number;
    lastCheckTime?: string;
  };
  airports: { id: string; name: string; nodeCount: number }[];
}

export interface NodeInfo {
  id: string;
  airportId: string;
  name: string;
  protocol: string;
  address: string;
  port: number;
  config: any;
  lastCheck?: {
    timestamp: Date;
    available: boolean;
    responseTime?: number;
    error?: string;
  } | null;
}

export interface AirportInfo {
  id: string;
  name: string;
  nodes: NodeInfo[];
}

export function useDashboardData() {
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [airports, setAirports] = useState<AirportInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [resStatus, resAirports] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/airports')
      ]);
      
      if (!resStatus.ok || !resAirports.ok) throw new Error('API request failed');

      setStatus(await resStatus.json());
      setAirports(await resAirports.json());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s polling
    return () => clearInterval(interval);
  }, []);

  return { status, airports, loading, error, refetch: fetchData };
}

export async function fetchNodeTrend(nodeId: string) {
  const res = await fetch(`/api/nodes/${nodeId}/trend`);
  if (!res.ok) throw new Error('Failed to fetch trend');
  return res.json();
}

export async function fetchNodeLogs(nodeId: string) {
  const res = await fetch(`/api/nodes/${nodeId}/logs`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

