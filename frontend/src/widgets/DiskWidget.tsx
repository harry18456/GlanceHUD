import { HardDrive } from "lucide-react";
import { StatCard } from "../components/StatCard";

interface DiskData {
  usagePercent: number;
  used: number;
  total: number;
}

export function DiskWidget({ data }: { data: any }) {
  const disk = data.value as DiskData;

  // Label comes from backend (e.g. "Disk C:\")
  return (
    <StatCard
      icon={HardDrive}
      label={data.label || "Disk"}
      value={disk.usagePercent}
      sub={`${disk.used?.toFixed(1)} / ${disk.total?.toFixed(0)} GB`}
    />
  );
}
