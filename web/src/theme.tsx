import { createTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

const darkTheme = {
  primary: {
    main: "#5721F9",
    contrastText: "#FFF",
  },
  secondary: {
    main: alpha("#5721F9", 0.3),
    contrastText: "#5721F9",
  },
  background: {
    default: "inherit",
    paper: "#2D3133B2",
    light: "#2D3133",
  },
  error: {
    main: "#FE5F57",
  },
  info: {
    main: "#2D3133",
    contrastText: "#FFF",
  },
  text: {
    primary: "#FFF",
    secondary: "#F1F1F1B2",
  },
  divider: "#E8ECEF6F",
};

const lightTheme = {
  primary: {
    main: "#5721F9",
    contrastText: "#FFF",
  },
  secondary: {
    main: alpha("#5721F9", 0.3),
    contrastText: "#5721F9",
  },
  background: {
    default: "#FFF",
    paper: "#E2E2E2",
    light: "#E8ECEF",
  },
  error: {
    main: "#FE5F57",
  },
  info: {
    main: "#E8ECEF",
    contrastText: "#1b1b1b",
  },
  text: {
    primary: "#1b1b1b",
    secondary: "#9A9FA5",
  },
  divider: "#E8ECEF",
};

export const getThemeOptions = (theme: APP_Theme) => {
  const currentTheme = theme === APP_Theme.Dark ? darkTheme : lightTheme;
  return createTheme({
    palette: {
      mode: theme,
      ...currentTheme,
    },
    components: {
      MuiTypography: {
        defaultProps: {
          variantMapping: {
            body1: "div",
            body2: "div",
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            textTransform: "capitalize",
            boxShadow: "0 0 0 !important",
            background: alpha(currentTheme.background.paper, 0.5),
            borderWidth: "1px",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            textTransform: "capitalize",
            boxShadow: "0 0 0 !important",
            borderWidth: "1px !important",
          },
          sizeLarge: {
            padding: "14px 24px",
          },
          sizeMedium: {
            padding: "10px 12px",
          },
          sizeSmall: {
            padding: "4px 8px",
            borderRadius: "32px",
          },
          textInherit: {
            color: currentTheme.info.contrastText,
          },
          containedInherit: {
            color: currentTheme.info.contrastText,
            borderColor: currentTheme.divider,
            background: alpha(currentTheme.background.paper, 0.5),
          },
          outlinedInherit: {
            borderColor: currentTheme.divider,
            borderWidth: "2px",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            paddingRight: 0,
            border: 0,
            "&:focus": {
              border: 0,
            },
            padding: "12px 16px",
          },
          input: {
            padding: 0,
            lineHeight: 1.5,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: currentTheme.info.contrastText,
            background: currentTheme.background.light,
            borderRadius: "30px",
            padding: "4px",
          },
          colorInherit: {
            color: currentTheme.info.contrastText,
            borderColor: currentTheme.divider,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: `${currentTheme.background.default}`,
            minWidth: 320,
            margin: 0,
            "@media screen and (max-width: 768px)": {
              width: "90%",
            },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            "@media screen and (max-width: 768px)": {
              padding: "0 16px 16px",
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            "@media screen and (max-width: 768px)": {
              padding: "16px",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: "unset",
          },
        },
      },
    },
  });
};

export enum APP_Theme {
  Dark = "dark",
  Light = "light",
}

export default getThemeOptions(APP_Theme.Light);
