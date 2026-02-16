import { CpuWidget } from "./widgets/CpuWidget";
import { MemWidget } from "./widgets/MemWidget";
import { DiskWidget } from "./widgets/DiskWidget";
import { NetWidget } from "./widgets/NetWidget";

export const WIDGET_REGISTRY: Record<string, React.ComponentType<{ data: any }>> = {
  cpu: CpuWidget,
  mem: MemWidget,
  disk: DiskWidget,
  net: NetWidget,
};
