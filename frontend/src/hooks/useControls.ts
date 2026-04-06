export async function startEngine() {
  const res = await fetch('/api/control/start', { method: 'POST' });
  if (!res.ok) throw new Error('Start command failed');
  return res.json();
}

export async function stopEngine() {
  const res = await fetch('/api/control/stop', { method: 'POST' });
  if (!res.ok) throw new Error('Stop command failed');
  return res.json();
}

export async function importSubscription(url: string, airportName: string, content?: string) {
  const res = await fetch('/api/config/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, airportName, content }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Import failed');
  }
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function fetchAirports() {
  const res = await fetch('/api/airports');
  if (!res.ok) throw new Error('Failed to fetch airports');
  return res.json();
}

export async function updateConfig(updates: { checkInterval?: number; checkTimeout?: number }) {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Configuration update failed');
  return res.json();
}

export async function deleteAirport(airportId: string) {
  const res = await fetch(`/api/config/airports/${airportId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete airport');
  }
  return res.json();
}

export interface RefreshSubscriptionResponse {
  success: boolean;
  addedCount: number;
  removedCount: number;
  totalNodes: number;
}

export async function refreshSubscription(airportId: string): Promise<RefreshSubscriptionResponse> {
  const res = await fetch(`/api/subscriptions/${airportId}/refresh`, {
    method: 'POST'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to refresh subscription');
  }
  return res.json();
}

export interface UpdateAirportIntervalResponse {
  success: boolean;
  airport: any;
}

export async function updateAirportInterval(airportId: string, updateInterval: number | null): Promise<UpdateAirportIntervalResponse> {
  const res = await fetch(`/api/config/airports/${airportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updateInterval }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update airport interval');
  }
  return res.json();
}
