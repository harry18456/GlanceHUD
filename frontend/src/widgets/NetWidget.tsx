import { ArrowUpDown } from "lucide-react";
import { NetCard } from "../components/NetCard";

interface NetData {
  up: number;
  down: number;
}

export function NetWidget({ data }: { data: any }) {
  const net = data.value as NetData;
  return <NetCard up={net.up} down={net.down} />;
}
