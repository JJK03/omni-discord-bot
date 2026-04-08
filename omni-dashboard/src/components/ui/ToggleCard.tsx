
import type { LucideIcon } from "lucide-react";

interface ToggleCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  isActive: boolean;
  accentClass: string;
  accentBgClass: string;
  onToggle: () => void;
}

export default function ToggleCard({
  icon: Icon,
  label,
  description,
  isActive,
  accentClass,
  accentBgClass,
  onToggle,
}: ToggleCardProps) {
  return (
    <div
      className={`glass-panel flex flex-col justify-between gap-4 transition-all duration-300 cursor-pointer group ${
        isActive
          ? "border-surface-600 hover:border-primary-500/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] bg-surface-800"
          : "border-surface-800 hover:border-surface-700/80 opacity-80 bg-surface-900"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div
          className={`p-3 rounded-xl transition-colors duration-300 border border-white/5 ${
            isActive ? accentBgClass : "bg-surface-800"
          }`}
        >
          <Icon
            className={`w-5 h-5 transition-colors duration-300 ${
              isActive ? accentClass : "text-surface-500"
            }`}
          />
        </div>
        <label
          className="relative inline-flex items-center cursor-pointer shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isActive}
            onChange={onToggle}
          />
          <div
            className="w-11 h-6 bg-surface-700/80 outline-none rounded-full peer
                          peer-checked:after:translate-x-[20px] peer-checked:after:border-white
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                          after:bg-white after:border-gray-300 after:border after:rounded-full
                          after:h-[20px] after:w-[20px] after:transition-all duration-300
                          peer-checked:bg-primary-500 border border-white/10 shadow-inner"
          ></div>
        </label>
      </div>
      <div>
        <h4
          className={`text-sm font-semibold tracking-wide mb-1.5 transition-colors duration-300 ${
            isActive ? "text-white" : "text-surface-300"
          }`}
        >
          {label}
        </h4>
        <p className="text-xs text-surface-400 leading-relaxed max-h-10 overflow-hidden line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
