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
