import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import useStore from "@/store/global";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProxyCreate from "./addProxy";
import List from "./list";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function Index() {
  const { proxyList, profileList, setProxyList } = useStore();
  const { type = "" } = useParams();
  const [editItem, setEditItem] = useState<any>();
  const navigate = useNavigate();

  const callbackFetch = useCallback(async () => {
    const result = await fetch(`/api/proxy/list`, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
    const data = await result.json();
    if (data.code === 0) {
      setProxyList(data.data.data);
      navigate("/proxy");
    }
  }, []);

  const handleDeleteProxy = (id: string) => {
    fetch("/api/proxy/delete", {
      method: "POST",
      body: JSON.stringify({ proxy_id: id }),
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

  const handleEdit = (item: any) => {
    setEditItem(item);
    navigate("/proxy/update");
  };

  return (
    <div className="p-4 w-[1200px] mx-auto space-y-4">
      <Box className="">
        <Box className="flex items-center justify-between">
          <div className="flex items-cetner space-x-4">
            {["create", "update"].includes(type) ? (
              <Typography variant="h6">
                <IconButton component={Link} to="/proxy">
                  <ArrowBackIcon />
                </IconButton>
              </Typography>
            ) : null}
            <Typography variant="h6">Profiles</Typography>
          </div>
          <Button
            component={Link}
            to={`/proxy/create`}
            variant="contained"
            color="primary"
            size="small"
          >
            Add new
          </Button>
        </Box>
        {/* <Box className="space-y-4">
          {proxyList.map((item) => {
            return (
              <Box
                className="flex items-center justify-between rounded-md p-2"
                key={item.proxy_name}
                sx={(theme) => ({
                  background: alpha("#000", 0.1),
                })}
              >
                <Typography>{item.proxy_name}</Typography>
                <Typography className="flex items-center space-x-1 justify-end">
                  <Chip
                    label={
                      profileList?.filter(
                        (profile) => profile.proxy === item.profile_name
                      ).length
                    }
                    size="small"
                  />
                  <IconButton size="small" onClick={() => handleEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteProxy(item.proxy_id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Typography>
              </Box>
            );
          })}
        </Box> */}
      </Box>
      <Box className="flex-1 flex justify-center">
        {type === "create" ? <ProxyCreate callback={callbackFetch} /> : null}
        {type === "update" ? (
          <ProxyCreate initalData={editItem} callback={callbackFetch} />
        ) : null}
        {!type ? (
          <List
            list={proxyList}
            setEditItem={handleEdit}
            handleDelete={handleDeleteProxy}
          />
        ) : null}
      </Box>
    </div>
  );
}
