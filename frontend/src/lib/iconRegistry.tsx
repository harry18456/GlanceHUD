import {
  ArrowUp,
  ArrowDown,
  HardDrive,
  MemoryStick,
  Cpu,
  Sun,
  CloudRain,
  Thermometer,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const registry: Record<string, ComponentType<LucideProps>> = {
  ArrowUp,
  ArrowDown,
  HardDrive,
  MemoryStick,
  Cpu,
  Sun,
  sun: Sun,
  CloudRain,
  "cloud-rain": CloudRain,
  Thermometer,
  thermometer: Thermometer,
};

export function IconFromName({
  name,
  size = 14,
  ...rest
}: { name: string; size?: number } & LucideProps) {
  const Icon = registry[name];
  if (!Icon) return null;
  return <Icon size={size} {...rest} />;
}
