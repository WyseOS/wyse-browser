import { createTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

const darkTheme = {
  primary: {
    main: "#8b5cf6", // Violet-500
    contrastText: "#FFF",
  },
  secondary: {
    main: alpha("#8b5cf6", 0.3),
    contrastText: "#8b5cf6",
  },
  background: {
    default: "transparent", // Let body gradient show through
    paper: "#1e293b", // Slate-800
    light: "#334155", // Slate-700
  },
  error: {
    main: "#ef4444",
  },
  info: {
    main: "#334155",
    contrastText: "#FFF",
  },
  text: {
    primary: "#f8fafc", // Slate-50
    secondary: "#94a3b8", // Slate-400
  },
  divider: "rgba(255, 255, 255, 0.08)",
};

const lightTheme = {
  primary: {
    main: "#3b82f6", // Doodle blue
    contrastText: "#fff",
  },
  secondary: {
    main: "#fca5a5",
    contrastText: "#374151",
  },
  background: {
    default: "#fdfbf7", // Warm paper
    paper: "#ffffff",
    light: "#f3f4f6", // lighter gray
  },
  error: {
    main: "#ef4444",
  },
  info: {
    main: "#e5e7eb",
    contrastText: "#374151",
  },
  text: {
    primary: "#374151",
    secondary: "#6b7280",
  },
  divider: "#374151", // Dark graphite divider
};

export const getThemeOptions = (theme: APP_Theme) => {
  // Ignore the passed theme, force light for sketch style
  const currentTheme = lightTheme;
  return createTheme({
    typography: {
      fontFamily: "'Patrick Hand', cursive, sans-serif",
      h1: { fontWeight: 400 },
      h2: { fontWeight: 400 },
      h3: { fontWeight: 400 },
      h4: { fontWeight: 400 },
      h5: { fontWeight: 400 },
      h6: { fontWeight: 400, fontSize: "1.25rem" },
      button: { textTransform: "none", fontWeight: 400, fontSize: "1.1rem" },
      body1: { fontSize: "1.1rem" },
      body2: { fontSize: "1rem" },
    },
    palette: {
      mode: "light",
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
            borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
            boxShadow: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
            textTransform: "none",
            boxShadow: "2px 2px 0 #374151",
            border: "2px solid #374151",
            fontWeight: 400,
            padding: "8px 24px",
            backgroundColor: "#fff",
            color: "#374151",
            "&:hover": {
              backgroundColor: "#fff",
              boxShadow: "4px 4px 0 #374151",
              transform: "translate(-1px, -1px)",
            },
            "&:active": {
              boxShadow: "1px 1px 0 #374151",
              transform: "translate(1px, 1px)",
            },
          },
          containedPrimary: {
            backgroundColor: currentTheme.primary.main,
            color: "#fff",
            "&:hover": {
              backgroundColor: alpha(currentTheme.primary.main, 0.9),
            },
          },
          // Force outlined style logic for most buttons to fit the sketch theme
          outlined: {
            // inherit root styles
          }
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
            backgroundColor: "#fff",
            "& fieldset": {
              borderWidth: "2px",
              borderColor: "#374151",
            },
            "&:hover fieldset": {
              borderColor: "#000",
            },
            "&.Mui-focused fieldset": {
              borderColor: currentTheme.primary.main,
              borderWidth: "2px",
            },
          },
          input: {
            padding: "12px 16px",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: "4px",
            border: "2px solid #374151", // Boxy sketch border
            boxShadow: "4px 4px 0 rgba(0,0,0,0.1)",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: currentTheme.background.paper,
            borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
            boxShadow: "8px 8px 0 rgba(0,0,0,0.2)",
            border: "3px solid #374151",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: "4px", // Simple highlight for list items
            margin: "2px 4px",
            "&:hover": {
              backgroundColor: alpha("#374151", 0.1),
              border: "1px dashed #374151"
            },
            "&.Mui-selected": {
              backgroundColor: alpha(currentTheme.primary.main, 0.1),
              fontWeight: 700,
              "&:hover": {
                backgroundColor: alpha(currentTheme.primary.main, 0.2),
              },
            },
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

