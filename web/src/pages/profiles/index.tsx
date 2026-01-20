import useStore from "@/store/global";
import {
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import CreateProfile from "./addProfile";
import { useCallback, useEffect, useState } from "react";
import List from "./list";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Map of profile_id -> session_id for active sessions
type ActiveSessionsMap = Record<string, string>;

export default function Index() {
  const { profileList, setProfileList } = useStore();
  const { type = "" } = useParams();
  const [editItem, setEditItem] = useState<any>();
  const [activeSessions, setActiveSessions] = useState<ActiveSessionsMap>({});
  const navigate = useNavigate();

  // Fetch active sessions and build profile_id -> session_id mapping
  const fetchActiveSessions = useCallback(async () => {
    try {
      const resp = await fetch("/api/sessions/list");
      const data = await resp.json();
      if (data.code === 0 && data.data?.sessions) {
        const sessionsMap: ActiveSessionsMap = {};
        for (const session of data.data.sessions) {
          if (session.user_id) {
            sessionsMap[session.user_id] = session.id;
          }
        }
        setActiveSessions(sessionsMap);
      }
    } catch (e) {
      console.error("Failed to fetch active sessions:", e);
    }
  }, []);

  // Fetch sessions on mount and periodically
  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

  const callbackFetch = useCallback(async () => {
    const result = await fetch(`/api/profile/list`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    if (data.code === 0) {
      setProfileList(data.data.data);
      navigate("/profile");
    }
  }, []);

  const handleEdit = (item: any) => {
    // Check if session is active
    if (activeSessions[item.profile_id]) {
      alert("无法编辑：该 Profile 有正在运行的会话，请先停止会话。");
      return;
    }
    setEditItem(item);
    navigate("/profile/update");
  };

  const handleDelete = async (id: string) => {
    console.log("delete id", id);

    // If session is active, release it first
    const sessionId = activeSessions[id];
    if (sessionId) {
      try {
        const releaseResp = await fetch(`/api/session/${sessionId}/release`);
        const releaseData = await releaseResp.json();
        if (releaseData.code !== 0) {
          alert("停止会话失败: " + (releaseData.result || "Unknown error"));
          return;
        }
        // Update active sessions state
        setActiveSessions((prev) => {
          const newMap = { ...prev };
          delete newMap[id];
          return newMap;
        });
      } catch (e) {
        console.error("Failed to release session:", e);
        alert("停止会话失败");
        return;
      }
    }

    // Now delete the profile
    try {
      const resp = await fetch("/api/profile/delete", {
        method: "POST",
        body: JSON.stringify({ profile_id: id }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await resp.json();
      if (data.code === 0) {
        callbackFetch();
      }
    } catch (e) {
      console.error("Failed to delete profile:", e);
      alert("删除 Profile 失败");
    }
  };

  const handleLaunch = async (item: any) => {
    console.log("launch", item);
    // Parse proxy string if it exists
    let proxyConfig = { server: "", username: "", password: "" };
    if (item.proxy) {
      proxyConfig.server = item.proxy;
    }

    // Parse fingerprint if it exists (stored as JSON string in profile)
    let fingerprintData = null;
    if (item.fingerprint) {
      try {
        fingerprintData = typeof item.fingerprint === 'string'
          ? JSON.parse(item.fingerprint)
          : item.fingerprint;
      } catch (e) {
        console.warn("Failed to parse fingerprint:", e);
      }
    }

    const payload = {
      user_id: item.profile_id, // Map profile_id to user_id for persistence
      session_context: {
        width: parseInt(item.width) || 1440,
        height: parseInt(item.height) || 900,
        proxy: proxyConfig,
        userAgent: fingerprintData?.fingerprint?.navigator?.userAgent || "",
        timezone: fingerprintData?.fingerprint?.navigator?.timezone || "America/New_York",
        solveCaptcha: item.solve_captcha ?? false,
        isSaveVideo: item.is_save_video ?? false,
        timeout: item.timeout ?? 20000,
      },
      fingerprint: fingerprintData, // Pass the full fingerprint object
    };

    try {
      const resp = await fetch("/api/session/create", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await resp.json();
      if (data.code === 0) {
        console.log("Session launched:", data);
        // Update active sessions state
        setActiveSessions((prev) => ({
          ...prev,
          [item.profile_id]: data.data.session_id,
        }));
      } else {
        console.error("Failed to launch session:", data);
        alert("启动会话失败: " + (data.result || "Unknown error"));
      }
    } catch (e) {
      console.error("Error launching session:", e);
      alert("启动会话失败");
    }
  };

  const handleStop = async (item: any) => {
    const sessionId = activeSessions[item.profile_id];
    if (!sessionId) {
      console.warn("No active session for profile:", item.profile_id);
      return;
    }

    try {
      const resp = await fetch(`/api/session/${sessionId}/release`);
      const data = await resp.json();
      if (data.code === 0) {
        console.log("Session stopped:", data);
        // Update active sessions state
        setActiveSessions((prev) => {
          const newMap = { ...prev };
          delete newMap[item.profile_id];
          return newMap;
        });
      } else {
        console.error("Failed to stop session:", data);
        alert("停止会话失败: " + (data.result || "Unknown error"));
      }
    } catch (e) {
      console.error("Error stopping session:", e);
      alert("停止会话失败");
    }
  };

  return (
    <div className="p-4 w-full mx-auto space-y-4">
      <Box className="">
        <Box className="flex items-center justify-between">
          <div className="flex items-cetner space-x-4">
            {["create", "update"].includes(type) ? (
              <Typography variant="h6">
                <IconButton component={Link} to="/profile">
                  <ArrowBackIcon />
                </IconButton>
              </Typography>
            ) : null}
            <Typography variant="h6">Profiles</Typography>
          </div>
          {!type && (
            <Link
              to={`/profile/create`}
              className="btn-primary no-underline"
            >
              Add new
            </Link>
          )}
        </Box>
      </Box>
      <Box className="flex justify-center">
        {type === "create" ? <CreateProfile callback={callbackFetch} /> : null}
        {type === "update" ? (
          <CreateProfile initialData={editItem} callback={callbackFetch} />
        ) : null}
        {!type ? (
          <List
            list={profileList}
            setEditItem={handleEdit}
            handleDelete={handleDelete}
            handleLaunch={handleLaunch}
            handleStop={handleStop}
            activeSessions={activeSessions}
          />
        ) : null}
      </Box>
    </div>
  );
}
