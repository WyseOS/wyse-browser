import { Box, IconButton, Pagination, Paper, Typography } from "@mui/material";
import { useState } from "react";
import Table from "@/components/Table";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";

export default function List(props: any) {
  const { list, setEditItem, handleDelete, handleLaunch } = props;
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
    ...Object.keys(list[0]).map((item) => {
      return {
        label: item.replace("_", " "),
        key: item,
        width: "20%",
        align: "left",
        render: (row: any) => {
          return row[item];
        },
      };
    }),
    {
      label: "Operation",
      key: "operation",
      align: "right",
      width: "20%",
      render: (row: any) => {
        return (
          <Typography className="flex items-center space-x-1 justify-end">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleLaunch(row)}
              title="Launch Session"
            >
              <RocketLaunchIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setEditItem(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.profile_id)}
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
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Paper>
  );
}
