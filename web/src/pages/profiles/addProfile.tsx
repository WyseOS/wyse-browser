import { useFormik } from "formik";
import * as yup from "yup";
import {
  Box,
  MenuItem,
  OutlinedInput,
  Typography,
} from "@mui/material";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import useStore from "@/store/global";

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
        height: "900",
      },
    validationSchema: validationSchemaForProfile,
    onSubmit: (values) => {
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
    },
  });

  const { values } = formik;

  const generateFingerprint = () => {
    fetch("/api/fingerprint/generate")
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data && data.data.fingerprint) {
          formik.setFieldValue(
            "fingerprint",
            JSON.stringify(data.data.fingerprint, null, 2)
          );
        }
      });
  };

  return (
    <Box className="w-full">
      <div className="flex justify-center">
        <div className="w-[600px] space-y-4">
          <div className="space-y-1">
            <Typography className="capitalize">Profile Name</Typography>
            <OutlinedInput
              name="profile_name"
              fullWidth
              value={values.profile_name || ""}
              onChange={formik.handleChange}
            />
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Browser</Typography>
            <Select
              name="browser"
              value={values.browser || ""}
              fullWidth
              onChange={formik.handleChange}
            >
              {Object.keys(Browser).map((browserItem: any, index: number) => (
                <MenuItem value={browserItem} key={`${browserItem}_${index}`}>
                  {browserItem.replace("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Proxy</Typography>
            <Select
              name="proxy"
              value={values.proxy || ""}
              fullWidth
              onChange={formik.handleChange}
            >
              {proxyList.map((proxyItem: any, index: number) => (
                <MenuItem
                  value={proxyItem.proxy_id}
                  key={proxyItem.proxy_id || index}
                >
                  {proxyItem.proxy_name.replace("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Fingerprint</Typography>
            <div className="flex items-center space-x-2">
              <OutlinedInput
                name="fingerprint"
                fullWidth
                value={values.fingerprint || ""}
                onChange={formik.handleChange}
                multiline
                minRows={1}
                maxRows={15}
              />
              <Button
                variant="contained"
                onClick={generateFingerprint}
                className="whitespace-nowrap"
              >
                Random
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Width</Typography>
            <OutlinedInput
              name="width"
              fullWidth
              value={values.width || ""}
              onChange={formik.handleChange}
            />
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Height</Typography>
            <OutlinedInput
              name="height"
              fullWidth
              value={values.height || ""}
              onChange={formik.handleChange}
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outlined"
              fullWidth
              onClick={formik.handleReset}
            >
              clear
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={formik.submitForm}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </Box >
  );
}
