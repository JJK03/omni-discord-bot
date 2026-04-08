import { Server } from "lucide-react";

interface GuildIconProps {
  iconURL?: string;
  name: string;
  size?: "sm" | "md";
}

const SIZE_CLASSES = {
  sm: { container: "w-5 h-5", icon: "w-3 h-3" },
  md: { container: "w-6 h-6", icon: "w-3.5 h-3.5" },
} as const;

export function GuildIcon({ iconURL, name, size = "sm" }: GuildIconProps) {
  const { container: cls, icon: iconCls } = SIZE_CLASSES[size];
  return iconURL ? (
    <img src={iconURL} alt={name} className={`${cls} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-primary-500/20 flex items-center justify-center shrink-0`}>
      <Server className={`${iconCls} text-primary-400`} />
    </div>
  );
}
