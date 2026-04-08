import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";

export interface BotLog {
  id: string;
  action: string;
  targetUser?: string;
  moderator: string;
  reason?: string;
  timestamp: Timestamp;
  guildId?: string;
}

export interface TemporaryNickname {
  id: string;
  userId: string;
  userTag: string;
  moderator: string;
  newNickname: string;
  originalNickname?: string;
  expiresAt: Timestamp;
  status: "pending" | "active" | "error" | "force_revert";
  guildId?: string;
}

export interface TemporaryChannel {
  id: string;
  channelId: string;
  channelName: string;
  createdBy: string;
  expiresAt: Timestamp;
  guildId?: string;
}

export interface RoleButtonOption {
  id: string;
  label: string;
  emoji: string;
  roleId: string;
}

export interface SilhakRoleSettings {
  channelId: string;
  messageTitle: string;
  messageDescription: string;
  options: RoleButtonOption[];
  requireApproval: boolean;
  approvalChannelId: string;
  maleRoleId: string;
  femaleRoleId: string;
}

export type BotTarget = "server" | "member";
export type ModuleCategory = "관리" | "유틸리티" | "소통";

export const MODULE_DEFS = [
  {
    key: "kick" as const,
    label: "추방 기능",
    description: "명령어로 특정 사용자를 추방 가능하게 합니다.",
    iconName: "UserX",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    botTarget: "server" as BotTarget,
    category: "관리" as ModuleCategory,
  },
  {
    key: "silhakAvatar" as const,
    label: "아바타 확대",
    description: "사용자의 프로필 사진을 확대해서 보여줍니다",
    iconName: "User",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10",
    botTarget: "member" as BotTarget,
    category: "유틸리티" as ModuleCategory,
  },
  {
    key: "ban" as const,
    label: "차단 기능",
    description: "명령어로 특정 사용자를 영구 차단 가능하게 합니다.",
    iconName: "ShieldBan",
    accent: "text-red-400",
    accentBg: "bg-red-500/10",
    botTarget: "server" as BotTarget,
    category: "관리" as ModuleCategory,
  },
  {
    key: "clean" as const,
    label: "채널 텍스트 정리",
    description: "명령어로 특정 개수만큼 메시지를 일괄 삭제합니다.",
    iconName: "MessageCircle",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
    botTarget: "server" as BotTarget,
    category: "관리" as ModuleCategory,
  },
  {
    key: "tempChannel" as const,
    label: "임시 채널",
    description: "지정된 시간 후 자동 삭제되는 임시 채널을 생성합니다.",
    iconName: "Hash",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10",
    botTarget: "server" as BotTarget,
    category: "유틸리티" as ModuleCategory,
  },
  {
    key: "tempNickname" as const,
    label: "임시 닉네임",
    description: "특정 유저의 닉네임을 일정 기간 동안 변경합니다.",
    iconName: "Edit3",
    accent: "text-purple-400",
    accentBg: "bg-purple-500/10",
    botTarget: "server" as BotTarget,
    category: "유틸리티" as ModuleCategory,
  },
  {
    key: "music" as const,
    label: "노래 재생 봇",
    description: "음성채널에서 유튜브 링크/검색어로 음악을 재생합니다.",
    iconName: "Music",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    botTarget: "server" as BotTarget,
    category: "유틸리티" as ModuleCategory,
  },
  {
    key: "anonymousChat" as const,
    label: "익명 소통",
    description:
      "유저가 누구인지 알 수 없게 모달을 띄워 익명 메시지를 전달합니다.",
    iconName: "UserSecret",
    accent: "text-pink-400",
    accentBg: "bg-pink-500/10",
    botTarget: "server" as BotTarget,
    category: "소통" as ModuleCategory,
  },
  {
    key: "silhakJoin" as const,
    label: "입장 환영",
    description: "새로운 유저 입장 시 환영 메시지를 보냅니다.",
    iconName: "Hash",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    botTarget: "member" as BotTarget,
    category: "소통" as ModuleCategory,
  },
  {
    key: "silhakLeave" as const,
    label: "퇴장 인사",
    description: "유저 퇴장 시 작별 메시지를 보냅니다.",
    iconName: "Hash",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    botTarget: "member" as BotTarget,
    category: "소통" as ModuleCategory,
  },
];

export type FeatureKey = (typeof MODULE_DEFS)[number]["key"];

const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  kick: true,
  ban: true,
  clean: true,
  tempChannel: true,
  tempNickname: true,
  music: true,
  anonymousChat: true,
  silhakJoin: true,
  silhakLeave: true,
  silhakAvatar: true,
};

// Firestore 경로 헬퍼: guilds/{guildId}/bot_settings/{doc}
function guildSettingsDoc(guildId: string, docId: string) {
  return doc(db, "guilds", guildId, "bot_settings", docId);
}

