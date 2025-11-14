import React, { ForwardedRef, useMemo } from "react";
import { TableVirtuoso, TableVirtuosoProps } from "react-virtuoso";

import { Box, Typography, alpha, darken, useTheme } from "@mui/material";
import Table from "@mui/material/Table";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import NoDataSay from "./NoData";

const VirtualTable = (props: any) => {
  const {
    columns,
    data = [],
    maxHeight = 600,
    itemHeight,
    onRowClick = () => void 0,
    loadMore = () => void 0,
    stricky = false,
    noDataNode = <NoDataSay />,
    width = "100%",
    loading = false,
    ...restProps
  } = props;

  const theme = useTheme();

  const tableComponents = useMemo(
    () => ({
      Table: React.forwardRef(
        (props: any, ref: ForwardedRef<HTMLTableSectionElement>) => (
          <Table
            {...props}
            ref={ref}
            sx={{
              width: stricky ? width : "100%",
              tableLayout: stricky ? "inherit" : "fixed",
              "& .MuiTableRow-root": {
                "&:hover": {
                  ".MuiTableCell-root": {
                    backgroundColor: darken(
                      theme.palette.background.paper,
                      0.15
                    ),
                  },
                },
              },
            }}
          />
        )
      ),
      TableHead: React.forwardRef(
        (props: any, ref: ForwardedRef<HTMLTableSectionElement>) => (
          <TableHead {...props} ref={ref} sx={{ padding: "4px 0" }}>
            <tr>{props.children}</tr>
          </TableHead>
        )
      ),
      TableRow: (props: any) => (
        <TableRow
          {...props}
          hover
          role="checkbox"
          tabIndex={-1}
          className={props?.item?.tableRowHighLight ? "hight-light" : ""}
          onClick={() => onRowClick(props.item)}
          sx={{
            background: props?.item?.tableRowHighLight
              ? alpha(theme.palette.primary.main, 0.2)
              : "inherit",
          }}
        >
          {props.children}
        </TableRow>
      ),
    }),
    []
  );

  return (
    <Box
      className="w-full"
      sx={{
        overflowX: stricky ? "scroll" : "hidden",
      }}
    >
      {data.length === 0 && noDataNode}
      {data.length !== 0 && (
        <TableVirtuoso
          endReached={loadMore}
          style={{
            height: maxHeight,
            borderRadius: "4px",
          }}
          data={data}
          components={tableComponents}
          fixedHeaderContent={() =>
            columns.map((column: any, index: number) => (
              <TableCell
                key={index}
                align={column.align}
                width={width}
                sx={{
                  //maxWidth: column.width ? column.width : 'auto',
                  width: column.width,
                  minWidth: column.width ? column.width : "auto",
                  backgroundColor: `${darken(
                    theme.palette.background?.paper,
                    0.05
                  )}`,
                  padding: `12px 0`,
                  paddingLeft: index === 0 || column?.stricky ? 2 : 0,
                  // paddingRight: index === columns.length - 1 ? 1 : 0,
                  paddingRight: "16px",
                  borderBottom: 0,
                  backgroundImage: "none",
                  [`&.${tableCellClasses.head}`]: {
                    //background: theme.palette.background.paper,
                  },
                  position: column?.stricky ? "sticky" : "unset",
                  left: 0,
                  right: 0,
                  zIndex: 1,
                }}
                //className="capitalize"
              >
                <Typography variant="body2" component="div">
                  {column.label}
                </Typography>
              </TableCell>
            ))
          }
          itemContent={(i, row) =>
            columns.map((column: any, index: number) => (
              <TableCell
                key={index}
                align={column.align}
                style={{
                  padding: `4px 0`,
                  height: 40,
                  borderBottom: 0,
                  paddingLeft: index === 0 || column?.stricky ? "16px" : 0,
                  paddingRight: "16px",
                  cursor: onRowClick ? "pointer" : "none",
                  position: column?.stricky ? "sticky" : "unset",
                  width: column.width,
                  maxWidth: column.width ? column.width : "auto",
                  right: 0,
                  left: 0,
                  zIndex: 1,
                  backgroundColor: column?.stricky
                    ? `${theme.palette.background.default}`
                    : "transparent",
                }}
                onClick={() => onRowClick(row, index)}
              >
                <Typography variant={"body2"} component="div" noWrap>
                  {column.render(row, i)}
                </Typography>
              </TableCell>
            ))
          }
          {...restProps}
        />
      )}
    </Box>
  );
};

export default VirtualTable;
