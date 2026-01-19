import useStore from "@/store/global";
import {
  Box,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import CreateProfile from "./addProfile";
import { useCallback, useState } from "react";
import List from "./list";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function Index() {
  const { profileList, setProfileList } = useStore();
  const { type = "" } = useParams();
  const [editItem, setEditItem] = useState<any>();
  const navigate = useNavigate();
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
    setEditItem(item);
    navigate("/profile/update");
  };
  const handleDelete = (id: string) => {
    console.log("id", id);
    fetch("/api/profile/delete", {
      method: "POST",
      body: JSON.stringify({ profile_id: id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(async (resp) => {
      const data = await resp.json();
      if (data.code === 0) {
        callbackFetch();
      }
    });
  };
  const handleLaunch = async (item: any) => {
    console.log("launch", item);
    // Parse proxy string if it exists
    let proxyConfig = { server: "", username: "", password: "" };
    if (item.proxy) {
      proxyConfig.server = item.proxy;
    }

    const payload = {
      user_id: item.profile_id, // Map profile_id to user_id for persistence
      session_context: {
        width: parseInt(item.width) || 1440,
        height: parseInt(item.height) || 900,
        proxy: proxyConfig,
        // Add other fields if necessary
      },
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
        // Successfully launched
        // Maybe show a specific success message or just log it
        console.log("Session launched:", data);
        // We could also navigate to the session view if we had one, but strict requirements weren't given.
        // For now, we stay on the list.
      } else {
        console.error("Failed to launch session:", data);
        alert("Failed to launch session: " + (data.result || "Unknown error"));
      }
    } catch (e) {
      console.error("Error launching session:", e);
      alert("Error launching session");
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
            <Button
              component={Link}
              to={`/profile/create`}
              variant="contained"
              color="primary"
              size="small"
            >
              Add new
            </Button>
          )}
        </Box>
        {/* <Box className="space-y-4">
          {profileList.map((item) => {
            return (
              <Box
                className="flex items-center justify-between rounded-md p-2"
                key={item.profile_name}
                sx={(theme) => ({
                  background: alpha("#000", 0.1),
                })}
              >
                <Typography>{item.profile_name}</Typography>
                <Typography className="flex items-center space-x-1 justify-end">
                  <IconButton size="small" onClick={() => handleEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(item.profile_id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Typography>
              </Box>
            );
          })}
        </Box> */}
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
          />
        ) : null}
      </Box>
    </div>
  );
}
