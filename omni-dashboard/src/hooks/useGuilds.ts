import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import type { GuildInfo } from "@/components/layout/GuildSelector";

export function useGuilds(onFirstLoad?: (firstId: string) => void) {
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let firstLoaded = false;
    const q = query(collection(db, "guilds"), where("activeBots", "array-contains", "omni"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<GuildInfo, "id">),
      }));
      setGuilds(list);
      setLoading(false);

      if (!firstLoaded && list.length > 0 && onFirstLoad) {
        firstLoaded = true;
        onFirstLoad(list[0].id);
      }
    });
    return () => unsub();
  }, []);

  return { guilds, loading };
}
