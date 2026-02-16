import { Cpu } from "lucide-react";
import { StatCard } from "../components/StatCard";

interface CpuData {
  value: number; // For now CPU module returns a single number as 'Value'
}

export function CpuWidget({ data }: { data: any }) {
  // data.value is the CPU usage percentage
  const value = typeof data.value === 'number' ? data.value : 0;
  
  return (
    <StatCard
      icon={Cpu}
      label="Processor"
      value={value}
      sub="CPU Load"
    />
  );
}
