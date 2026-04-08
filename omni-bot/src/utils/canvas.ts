import { createCanvas, loadImage, Image, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
GlobalFonts.registerFromPath(
  join(__dirname, "../../assets/fonts/NotoSansKR.ttf"),
  "NotoSansKR",
);

try {
  GlobalFonts.registerFromPath(
    join(__dirname, "../../assets/fonts/NotoColorEmoji.ttf"),
    "NotoColorEmoji",
  );
} catch {
  // 폰트 파일 없음, 이모지 렌더링 비활성화
}

export async function generateWelcomeImage(
  avatarUrl: string,
  title: string,
  desc: string,
): Promise<Buffer> {
  const width = 1200;
  const height = 630;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background color - Discord Dark Theme Embed Color
  ctx.fillStyle = "#1e1f22";

  // Create rounded rectangle for the whole background like an embed
  const radius = 24;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  let avatar: Image | null = null;
  try {
    avatar = await loadImage(avatarUrl);
  } catch (e) {
    console.error("Failed to load avatar:", e);
  }

  if (avatar) {
    const avatarSize = 240;
    const padding = 12;
    const x = width / 2;
    const y = 80 + avatarSize / 2;

    // Outer white circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, avatarSize / 2 + padding, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.closePath();

    // Clip inner circle for avatar
    ctx.beginPath();
    ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      avatar,
      x - avatarSize / 2,
      y - avatarSize / 2,
      avatarSize,
      avatarSize,
    );
    ctx.restore();
  }

  // Draw Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 60px NotoSansKR, NotoColorEmoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(title, width / 2, 400);

  // Draw Desc
  ctx.fillStyle = "#b5bac1"; // Discord text gray
  ctx.font = "40px NotoSansKR, NotoColorEmoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(desc, width / 2, 500);

  return canvas.toBuffer("image/png");
}
