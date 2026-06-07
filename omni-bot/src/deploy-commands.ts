import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const commands = [
  // ────────── 음악 (omni) ──────────
  new SlashCommandBuilder()
    .setName("노래")
    .setDescription("음성 채널에서 유튜브 음악을 재생합니다. (버튼으로 제어)")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("신청")
        .setDescription("유튜브 링크 또는 검색어로 노래를 신청합니다.")
        .addStringOption((option) =>
          option
            .setName("검색어")
            .setDescription("유튜브 링크 또는 검색어")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("채널설정")
        .setDescription("현재 채널을 노래 신청 전용 채널로 설정합니다. (/노래 없이 신청 가능)"),
    ),

  // ────────── 서버 관리 (omni) ──────────
  new SlashCommandBuilder()
    .setName("임시채널")
    .setDescription("지정된 시간 후 자동 삭제되는 임시 채널을 생성합니다.")
    .addStringOption((option) =>
      option.setName("채널이름").setDescription("생성할 임시 채널의 이름").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("유지시간")
        .setDescription("채널 유지 시간 (분 단위)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("추방")
    .setDescription("서버에서 특정 유저를 추방합니다.")
    .addUserOption((option) =>
      option.setName("유저").setDescription("추방할 유저").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("사유").setDescription("추방 사유"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName("차단")
    .setDescription("서버에서 특정 유저를 영구 차단합니다.")
    .addUserOption((option) =>
      option.setName("유저").setDescription("차단할 유저").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("사유").setDescription("차단 사유"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("청소")
    .setDescription("최근 메시지를 대량으로 삭제합니다.")
    .addIntegerOption((option) =>
      option
        .setName("수량")
        .setDescription("삭제할 메시지 수량 (1~100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("닉네임변경")
    .setDescription("특정 유저의 닉네임을 일정 기간 동안 변경합니다.")
    .addUserOption((option) =>
      option.setName("유저").setDescription("닉네임을 변경할 유저").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("변경할닉네임").setDescription("변경할 새로운 닉네임").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("유지시간").setDescription("닉네임 유지 시간 (예: 1일, 24시간, 30분)").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  new SlashCommandBuilder()
    .setName("익명")
    .setDescription("대나무숲 채널에 누구인지 모르게 익명 글을 남깁니다."),

  // ────────── 역할 / 유틸 (omni) ──────────
  new SlashCommandBuilder()
    .setName("역할세팅")
    .setDescription("대시보드에 설정된 역할 부여 메시지를 이 채널에 생성합니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("아바타")
    .setDescription("지정한 사용자의 프로필 사진을 확대해서 보여준다")
    .addUserOption((option) =>
      option.setName("대상").setDescription("프로필을 볼 유저").setRequired(false),
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(`[시작] ${commands.length}개의 명령어 등록을 시작합니다.`);
    const data = (await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands },
    )) as any[];
    console.log(`[완료] ${data.length}개의 명령어가 성공적으로 등록되었습니다.`);
  } catch (error) {
    console.error(error);
  }
})();
