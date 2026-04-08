import React from "react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  bgClass,
}: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-center gap-4">
        <div
          className={`p-3.5 rounded-xl ${bgClass} transition-colors duration-300 border border-white/5`}
        >
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div className="flex flex-col">
          <span className="stat-label mb-1 group-hover:text-surface-200 transition-colors">
            {label}
          </span>
          <span className="stat-value">{value}</span>
        </div>
      </div>
    </div>
  );
}
