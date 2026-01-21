import React from 'react';
import { Button } from './ui/button';

interface FilterPillsProps {
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterPills: React.FC<FilterPillsProps> = ({ filters, activeFilter, onFilterChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => (
        <Button
          key={filter}
          variant={activeFilter === filter ? 'pill-active' : 'pill'}
          size="pill"
          onClick={() => onFilterChange(filter)}
          className="shrink-0"
        >
          {filter}
        </Button>
      ))}
    </div>
  );
};

export default FilterPills;
