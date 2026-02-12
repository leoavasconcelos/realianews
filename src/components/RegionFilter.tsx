import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import { REGIONS, RegionFilter as RegionFilterType } from '@/hooks/useNews';

interface RegionFilterProps {
  activeRegion: RegionFilterType;
  onRegionChange: (region: RegionFilterType) => void;
}

const RegionFilter: React.FC<RegionFilterProps> = ({ activeRegion, onRegionChange }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      {REGIONS.map((region) => (
        <button
          key={region.id}
          onClick={() => onRegionChange(region.id)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            activeRegion === region.id
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {region.label}
        </button>
      ))}
    </div>
  );
};

export default RegionFilter;
