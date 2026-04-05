import { Search, Filter } from 'lucide-react';

interface NodeFilterProps {
  onFilterChange: (filters: FilterState) => void;
  regions: string[];
  protocols: string[];
}

export interface FilterState {
  region: string;
  protocol: string;
  search: string;
}

export default function NodeFilter({ onFilterChange, regions, protocols }: NodeFilterProps) {
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      region: e.target.value,
      protocol: (document.getElementById('protocol-filter') as HTMLSelectElement)?.value || '',
      search: (document.getElementById('search-input') as HTMLInputElement)?.value || ''
    });
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      region: (document.getElementById('region-filter') as HTMLSelectElement)?.value || '',
      protocol: e.target.value,
      search: (document.getElementById('search-input') as HTMLInputElement)?.value || ''
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      region: (document.getElementById('region-filter') as HTMLSelectElement)?.value || '',
      protocol: (document.getElementById('protocol-filter') as HTMLSelectElement)?.value || '',
      search: e.target.value
    });
  };

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Filter Nodes</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Region Filter */}
        <div>
          <label htmlFor="region-filter" className="block text-xs text-zinc-500 mb-2">
            Region
          </label>
          <select
            id="region-filter"
            onChange={handleRegionChange}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Regions</option>
            {regions.map(region => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Protocol Filter */}
        <div>
          <label htmlFor="protocol-filter" className="block text-xs text-zinc-500 mb-2">
            Protocol
          </label>
          <select
            id="protocol-filter"
            onChange={handleProtocolChange}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Protocols</option>
            {protocols.map(protocol => (
              <option key={protocol} value={protocol}>
                {protocol.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label htmlFor="search-input" className="block text-xs text-zinc-500 mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              id="search-input"
              type="text"
              placeholder="Search by name or address..."
              onChange={handleSearchChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
