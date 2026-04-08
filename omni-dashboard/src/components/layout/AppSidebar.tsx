import { useState, useRef, useEffect } from "react";
import {
  Bot,
  LayoutDashboard,
  Shield,
  ChevronDown,
  Server,
  Settings,
} from "lucide-react";
import type { TabKey } from "./Tabs";
import type { GuildInfo } from "./GuildSelector";
import { GuildIcon } from "@/components/ui/GuildIcon";

interface AppSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  guilds: GuildInfo[];
  selectedGuildId: string | null;
  onGuildSelect: (id: string) => void;
  activeModuleCount: number;
  totalModuleCount: number;
}

const NAV_ITEMS: {
  key: TabKey;
  label: string;
  icon: typeof Bot;
  color: string;
  activeBg: string;
  activeBorder: string;
}[] = [
  {
    key: "server",
    label: "기능 관리",
    icon: Shield,
    color: "text-[#5865F2]",
    activeBg: "bg-[#5865F2]/10",
    activeBorder: "border-[#5865F2]/30",
  },
  {
    key: "member",
    label: "서버 관리",
    icon: Bot,
    color: "text-[#5865F2]",
    activeBg: "bg-[#5865F2]/10",
    activeBorder: "border-[#5865F2]/30",
  },
];

export default function AppSidebar({
  activeTab,
  onTabChange,
  guilds,
  selectedGuildId,
  onGuildSelect,
  activeModuleCount,
  totalModuleCount,
}: AppSidebarProps) {
  const selectedGuild = guilds.find((g) => g.id === selectedGuildId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-[#2F3136] border-r border-white/5 z-20">
      {/* 상단 로고 / 브랜드 */}
      <div className="px-4 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4 text-[#5865F2]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-[#FFFFFF] truncate">
              Omni Bot
            </span>
            <span className="text-[11px] text-[#b9bbbe] truncate">
              All-in-One Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* 서버 선택기 */}
      <div className="px-3 pt-4 pb-3">
        <p className="text-[10px] font-semibold text-[#b9bbbe] uppercase tracking-widest px-2 mb-2">
          서버
        </p>
        {guilds.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-900 border border-white/5 text-[#b9bbbe] text-xs">
            <Server className="w-4 h-4" />
            <span>연결된 서버 없음</span>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            {/* 트리거 버튼 */}
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center gap-2.5 bg-surface-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#FFFFFF] hover:bg-surface-800 transition-colors cursor-pointer"
            >
              <GuildIcon
                iconURL={selectedGuild?.iconURL}
                name={selectedGuild?.name ?? ""}
              />
              <span className="flex-1 truncate text-left font-medium">
                {selectedGuild?.name ?? "서버 선택"}
              </span>
              {selectedGuild?.memberCount && (
                <span className="text-[10px] text-[#b9bbbe] shrink-0">
                  {selectedGuild.memberCount.toLocaleString()}명
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#b9bbbe] shrink-0 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* 드롭다운 목록 */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-900 border border-white/10 rounded-lg overflow-hidden shadow-xl z-50">
                {guilds.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onGuildSelect(g.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-surface-800 ${g.id === selectedGuildId ? "bg-surface-800 text-[#FFFFFF]" : "text-[#dcddde]"}`}
                  >
                    <GuildIcon iconURL={g.iconURL} name={g.name} />
                    <span className="truncate">{g.name}</span>
                    {g.memberCount && (
                      <span className="text-[10px] text-[#b9bbbe] ml-auto shrink-0">
                        {g.memberCount.toLocaleString()}명
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 봇 네비게이션 */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[#b9bbbe] uppercase tracking-widest px-2 mb-2">
          기능 관리
        </p>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onTabChange(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border
                    ${
                      isActive
                        ? `${item.activeBg} ${item.color} ${item.activeBorder}`
                        : "text-[#b9bbbe] hover:text-[#FFFFFF] hover:bg-surface-800 border-transparent"
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? item.color : "text-[#b9bbbe]"}`}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 하단 통계 */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between px-2 py-2.5 rounded-lg bg-surface-900 border border-white/5">
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-[#b9bbbe]" />
            <span className="text-xs text-[#b9bbbe]">활성 모듈</span>
          </div>
          <span className="text-xs font-bold text-[#FFFFFF]">
            {activeModuleCount}
            <span className="text-[#b9bbbe] font-normal">
              {" "}
              / {totalModuleCount}
            </span>
          </span>
        </div>
        <div className="mt-2 px-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2] animate-pulse" />
            <span className="text-[10px] text-[#b9bbbe]">시스템 온라인</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
