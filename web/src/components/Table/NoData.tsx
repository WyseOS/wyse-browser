import React from "react";

import { Typography, TypographyProps } from "@mui/material";

interface NoDataProps extends TypographyProps {
  size?: "large" | "small";
  className?: string;
}

export default React.memo(function NoData({
  children,
  size = "small",
  className,
  height = 100,
  ...restProps
}: NoDataProps) {
  if (size === "large") {
    return (
      <Typography
        variant="body2"
        color="secondary"
        className={`flex items-center ${
          restProps.align === "left" ? "" : "justify-center"
        } ${className}`}
        sx={{
          minHeight: height,
        }}
        {...restProps}
      >
        {children}
      </Typography>
    );
  }
  return (
    <Typography
      variant="body2"
      color="secondary"
      className={`${className}`}
      {...restProps}
    >
      {children}
    </Typography>
  );
});
