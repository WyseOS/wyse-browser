import { Box, IconButton, Pagination, Paper, Typography } from "@mui/material";
import { useState } from "react";
import Table from "@/components/Table";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import StopIcon from "@mui/icons-material/Stop";

interface ListProps {
  list: any[];
  setEditItem: (item: any) => void;
  handleDelete: (id: string) => void;
  handleLaunch: (item: any) => void;
  handleStop: (item: any) => void;
  activeSessions: Record<string, string>;
}

export default function List(props: ListProps) {
  const { list, setEditItem, handleDelete, handleLaunch, handleStop, activeSessions } = props;
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  if (!list || list.length === 0) {
    return (
      <Paper className="w-full p-4">
        <Typography align="center">No profiles found.</Typography>
      </Paper>
    );
  }

  const columns = [
    ...Object.keys(list[0])
      .filter((key) => key !== "fingerprint") // Hide fingerprint column for cleaner display
      .map((item) => {
        return {
          label: item.replace("_", " "),
          key: item,
          width: "20%",
          align: "left",
          render: (row: any) => {
            const val = row[item];
            if (typeof val === "boolean") {
              return val ? "true" : "false";
            }
            return val;
          },
        };
      }),
    {
      label: "Operation",
      key: "operation",
      align: "right",
      width: "20%",
      render: (row: any) => {
        const isSessionActive = !!activeSessions[row.profile_id];

        return (
          <Typography className="flex items-center space-x-1 justify-end">
            {isSessionActive ? (
              <IconButton
                size="small"
                color="error"
                onClick={() => handleStop(row)}
                title="Stop Session"
              >
                <StopIcon fontSize="small" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleLaunch(row)}
                title="Launch Session"
              >
                <RocketLaunchIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => setEditItem(row)}
              disabled={isSessionActive}
              title={isSessionActive ? "Stop session to edit" : "Edit"}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.profile_id)}
              title="Delete"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Typography>
        );
      },
    },
  ];

  return (
    <Paper className="w-full">
      <Table
        data={list.slice((page - 1) * rowsPerPage, page * rowsPerPage)}
        columns={columns}
      />
      {list.length > rowsPerPage && (
        <Box className="flex justify-center p-2">
          <Pagination
            count={Math.ceil(list.length / rowsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Paper>
  );
}
