import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Server, ChevronDown } from "lucide-react";
import { GuildIcon } from "@/components/ui/GuildIcon";

export interface GuildInfo {
  id: string;
  name: string;
  iconURL?: string;
  memberCount?: number;
  activeBots?: string[];
}

interface GuildSelectorProps {
  selectedGuildId: string | null;
  onSelect: (guildId: string) => void;
}

export default function GuildSelector({
  selectedGuildId,
  onSelect,
}: GuildSelectorProps) {
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "guilds"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<GuildInfo, "id">),
      }));
      setGuilds(list);
      setLoading(false);

      // 첫 로드 시 첫 번째 서버 자동 선택
      if (!selectedGuildId && list.length > 0) {
        onSelect(list[0].id);
      }
    });
    return () => unsub();
  }, [onSelect]);

  const selected = guilds.find((g) => g.id === selectedGuildId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-900/40 border border-white/5 text-surface-400 text-sm animate-pulse">
        <Server className="w-4 h-4" />
        <span>서버 불러오는 중...</span>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-900/40 border border-white/5 text-surface-400 text-sm">
        <Server className="w-4 h-4" />
        <span>연결된 서버 없음</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-surface-400 tracking-wider hidden sm:block">
        서버
      </span>
      <Select
        value={selectedGuildId ?? ""}
        onValueChange={(val) => {
          if (val) onSelect(val);
        }}
      >
        <SelectTrigger className="w-[220px] bg-surface-900/60 border-white/10 text-white backdrop-blur-md rounded-xl hover:bg-surface-800/60 transition-colors">
          {selected ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GuildIcon iconURL={selected.iconURL} name={selected.name} />
              <span className="truncate text-sm font-medium">
                {selected.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-surface-400 flex-1">
              <Server className="w-4 h-4" />
              <span className="text-sm">서버 선택</span>
            </div>
          )}
          <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
        </SelectTrigger>

        <SelectContent className="bg-surface-900/95 border-white/10 backdrop-blur-xl rounded-xl text-white">
          {guilds.map((guild) => (
            <SelectItem
              key={guild.id}
              value={guild.id}
              className="focus:bg-surface-800/80 focus:text-white rounded-lg cursor-pointer"
            >
              <div className="flex items-center gap-2.5 py-0.5">
                <GuildIcon iconURL={guild.iconURL} name={guild.name} size="md" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">
                    {guild.name}
                  </span>
                  {guild.activeBots && guild.activeBots.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {guild.activeBots.map((bot) => (
                        <Badge
                          key={bot}
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4 border-white/10 text-surface-400"
                        >
                          {bot}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
