import React from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { REGIONS, RegionFilter as RegionFilterType } from '@/hooks/useNews';

interface RegionFilterProps {
  activeRegion: RegionFilterType;
  onRegionChange: (region: RegionFilterType) => void;
}

const RegionFilter: React.FC<RegionFilterProps> = ({ activeRegion, onRegionChange }) => {
  const currentRegion = REGIONS.find(r => r.id === activeRegion) || REGIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 bg-card border-border hover:bg-muted"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentRegion.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="z-50 min-w-[160px] bg-popover border border-border shadow-lg"
      >
        {REGIONS.map((region) => (
          <DropdownMenuItem
            key={region.id}
            onClick={() => onRegionChange(region.id)}
            className={`cursor-pointer ${activeRegion === region.id ? 'bg-primary/10 text-primary' : ''}`}
          >
            {region.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RegionFilter;
