import React from 'react';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { REGIONS, RegionFilter as RegionFilterType } from '@/hooks/useNews';

interface RegionFilterProps {
  activeRegion: RegionFilterType;
  onRegionChange: (region: RegionFilterType) => void;
}

const RegionFilter: React.FC<RegionFilterProps> = ({ activeRegion, onRegionChange }) => {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (index: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
        delay: index * 0.05,
      },
    }),
  };

  return (
    <motion.div 
      className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      {REGIONS.map((region, index) => (
        <motion.button
          key={region.id}
          onClick={() => onRegionChange(region.id)}
          variants={itemVariants}
          custom={index}
          initial="hidden"
          animate="visible"
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 flex items-center gap-1 ${
            activeRegion === region.id
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>{region.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default RegionFilter;
