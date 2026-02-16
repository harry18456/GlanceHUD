import { MemoryStick } from "lucide-react";
import { StatCard } from "../components/StatCard";

interface MemData {
  usagePercent: number;
  used: number;
  total: number;
}

export function MemWidget({ data }: { data: any }) {
  const mem = data.value as MemData;
  
  return (
    <StatCard
      icon={MemoryStick}
      label="Memory"
      value={mem.usagePercent}
      sub={`${mem.used?.toFixed(1)} / ${mem.total?.toFixed(1)} GB`}
    />
  );
}
