import { Box, Chip, IconButton, Paper, Typography } from "@mui/material";
import Table from "@/components/Table";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function List(props: any) {
  const { list, setEditItem, handleDeleteProxy } = props;

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
            <IconButton size="small" onClick={() => setEditItem(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDeleteProxy(row.proxy_id)}
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
      <Table data={list} columns={columns} />
    </Paper>
  );
}
