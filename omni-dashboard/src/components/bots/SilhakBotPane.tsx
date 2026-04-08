import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Edit3, Save } from "lucide-react";
import type {
  FeatureKey,
  SilhakRoleSettings,
} from "../../hooks/useDashboardState";

interface SilhakBotPaneProps {
  botMessages: {
    welcomeTitle: string;
    welcomeDesc: string;
    welcomeChannelId: string;
    leaveTitle: string;
    leaveDesc: string;
    leaveChannelId: string;
  };
  onSave: (messages: any) => void;
  botFeatures: Record<FeatureKey, boolean>;
  handleToggleFeature: (key: FeatureKey) => void;
}

/** 인라인 토글 스위치 */
function InlineToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="relative inline-flex items-center cursor-pointer shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
      />
      <div
        className="w-11 h-6 bg-surface-700/80 outline-none rounded-full peer
                    peer-checked:after:translate-x-[20px] peer-checked:after:border-white
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                    after:bg-white after:border-gray-300 after:border after:rounded-full
                    after:h-[20px] after:w-[20px] after:transition-all duration-300
                    peer-checked:bg-primary-500 border border-white/10 shadow-inner"
      />
    </label>
  );
}

export default function SilhakBotPane({
  botMessages,
  onSave,
  botFeatures,
  handleToggleFeature,
  silhakRoleSettings,
  onSaveRoles,
}: SilhakBotPaneProps & {
  silhakRoleSettings: SilhakRoleSettings;
  onSaveRoles: (settings: SilhakRoleSettings) => void;
}) {
  const [localMessages, setLocalMessages] = useState(botMessages);
  const [localRoles, setLocalRoles] = useState(silhakRoleSettings);

  // 상위 상태 동기화
  useEffect(() => {
    setLocalMessages(botMessages);
  }, [botMessages]);

  useEffect(() => {
    if (silhakRoleSettings) {
      setLocalRoles(silhakRoleSettings);
    }
  }, [silhakRoleSettings]);

  const handleChange = (key: keyof typeof localMessages, value: string) => {
    setLocalMessages((prev) => ({ ...prev, [key]: value }));
  };

  const handleRoleChange = (key: keyof SilhakRoleSettings, value: any) => {
    setLocalRoles((prev) => ({ ...prev, [key]: value }));
  };

  const addRoleOption = () => {
    setLocalRoles((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { id: Date.now().toString(), label: "", emoji: "", roleId: "" },
      ],
    }));
  };

  const updateRoleOption = (id: string, key: string, value: string) => {
    setLocalRoles((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.id === id ? { ...opt, [key]: value } : opt,
      ),
    }));
  };

  const removeRoleOption = (id: string) => {
    setLocalRoles((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.id !== id),
    }));
  };

  const handleSave = () => {
    onSave(localMessages);
  };

  const handleSaveRoles = () => {
    onSaveRoles(localRoles);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#5865F2]/10 rounded-xl border border-[#5865F2]/20">
          <Edit3 className="w-5 h-5 text-[#5865F2]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#FFFFFF] tracking-wide">
            안내 메시지
          </h3>
          <p className="text-sm text-[#b9bbbe]">
            서버 입장 및 퇴장 시 출력될 인사말을 구성합니다. <br />
            <span className="text-xs text-[#5865F2] mix-blend-screen bg-[#5865F2]/20 px-1 py-0.5 rounded">
              {"{user} = 유저 이름, {count} = 서버 멤버 수"}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 입장 메시지 ── */}
        <div
          className={`glass-panel p-6 flex flex-col gap-5 transition-all duration-300 ${
            botFeatures.silhakJoin
              ? "border-[#5865F2]/20 hover:border-[#5865F2]/40"
              : "border-surface-800 opacity-60"
          }`}
        >
          {/* 헤더 + 토글 */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h4 className="font-semibold text-[#FFFFFF] tracking-wide flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#5865F2]" /> 서버 입장 메시지
            </h4>
            <InlineToggle
              checked={botFeatures.silhakJoin}
              onChange={() => handleToggleFeature("silhakJoin")}
            />
          </div>

          {/* 폼 영역 — 비활성 시 상호작용 차단 */}
          <div
            className={`flex flex-col gap-4 transition-opacity duration-300 ${
              botFeatures.silhakJoin
                ? "opacity-100"
                : "opacity-40 pointer-events-none select-none"
            }`}
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                발송 채널 ID
              </label>
              <input
                type="text"
                placeholder="예: 123456789012345678"
                className="input-glass"
                value={localMessages.welcomeChannelId}
                onChange={(e) =>
                  handleChange("welcomeChannelId", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                제목 (Embed Title)
              </label>
              <input
                type="text"
                className="input-glass"
                value={localMessages.welcomeTitle}
                onChange={(e) => handleChange("welcomeTitle", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                내용 (Embed Description)
              </label>
              <textarea
                className="input-glass resize-y min-h-[100px]"
                value={localMessages.welcomeDesc}
                onChange={(e) => handleChange("welcomeDesc", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── 퇴장 메시지 ── */}
        <div
          className={`glass-panel p-6 flex flex-col gap-5 transition-all duration-300 ${
            botFeatures.silhakLeave
              ? "border-[#5865F2]/20 hover:border-[#5865F2]/40"
              : "border-surface-800 opacity-60"
          }`}
        >
          {/* 헤더 + 토글 */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h4 className="font-semibold text-[#FFFFFF] tracking-wide flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-[#5865F2]" /> 서버 퇴장 메시지
            </h4>
            <InlineToggle
              checked={botFeatures.silhakLeave}
              onChange={() => handleToggleFeature("silhakLeave")}
            />
          </div>

          {/* 폼 영역 */}
          <div
            className={`flex flex-col gap-4 transition-opacity duration-300 ${
              botFeatures.silhakLeave
                ? "opacity-100"
                : "opacity-40 pointer-events-none select-none"
            }`}
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                발송 채널 ID
              </label>
              <input
                type="text"
                placeholder="예: 123456789012345678"
                className="input-glass"
                value={localMessages.leaveChannelId}
                onChange={(e) => handleChange("leaveChannelId", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                제목 (Embed Title)
              </label>
              <input
                type="text"
                className="input-glass"
                value={localMessages.leaveTitle}
                onChange={(e) => handleChange("leaveTitle", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                내용 (Embed Description)
              </label>
              <textarea
                className="input-glass resize-y min-h-[100px]"
                value={localMessages.leaveDesc}
                onChange={(e) => handleChange("leaveDesc", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> 메시지 저장하기
        </button>
      </div>

      {/* ── 역할 부여 세팅 ── */}
      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#5865F2]/10 rounded-xl border border-[#5865F2]/20">
            <Edit3 className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#FFFFFF] tracking-wide">
              역할 부여 버튼 설정
            </h3>
            <p className="text-sm text-[#b9bbbe]">
              디스코드 채널에 역할 부여 메시지와 버튼을 생성합니다. "/역할세팅"
              명령어 사용 시 아래 설정이 적용됩니다.
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-6 border-[#5865F2]/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                발송 채널 ID
              </label>
              <input
                type="text"
                placeholder="예: 123456789012345678"
                className="input-glass"
                value={localRoles?.channelId || ""}
                onChange={(e) => handleRoleChange("channelId", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                메시지 제목
              </label>
              <input
                type="text"
                placeholder="역할 선택"
                className="input-glass"
                value={localRoles?.messageTitle || ""}
                onChange={(e) =>
                  handleRoleChange("messageTitle", e.target.value)
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
              메시지 내용
            </label>
            <textarea
              placeholder="버튼을 눌러 역할을 선택하세요."
              className="input-glass resize-y min-h-[80px]"
              value={localRoles?.messageDescription || ""}
              onChange={(e) =>
                handleRoleChange("messageDescription", e.target.value)
              }
            />
          </div>

          {/* 관리자 승인 모드 */}
          <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#FFFFFF]">
                  관리자 승인 모드
                </p>
                <p className="text-xs text-[#b9bbbe] mt-0.5">
                  활성화 시 버튼 클릭 → 닉네임 입력 모달 → 관리자 채널에서 승인
                  후 역할 부여
                </p>
              </div>
              <InlineToggle
                checked={localRoles?.requireApproval ?? false}
                onChange={() =>
                  handleRoleChange(
                    "requireApproval",
                    !localRoles?.requireApproval,
                  )
                }
              />
            </div>

            {localRoles?.requireApproval && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                  관리자 승인 채널 ID
                </label>
                <input
                  type="text"
                  placeholder="예: 123456789012345678"
                  className="input-glass"
                  value={localRoles?.approvalChannelId || ""}
                  onChange={(e) =>
                    handleRoleChange("approvalChannelId", e.target.value)
                  }
                />
                <p className="text-xs text-[#b9bbbe]">
                  역할 신청이 들어오면 이 채널에 승인/거절 버튼이 포함된
                  임베드가 전송됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 성별 역할 설정 */}
          <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-sm font-semibold text-[#FFFFFF]">
                성별 역할 설정
              </p>
              <p className="text-xs text-[#b9bbbe] mt-0.5">
                역할 버튼 클릭 시 성별 선택 후 해당 역할이 함께 부여됩니다.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                  🙋‍♂️ 남자 역할 ID
                </label>
                <input
                  type="text"
                  placeholder="예: 123456789012345678"
                  className="input-glass"
                  value={localRoles?.maleRoleId || ""}
                  onChange={(e) =>
                    handleRoleChange("maleRoleId", e.target.value)
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#b9bbbe] uppercase">
                  🙋‍♀️ 여자 역할 ID
                </label>
                <input
                  type="text"
                  placeholder="예: 123456789012345678"
                  className="input-glass"
                  value={localRoles?.femaleRoleId || ""}
                  onChange={(e) =>
                    handleRoleChange("femaleRoleId", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#b9bbbe] uppercase mb-3 block">
              버튼 옵션 (최대 5개)
            </label>
            <div className="flex flex-col gap-3">
              {localRoles?.options?.map((opt, index) => (
                <div
                  key={opt.id}
                  className="flex flex-col sm:flex-row items-center gap-3 bg-surface-800 p-3 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-mono text-[#b9bbbe] w-5">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="이모지 (예: 🎮)"
                      className="input-glass w-full sm:w-28 text-center"
                      value={opt.emoji}
                      onChange={(e) =>
                        updateRoleOption(opt.id, "emoji", e.target.value)
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="버튼 라벨 (예: 게이머)"
                    className="input-glass flex-1"
                    value={opt.label}
                    onChange={(e) =>
                      updateRoleOption(opt.id, "label", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="역할 ID"
                    className="input-glass flex-1"
                    value={opt.roleId}
                    onChange={(e) =>
                      updateRoleOption(opt.id, "roleId", e.target.value)
                    }
                  />
                  <button
                    onClick={() => removeRoleOption(opt.id)}
                    className="p-2.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="옵션 삭제"
                  >
                    삭제
                  </button>
                </div>
              ))}

              {(!localRoles?.options || localRoles.options.length < 5) && (
                <button
                  onClick={addRoleOption}
                  className="w-full py-3 border border-dashed border-white/20 rounded-xl text-sm font-medium text-[#dcddde] hover:text-[#FFFFFF] hover:border-white/40 hover:bg-surface-800 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> 버튼 옵션 추가
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveRoles}
              className="btn-primary flex items-center gap-2 !bg-[#5865F2] hover:!bg-[#4752C4] focus:!ring-[#5865F2]/50"
            >
              <Save className="w-4 h-4" /> 역할 설정 저장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
