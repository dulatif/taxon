import { readTextFile } from '@tauri-apps/plugin-fs';
import { useEffect, useState } from 'react';

export interface AgentHeartbeatState {
  activeTaskId: string | null;
  nextTaskIds: string[];
  agentName?: string;
  timestamp?: string;
  isLive: boolean;
  lastCheckedAt?: number;
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const POLL_INTERVAL_MS = 2000; // 2 seconds

export function parseAgentFocusContent(content: string): {
  activeTaskId: string | null;
  nextTaskIds: string[];
  agentName?: string;
  timestamp?: string;
} {
  let activeTaskId: string | null = null;
  const nextTaskIds: string[] = [];
  let agentName: string | undefined;
  let timestamp: string | undefined;

  const lines = content.split(/\r?\n/);
  let isParsingNextList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if we are reading a multi-line 'next' list
    if (isParsingNextList) {
      if (trimmed.startsWith('-')) {
        const item = trimmed
          .slice(1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
        if (item) nextTaskIds.push(item);
        continue;
      }
      isParsingNextList = false;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key === 'active') {
      const parsedActive = value.replace(/^['"]|['"]$/g, '').trim();
      activeTaskId = parsedActive || null;
    } else if (key === 'agent') {
      agentName = value.replace(/^['"]|['"]$/g, '').trim() || undefined;
    } else if (key === 'timestamp') {
      timestamp = value.replace(/^['"]|['"]$/g, '').trim() || undefined;
    } else if (key === 'next') {
      if (value.startsWith('[') && value.endsWith(']')) {
        const arrContent = value.slice(1, -1).trim();
        if (arrContent) {
          const items = arrContent
            .split(',')
            .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean);
          nextTaskIds.push(...items);
        }
      } else if (!value) {
        isParsingNextList = true;
      } else {
        const single = value.replace(/^['"]|['"]$/g, '').trim();
        if (single) nextTaskIds.push(single);
      }
    }
  }

  return { activeTaskId, nextTaskIds, agentName, timestamp };
}

export function useAgentHeartbeat(vaultPath: string | null | undefined): AgentHeartbeatState {
  const [heartbeat, setHeartbeat] = useState<AgentHeartbeatState>({
    activeTaskId: null,
    nextTaskIds: [],
    isLive: false,
  });

  useEffect(() => {
    if (!vaultPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeartbeat({
        activeTaskId: null,
        nextTaskIds: [],
        isLive: false,
      });
      return;
    }

    const cleanedVaultPath = vaultPath.replace(/[/\\]+$/, '');
    const heartbeatFilePath = `${cleanedVaultPath}/.taxon/.agent-focus`;
    let isMounted = true;

    const pollHeartbeat = async () => {
      try {
        const content = await readTextFile(heartbeatFilePath).catch(() => null);
        if (!content) {
          if (isMounted) {
            setHeartbeat((prev) =>
              prev.isLive || prev.activeTaskId !== null
                ? { activeTaskId: null, nextTaskIds: [], isLive: false, lastCheckedAt: Date.now() }
                : prev,
            );
          }
          return;
        }

        if (!isMounted) return;

        const { activeTaskId, nextTaskIds, agentName, timestamp } = parseAgentFocusContent(content);

        let isStaleByTimestamp = false;
        if (timestamp) {
          const tsDate = new Date(timestamp).getTime();
          if (!isNaN(tsDate) && Date.now() - tsDate > STALE_THRESHOLD_MS) {
            isStaleByTimestamp = true;
          }
        }

        const isLive = !isStaleByTimestamp && Boolean(activeTaskId);
        const newActiveTaskId = isLive ? activeTaskId : null;
        const newNextTaskIds = isLive ? nextTaskIds : [];

        if (isMounted) {
          setHeartbeat((prev) => {
            const isSameActive = prev.activeTaskId === newActiveTaskId;
            const isSameLive = prev.isLive === isLive;
            const isSameNext =
              prev.nextTaskIds.length === newNextTaskIds.length &&
              prev.nextTaskIds.every((id, idx) => id === newNextTaskIds[idx]);
            const isSameAgent = prev.agentName === agentName;

            if (isSameActive && isSameLive && isSameNext && isSameAgent) {
              return prev;
            }

            return {
              activeTaskId: newActiveTaskId,
              nextTaskIds: newNextTaskIds,
              agentName,
              timestamp,
              isLive,
              lastCheckedAt: Date.now(),
            };
          });
        }
      } catch {
        // Silently defer on I/O race conditions or lock conflicts
      }
    };

    pollHeartbeat();
    const intervalId = setInterval(pollHeartbeat, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [vaultPath]);

  return heartbeat;
}
