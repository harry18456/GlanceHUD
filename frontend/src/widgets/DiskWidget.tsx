import { HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "../components/StatCard";

interface DiskInfo {
  path: string;
  usagePercent: number;
  used: number;
  total: number;
}

export function DiskWidget({ data }: { data: any }) {
  const disks: DiskInfo[] = Array.isArray(data.value) ? data.value : (data.value ? [data.value] : []);

  if (!disks || disks.length === 0) {
      return (
        <StatCard
            icon={HardDrive}
            label="Disk"
            value={0}
            sub="No disk found"
        />
      );
  }

  // Single disk layout - Use circular StatCard for consistency if only one
  if (disks.length === 1) {
      const d = disks[0];
      return (
        <StatCard
          icon={HardDrive}
          label={`Disk ${d.path}`}
          value={d.usagePercent}
          sub={`${d.used} / ${d.total} GB`}
        />
      );
  }

  // Multi disk layout - Linear bars, no container background to match other widgets
  return (
    <div className="flex flex-col gap-2 w-full py-2">
      <div className="flex items-center gap-3 mb-1 pl-1">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/5">
          <HardDrive size={16} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
        </div>
        <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
          Disks
        </span>
      </div>
      
      <div className="flex flex-col gap-3 pl-1">
        {disks.map((d) => (
           <div key={d.path} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline pr-1">
                 <span className="text-xs font-mono font-bold text-white/80">{d.path}</span>
                 <span className="text-[9px] font-mono text-white/30 tracking-wide">
                    {d.used}<span className="text-white/10 mx-0.5">/</span>{d.total} <span className="text-white/20">GB</span>
                 </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                   initial={{ width: 0 }}
                   animate={{ width: `${d.usagePercent}%` }}
                   transition={{ type: "spring", stiffness: 40, damping: 15 }}
                 />
              </div>
           </div>
        ))}
      </div>
    </div>
  );
}