export function useDashboardState(selectedGuildId: string | null) {
  const [activeChannelsCount, setActiveChannelsCount] = useState<number>(0);
  const [recentLogs, setRecentLogs] = useState<BotLog[]>([]);
  const [temporaryNicknames, setTemporaryNicknames] = useState<
    TemporaryNickname[]
  >([]);
  const [temporaryChannels, setTemporaryChannels] = useState<
    TemporaryChannel[]
  >([]);

  const [botFeatures, setBotFeatures] =
    useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURES);

  const [botMessages, setBotMessages] = useState({
    welcomeTitle: "",
    welcomeDesc: "",
    welcomeChannelId: "",
    leaveTitle: "",
    leaveDesc: "",
    leaveChannelId: "",
  });

  const [silhakRoleSettings, setSilhakRoleSettings] =
    useState<SilhakRoleSettings>({
      channelId: "",
      messageTitle: "역할 선택",
      messageDescription: "버튼을 눌러 역할을 선택하세요.",
      options: [],
      requireApproval: false,
      approvalChannelId: "",
      maleRoleId: "",
      femaleRoleId: "",
    });

  useEffect(() => {
    if (!selectedGuildId) return;

    // guildId 변경 시 상태 초기화
    setBotFeatures(DEFAULT_FEATURES);
    setBotMessages({
      welcomeTitle: "",
      welcomeDesc: "",
      welcomeChannelId: "",
      leaveTitle: "",
      leaveDesc: "",
      leaveChannelId: "",
    });
    setSilhakRoleSettings({
      channelId: "",
      messageTitle: "역할 선택",
      messageDescription: "버튼을 눌러 역할을 선택하세요.",
      options: [],
      requireApproval: false,
      approvalChannelId: "",
      maleRoleId: "",
      femaleRoleId: "",
    });

    // temporary_channels: guildId 필터
    const unsubChannels = onSnapshot(
      query(
        collection(db, "temporary_channels"),
        where("guildId", "==", selectedGuildId),
      ),
      (snap) => {
        setActiveChannelsCount(snap.size);
        setTemporaryChannels(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TemporaryChannel),
        );
      },
    );

    // bot_logs: guilds/{guildId}/bot_logs 서브컬렉션
    const unsubLogs = onSnapshot(
      query(
        collection(db, "guilds", selectedGuildId, "bot_logs"),
        orderBy("timestamp", "desc"),
        limit(5),
      ),
      (snap) => {
        setRecentLogs(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BotLog),
        );
      },
    );

    // temporary_nicknames: guildId 필터 (복합 인덱스 불필요하도록 클라이언트 정렬)
    const unsubNicknames = onSnapshot(
      query(
        collection(db, "temporary_nicknames"),
        where("guildId", "==", selectedGuildId),
      ),
      (snap) => {
        const nicknames = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as TemporaryNickname)
          .sort((a, b) => (a.expiresAt?.seconds ?? 0) - (b.expiresAt?.seconds ?? 0));
        setTemporaryNicknames(nicknames);
      },
    );

    // guilds/{guildId}/bot_settings/features
    const unsubFeatures = onSnapshot(
      guildSettingsDoc(selectedGuildId, "features"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const features = {} as Record<FeatureKey, boolean>;
          MODULE_DEFS.forEach((m) => {
            features[m.key] = data[m.key] ?? true;
          });
          setBotFeatures(features);
        }
      },
    );

    // guilds/{guildId}/bot_settings/messages
    const unsubMessages = onSnapshot(
      guildSettingsDoc(selectedGuildId, "messages"),
      (docSnap) => {
        if (docSnap.exists())
          setBotMessages((prev) => ({ ...prev, ...docSnap.data() }));
      },
    );

    // guilds/{guildId}/bot_settings/silhak_roles
    const unsubSilhakRoles = onSnapshot(
      guildSettingsDoc(selectedGuildId, "silhak_roles"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSilhakRoleSettings(docSnap.data() as SilhakRoleSettings);
        }
      },
    );

    return () => {
      unsubChannels();
      unsubLogs();
      unsubNicknames();
      unsubFeatures();
      unsubMessages();
      unsubSilhakRoles();
    };
  }, [selectedGuildId]);

  const handleToggleFeature = async (featureKey: FeatureKey) => {
    if (!selectedGuildId) return;
    try {
      await updateDoc(guildSettingsDoc(selectedGuildId, "features"), {
        [featureKey]: !botFeatures[featureKey],
      });
    } catch {
      // 문서가 없으면 생성
      await setDoc(
        guildSettingsDoc(selectedGuildId, "features"),
        { ...botFeatures, [featureKey]: !botFeatures[featureKey] },
        { merge: true },
      );
    }
  };

  const handleSaveMessages = async (newMessages: typeof botMessages) => {
    if (!selectedGuildId) return;
    try {
      await setDoc(
        guildSettingsDoc(selectedGuildId, "messages"),
        newMessages,
        { merge: true },
      );
      alert("메시지 설정이 저장되었습니다!");
    } catch (err) {
      console.error("메시지 설정 업데이트 실패:", err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleForceRevertNickname = async (nicknameId: string) => {
    if (!window.confirm("정말로 이 사용자의 닉네임을 원상복구 하시겠습니까?"))
      return;
    try {
      await updateDoc(doc(db, "temporary_nicknames", nicknameId), {
        status: "force_revert",
      });
    } catch (err) {
      console.error("닉네임 변경 취소 중 오류:", err);
    }
  };

  const handleSaveSilhakRoles = async (newSettings: SilhakRoleSettings) => {
    if (!selectedGuildId) return;
    try {
      await setDoc(
        guildSettingsDoc(selectedGuildId, "silhak_roles"),
        newSettings,
        { merge: true },
      );
      alert("역할 부여 설정이 저장되었습니다!");
    } catch (err) {
      console.error("역할 설정 업데이트 실패:", err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return {
    activeChannelsCount,
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
  };
}
