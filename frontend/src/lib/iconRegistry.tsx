import {
  // Hardware / System
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Database,
  Monitor,
  Laptop,
  Battery,
  BatteryCharging,
  // Network
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Wifi,
  WifiOff,
  Globe,
  Network,
  Signal,
  // Weather / Environment
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  Snowflake,
  Zap,
  // Status / Alert
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Bell,
  // Time
  Clock,
  Timer,
  Calendar,
  // Dev / Process
  Terminal,
  Code,
  Package,
  GitBranch,
  Layers,
  // Metrics
  TrendingUp,
  TrendingDown,
  BarChart2,
  Gauge,
  // Misc
  Volume2,
  VolumeX,
  Star,
  Heart,
  Home,
  Music,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const registry: Record<string, ComponentType<LucideProps>> = {
  // Hardware / System
  Cpu, MemoryStick, HardDrive, Server, Database, Monitor, Laptop, Battery, BatteryCharging,
  // Network
  ArrowUp, ArrowDown, ArrowUpDown, Wifi, WifiOff, Globe, Network, Signal,
  // Weather / Environment
  Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, Snowflake, Zap,
  // Status / Alert
  Activity, AlertTriangle, AlertCircle, CheckCircle, XCircle, Info, Bell,
  // Time
  Clock, Timer, Calendar,
  // Dev / Process
  Terminal, Code, Package, GitBranch, Layers,
  // Metrics
  TrendingUp, TrendingDown, BarChart2, Gauge,
  // Misc
  Volume2, VolumeX, Star, Heart, Home, Music,
};

/**
 * Normalize any icon name to PascalCase for registry lookup.
 * Supports kebab-case ("cloud-rain" → "CloudRain"),
 * lowercase ("cpu" → "Cpu"), and PascalCase passthrough ("ArrowUp" → "ArrowUp").
 */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function IconFromName({
  name,
  size = 14,
  ...rest
}: { name: string; size?: number } & LucideProps) {
  const Icon = registry[name] ?? registry[toPascalCase(name)];
  if (!Icon) return null;
  return <Icon size={size} {...rest} />;
}
