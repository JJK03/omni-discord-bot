import React from "react";

export type TabKey = "server" | "member";

interface TabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export default function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <div className="flex w-full mb-8 relative">
      <div className="p-1.5 bg-surface-900/60 backdrop-blur-md rounded-2xl border border-white/10 flex gap-2 w-full sm:w-auto overflow-x-auto shadow-lg">
        <TabButton
          isActive={activeTab === "server"}
          onClick={() => onChange("server")}
          activeBg="bg-primary-500/20"
        >
          <span className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold mr-2">
            S
          </span>
          서버 관리
        </TabButton>

        <TabButton
          isActive={activeTab === "member"}
          onClick={() => onChange("member")}
          activeBg="bg-amber-500/20"
        >
          <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold mr-2">
            M
          </span>
          멤버 관리
        </TabButton>
      </div>
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeBg: string;
}

function TabButton({ isActive, onClick, children, activeBg }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center whitespace-nowrap outline-none
        ${isActive ? `text-white shadow-sm ${activeBg} border border-white/10` : "text-surface-400 hover:text-white hover:bg-surface-800 border border-transparent"}
      `}
    >
      {children}
    </button>
  );
}
