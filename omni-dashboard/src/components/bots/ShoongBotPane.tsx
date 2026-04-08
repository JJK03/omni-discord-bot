import { useState } from "react";
import {
  Clock,
  Edit3,
  Zap,
  Shield,
  HelpCircle,
  MessageCircle,
  Hash,
  Music,
  UserX,
  Ticket,
  ChevronDown,
  ShieldBan,
  Gamepad2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ToggleCard from "../ui/ToggleCard";
import { MODULE_DEFS } from "../../hooks/useDashboardState";
import type {
  FeatureKey,
  TemporaryNickname,
  TemporaryChannel,
  ModuleCategory,
} from "../../hooks/useDashboardState";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Shield,
  ShieldBan,
  Clock,
  Edit3,
  Hash,
  Music,
  UserSecret: UserX,
  MessageCircle,
  Ticket,
  Gamepad2,
};

// 카테고리 메타 정보
const CATEGORY_META: Record<
  ModuleCategory,
  { icon: LucideIcon; accent: string; accentBg: string; desc: string }
> = {
  관리: {
    icon: Shield,
    accent: "text-[#5865F2]",
    accentBg: "bg-[#5865F2]/10",
    desc: "추방, 차단, 메시지 정리 등 서버 관리 기능",
  },
  유틸리티: {
    icon: Zap,
    accent: "text-[#5865F2]",
    accentBg: "bg-[#5865F2]/10",
    desc: "임시 채널, 닉네임, 음악 등 편의 기능",
  },
  소통: {
    icon: MessageCircle,
    accent: "text-[#5865F2]",
    accentBg: "bg-[#5865F2]/10",
    desc: "익명 메시지, 티켓 등 커뮤니케이션 기능",
  },
};

const CATEGORY_ORDER: ModuleCategory[] = ["관리", "유틸리티", "소통"];

const formatDate = (timestamp: any) => {
  if (!timestamp) return "알 수 없음";
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

interface ShoongBotPaneProps {
  temporaryNicknames: TemporaryNickname[];
  temporaryChannels: TemporaryChannel[];
  botFeatures: Record<FeatureKey, boolean>;
  handleToggleFeature: (key: FeatureKey) => void;
  handleForceRevertNickname: (id: string) => void;
}

export default function ShoongBotPane({
  temporaryNicknames,
  temporaryChannels,
  botFeatures,
  handleToggleFeature,
  handleForceRevertNickname,
}: ShoongBotPaneProps) {
  const shoongModules = MODULE_DEFS.filter((mod) => mod.botTarget === "server");

  // 카테고리별로 그룹핑
  const groupedModules = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    modules: shoongModules.filter((m) => m.category === cat),
  })).filter((g) => g.modules.length > 0);

  // 카테고리 접기/펼치기 상태
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 카테고리별 모듈 관리 */}
      {groupedModules.map(({ category, modules }) => {
        const meta = CATEGORY_META[category];
        const CatIcon = meta.icon;
        const isCollapsed = collapsed[category] ?? false;
        const activeCount = modules.filter((m) => botFeatures[m.key]).length;

        return (
          <div key={category}>
            {/* 카테고리 헤더 - 클릭으로 접기/펼치기 */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between gap-3 mb-4 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 ${meta.accentBg} rounded-xl border border-white/10`}
                >
                  <CatIcon className={`w-4 h-4 ${meta.accent}`} />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    {category}
                    <span className="text-xs font-medium text-surface-500">
                      {activeCount}/{modules.length} 활성
                    </span>
                  </h3>
                  <p className="text-xs text-surface-500">{meta.desc}</p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-surface-500 transition-transform duration-300 ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
            </button>

            {/* 모듈 그리드 (애니메이션 전환) */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden transition-all duration-400 ease-in-out ${
                isCollapsed
                  ? "max-h-0 opacity-0 mb-0"
                  : "max-h-[1000px] opacity-100 mb-2"
              }`}
            >
              {modules.map((mod) => {
                const IconComp = ICON_MAP[mod.iconName] || HelpCircle;
                return (
                  <ToggleCard
                    key={mod.key}
                    icon={IconComp}
                    label={mod.label}
                    description={mod.description}
                    isActive={botFeatures[mod.key]}
                    accentClass={mod.accent}
                    accentBgClass={mod.accentBg}
                    onToggle={() => handleToggleFeature(mod.key)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 임시 채널 목록 */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[#dcddde] uppercase tracking-widest flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#5865F2]" />
            활성화된 임시 채널 목록
          </h3>
          <span className="bg-[#5865F2]/20 text-[#5865F2] text-xs font-bold px-2.5 py-1 rounded-full border border-[#5865F2]/30 shadow-inner">
            {temporaryChannels.length}
          </span>
        </div>

        {temporaryChannels.length > 0 ? (
          <div className="flex flex-col gap-3">
            {temporaryChannels.map((ch) => (
              <div
                key={ch.id}
                className="bg-surface-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 shadow-sm hover:border-[#5865F2]/40 hover:bg-surface-800 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-700/80 border border-white/10 flex items-center justify-center shadow-inner">
                    <Hash className="w-4 h-4 text-[#5865F2]" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#FFFFFF] tracking-wide">
                      {ch.channelName || ch.channelId}
                    </span>
                    <p className="text-xs text-[#b9bbbe] mt-0.5">
                      생성자: {ch.createdBy}
                    </p>
                  </div>
                </div>
                <div className="text-[#b9bbbe] bg-surface-950/50 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(ch.expiresAt)} 만료</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-surface-900 rounded-xl border border-white/5 border-dashed">
            <p className="text-[#b9bbbe] text-sm">
              현재 활성화된 임시 채널이 없습니다.
            </p>
          </div>
        )}
      </div>

      {/* 임시 닉네임 목록 */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[#dcddde] uppercase tracking-widest flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#5865F2]" />
            활성화된 임시 닉네임 목록
          </h3>
          <span className="bg-[#5865F2]/20 text-[#5865F2] text-xs font-bold px-2.5 py-1 rounded-full border border-[#5865F2]/30 shadow-inner">
            {temporaryNicknames.length}
          </span>
        </div>

        {temporaryNicknames.length > 0 ? (
          <div className="flex flex-col gap-3">
            {temporaryNicknames.map((nick) => (
              <div
                key={nick.id}
                className="bg-surface-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 shadow-sm hover:border-[#5865F2]/40 hover:bg-surface-800 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-700/80 border border-white/10 flex items-center justify-center text-sm font-bold text-[#FFFFFF] shadow-inner">
                    {nick.userTag.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#FFFFFF] tracking-wide">
                        {nick.userTag}
                      </span>
                      <span className="text-[#b9bbbe] text-xs">→</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-[#5865F2]/15 text-[#5865F2] font-medium text-sm border border-[#5865F2]/20">
                        {nick.newNickname}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-[#b9bbbe] bg-surface-950/50 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2 font-mono text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(nick.expiresAt)} 만료</span>
                  </div>
                  <button
                    onClick={() => handleForceRevertNickname(nick.id)}
                    className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-400/20"
                  >
                    원상복구
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-surface-900 rounded-xl border border-white/5 border-dashed">
            <p className="text-[#b9bbbe] text-sm">
              현재 활성화된 임시 닉네임이 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
