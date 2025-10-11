import useStore from "@/store/global";
import { alpha, Box, Chip, IconButton, Typography } from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import CreateProfile from "./addProfile";
import { useCallback, useState } from "react";
import List from "./list";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Index() {
  const { proxyList, profileList, setProfileList } = useStore();
  const { type } = useParams();
  const [editItem, setEditItem] = useState<any>();
  const navigate = useNavigate();
  const callbackFetch = useCallback(async () => {
    const result = await fetch(`/api/profile/list`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    console.log("data proxy", data);
    if (data.code === 0) {
      setProfileList(data.data.data);
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

  return (
    <div className="p-4 flex space-x-6">
      <Box className="w-[260px] space-y-6">
        <Box className="flex items-center justify-between">
          <Typography variant="h6">Profiles</Typography>
          <Link to={`/profile/create`}>Add new </Link>
        </Box>
        <Box className="space-y-4">
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
        </Box>
      </Box>
      <Box className="w-[800px] flex justify-center">
        {type === "create" ? <CreateProfile callback={callbackFetch} /> : null}
        {type === "update" ? (
          <CreateProfile initalData={editItem} callback={callbackFetch} />
        ) : null}
        {!type ? <List data={profileList} /> : null}
      </Box>
    </div>
  );
}
