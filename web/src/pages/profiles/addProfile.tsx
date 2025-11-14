import { useFormik } from "formik";
import * as yup from "yup";
import {
  Box,
  IconButton,
  MenuItem,
  OutlinedInput,
  Paper,
  Typography,
} from "@mui/material";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import useStore from "@/store/global";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link } from "react-router-dom";

enum Browser {
  "Chromium" = "Chromium",
  "Firefox" = "Firefox",
  "Brave" = "Brave",
}

const validationSchemaForProfile = yup.object({
  profile_name: yup.string(),
  browser: yup.string(), //
  proxy: yup.string(),
  fingerprint: yup.string(),
  width: yup.number(),
  height: yup.number(),
});
export default function AddProfile(props: any) {
  const { proxyList } = useStore();
  const { initialData, callback } = props;
  const formik = useFormik<any>({
    initialValues: initialData
      ? initialData
      : {
          profile_name: "",
          browser: "",
          proxy: "",
          fingerprint: "",
          width: "1440",
          height: "800",
        },
    validationSchema: validationSchemaForProfile,
    onSubmit: () => {
      // console.log(1111);
    },
  });

  const { values } = formik;

  const handleCreateProfile = () => {
    fetch(initialData ? "/api/profile/update" : "/api/profile/create", {
      method: "POST",
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(async (resp) => {
      const data = await resp.json();
      if (data.code === 0) {
        callback();
      }
    });
  };
  return (
    <Box className="w-full">
      <div className="flex justify-center">
        <div className="w-[400px] space-y-4">
          {Object.keys(values)
            .filter((item) => !["profile_id"].includes(item))
            .map((item: string) => {
              return (
                <div key={item} className="space-y-1">
                  <Typography className="capitalize">
                    {item.replace("_", " ")}
                  </Typography>
                  {["browser", "proxy"].includes(item) ? (
                    <Select
                      value={item === "browser" ? values.browser : values.proxy}
                      fullWidth
                      onChange={formik.handleChange}
                    >
                      {item === "browser"
                        ? Object.keys(Browser).map((browserItem: any) => (
                            <MenuItem
                              value={browserItem}
                              key={browserItem}
                              onClick={() =>
                                formik.setFieldValue("browser", browserItem)
                              }
                            >
                              {browserItem.replace("_", " ")}
                            </MenuItem>
                          ))
                        : proxyList.map((proxyItem: any) => (
                            <MenuItem
                              value={proxyItem.proxy_id}
                              key={proxyItem.proxy_id}
                              onClick={() =>
                                formik.setFieldValue(
                                  "proxy",
                                  proxyItem.proxy_id
                                )
                              }
                            >
                              {proxyItem.proxy_name.replace("_", " ")}
                            </MenuItem>
                          ))}
                    </Select>
                  ) : (
                    <OutlinedInput
                      name={item}
                      fullWidth
                      value={values[item] || ""}
                      onChange={formik.handleChange}
                    />
                  )}
                </div>
              );
            })}
          <div className="flex items-center space-x-4">
            <Button variant="outlined" fullWidth>
              clear
            </Button>
            <Button variant="contained" fullWidth onClick={handleCreateProfile}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </Box>
  );
}
