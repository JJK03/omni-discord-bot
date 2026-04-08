import { useState } from "react";
import LiquidBackground from "./components/layout/LiquidBackground";
import type { TabKey } from "./components/layout/Tabs";
import AppSidebar from "./components/layout/AppSidebar";
import ShoongBotPane from "./components/bots/ShoongBotPane";
import SilhakBotPane from "./components/bots/SilhakBotPane";
import { useDashboardState } from "./hooks/useDashboardState";
import { useGuilds } from "./hooks/useGuilds";
import { MODULE_DEFS } from "./hooks/useDashboardState";
import { Activity, Cpu, ServerOff, Bot, Shield, Hash, Zap } from "lucide-react";

const PAGE_META: Record<
  TabKey,
  { title: string; subtitle: string; icon: typeof Bot; color: string }
> = {
  server: {
    title: "기능 관리",
    subtitle: "서버 관리 및 유틸리티 기능 제어",
    icon: Shield,
    color: "text-[#5865F2]",
  },
  member: {
    title: "서버 관리",
    subtitle: "입퇴장 메시지 및 역할 부여 설정",
    icon: Bot,
    color: "text-[#5865F2]",
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("server");
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);

  const { guilds, loading: guildsLoading } = useGuilds((firstId) => {
    setSelectedGuildId(firstId);
  });

  const {
    recentLogs,
    temporaryNicknames,
    temporaryChannels,
    botFeatures,
    botMessages,
    silhakRoleSettings,
    handleToggleFeature,
    handleSaveMessages,
    handleForceRevertNickname,
    handleSaveSilhakRoles,
  } = useDashboardState(selectedGuildId);

  const activeModuleCount = Object.keys(botFeatures).filter(
    (k) => botFeatures[k as keyof typeof botFeatures],
  ).length;

  const page = PAGE_META[activeTab];
  const PageIcon = page.icon;

  // 현재 탭의 모듈 수 계산
  const currentTabModules = MODULE_DEFS.filter(
    (m) => m.botTarget === activeTab,
  );
  const currentActiveModules = currentTabModules.filter(
    (m) => botFeatures[m.key],
  ).length;

  return (
    <div className="flex min-h-screen relative">
      <LiquidBackground />

      {/* 사이드바 */}
      {!guildsLoading && (
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          guilds={guilds}
          selectedGuildId={selectedGuildId}
          onGuildSelect={setSelectedGuildId}
          activeModuleCount={activeModuleCount}
          totalModuleCount={MODULE_DEFS.length}
        />
      )}

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-10 bg-[#36393F] border-b border-white/5 px-8 py-4">
          <div className="flex items-center justify-between max-w-6xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg bg-surface-800 border border-white/5`}
              >
                <PageIcon className={`w-4 h-4 ${page.color}`} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#FFFFFF]">
                  {page.title}
                </h1>
                <p className="text-xs text-[#b9bbbe]">{page.subtitle}</p>
              </div>
            </div>

            {/* 상단 통계 칩 */}
            {selectedGuildId && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-xs text-[#b9bbbe]">
                  <Hash className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>
                    임시채널{" "}
                    <span className="text-[#FFFFFF] font-semibold">
                      {temporaryChannels.length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-white/5 text-xs text-[#b9bbbe]">
                  <Zap className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>
                    활성 모듈{" "}
                    <span className="text-[#FFFFFF] font-semibold">
                      {activeModuleCount}/{MODULE_DEFS.length}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 컨텐츠 영역 */}
        <main className="flex-1 px-8 py-6 overflow-y-auto">
          {guildsLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3 text-[#b9bbbe]">
                <div className="w-8 h-8 border-2 border-surface-600 border-t-[#5865F2] rounded-full animate-spin" />
                <p className="text-sm">서버 불러오는 중...</p>
              </div>
            </div>
          ) : !selectedGuildId ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-[#b9bbbe]">
              <ServerOff className="w-12 h-12" />
              <p className="text-lg font-semibold text-[#dcddde]">
                관리할 서버를 선택해주세요.
              </p>
              <p className="text-sm">
                봇이 입장한 서버가 없거나 아직 등록 중입니다.
              </p>
            </div>
          ) : (
            <div className="max-w-6xl">
              {/* 통계 카드 행 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="활성 모듈"
                  value={`${currentActiveModules}`}
                  sub={`/ ${currentTabModules.length} 전체`}
                  accent="text-[#5865F2]"
                  bg="bg-[#5865F2]/10"
                  border="border-[#5865F2]/20"
                  icon={<Zap className="w-4 h-4 text-[#5865F2]" />}
                />
                <StatCard
                  title="임시 채널"
                  value={`${temporaryChannels.length}`}
                  sub="현재 활성"
                  accent="text-[#5865F2]"
                  bg="bg-[#5865F2]/10"
                  border="border-[#5865F2]/20"
                  icon={<Hash className="w-4 h-4 text-[#5865F2]" />}
                />
                <StatCard
                  title="임시 닉네임"
                  value={`${temporaryNicknames.length}`}
                  sub="현재 적용 중"
                  accent="text-[#5865F2]"
                  bg="bg-[#5865F2]/10"
                  border="border-[#5865F2]/20"
                  icon={<Cpu className="w-4 h-4 text-[#5865F2]" />}
                />
                <StatCard
                  title="최근 로그"
                  value={`${recentLogs.length}`}
                  sub="최근 5건"
                  accent="text-[#5865F2]"
                  bg="bg-[#5865F2]/10"
                  border="border-[#5865F2]/20"
                  icon={<Activity className="w-4 h-4 text-[#5865F2]" />}
                />
              </div>

              {/* 봇 패널 */}
              <div className="transition-all duration-500">
                {activeTab === "server" && (
                  <ShoongBotPane
                    temporaryNicknames={temporaryNicknames}
                    temporaryChannels={temporaryChannels}
                    botFeatures={botFeatures}
                    handleToggleFeature={handleToggleFeature}
                    handleForceRevertNickname={handleForceRevertNickname}
                  />
                )}
                {activeTab === "member" && (
                  <SilhakBotPane
                    botMessages={botMessages}
                    onSave={handleSaveMessages}
                    botFeatures={botFeatures}
                    handleToggleFeature={handleToggleFeature}
                    silhakRoleSettings={silhakRoleSettings}
                    onSaveRoles={handleSaveSilhakRoles}
                  />
                )}
              </div>

              {/* 최근 활동 로그 (server 탭) */}
              {activeTab === "server" && recentLogs.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm font-bold text-[#dcddde] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-[#5865F2]" />
                    최근 활동 로그
                  </h3>
                  <div className="glass-panel p-0 overflow-hidden border border-white/5">
                    <div className="divide-y divide-white/5">
                      {recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 hover:bg-surface-800 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-surface-950 border border-white/5 shadow-inner">
                              <Cpu className="w-4 h-4 text-[#5865F2]" />
                            </div>
                            <div>
                              <p className="text-sm text-[#dcddde]">
                                <span className="font-semibold text-[#FFFFFF]">
                                  {log.moderator}
                                </span>
                                님이
                                {log.targetUser && (
                                  <span className="font-semibold text-[#5865F2] mx-1">
                                    {log.targetUser}
                                  </span>
                                )}{" "}
                                대상에게{" "}
                                <span className="font-semibold text-[#dcddde] mx-1">
                                  [{log.action}]
                                </span>{" "}
                                조치를 취했습니다.
                              </p>
                              {log.reason && (
                                <p className="text-xs text-[#b9bbbe] mt-1">
                                  사유: {log.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-[#b9bbbe] font-mono whitespace-nowrap bg-surface-950 px-2.5 py-1 rounded-md">
                            {log.timestamp?.toDate().toLocaleString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  sub: string;
  accent: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, sub, bg, border, icon }: StatCardProps) {
  return (
    <div
      className={`${bg} ${border} border rounded-xl p-4 flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#b9bbbe]">{title}</span>
        <div className="p-1.5 rounded-lg bg-surface-950">{icon}</div>
      </div>
      <div>
        <span className="text-2xl font-bold text-[#FFFFFF]">{value}</span>
        <span className="text-xs text-[#b9bbbe] ml-2">{sub}</span>
      </div>
    </div>
  );
}
