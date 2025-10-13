import { Box } from "@mui/material";

export default function List(props: any) {
  return (
    <Box>
      {props.list.map((item: any) => {
        return <div>{item.proxy_name}</div>;
      })}
    </Box>
  );
}
