import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export function AnimatedNumber({ value, decimals = 1, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return ctrl.stop;
  }, [value, mv]);

  return <motion.span>{display}</motion.span>;
}
