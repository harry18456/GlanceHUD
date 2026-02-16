import {
  ArrowUp,
  ArrowDown,
  HardDrive,
  MemoryStick,
  Cpu,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const registry: Record<string, ComponentType<LucideProps>> = {
  ArrowUp,
  ArrowDown,
  HardDrive,
  MemoryStick,
  Cpu,
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
