import { useFormik } from "formik";
import * as yup from "yup";
import {
  Box,
  Typography,
} from "@mui/material";
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
  solve_captcha: yup.boolean(),
  is_save_video: yup.boolean(),
  timeout: yup.number().min(0, 'Timeout 必须大于等于 0'),
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
        solve_captcha: false,
        is_save_video: false,
        timeout: 20000,
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
            <input
              name="profile_name"
              className="input-clean"
              value={values.profile_name || ""}
              onChange={formik.handleChange}
            />
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Browser</Typography>
            <select
              name="browser"
              value={values.browser || ""}
              className="select-clean"
              onChange={formik.handleChange}
            >
              {Object.keys(Browser).map((browserItem: any, index: number) => (
                <option value={browserItem} key={`${browserItem}_${index}`}>
                  {browserItem.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Proxy</Typography>
            <select
              name="proxy"
              className="select-clean"
              value={values.proxy || ""}
              onChange={formik.handleChange}
            >
              <option value="">
                None
              </option>
              {proxyList.map((proxyItem: any, index: number) => (
                <option
                  value={proxyItem.proxy_id}
                  key={proxyItem.proxy_id || index}
                >
                  {proxyItem.proxy_name.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Fingerprint</Typography>
            <div className="flex items-center space-x-2">
              <textarea
                name="fingerprint"
                className="input-clean h-auto min-h-[100px]"
                value={values.fingerprint || ""}
                onChange={formik.handleChange}
                rows={5}
              />
              <button
                onClick={generateFingerprint}
                className="btn-primary whitespace-nowrap"
              >
                Random
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Width</Typography>
            <input
              name="width"
              className="input-clean"
              value={values.width || ""}
              onChange={formik.handleChange}
            />
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Height</Typography>
            <input
              name="height"
              className="input-clean"
              value={values.height || ""}
              onChange={formik.handleChange}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Typography>Solve Captcha</Typography>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="solve_captcha"
                checked={values.solve_captcha || false}
                onChange={formik.handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <Typography>Save Video</Typography>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_save_video"
                checked={values.is_save_video || false}
                onChange={formik.handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-1">
            <Typography className="capitalize">Timeout (ms)</Typography>
            <input
              type="number"
              name="timeout"
              className="input-clean"
              min={0}
              value={values.timeout ?? 20000}
              onChange={formik.handleChange}
            />
          </div>
          <div className="flex items-center space-x-4">
            <button
              className="btn-outline w-full"
              onClick={formik.handleReset}
            >
              clear
            </button>
            <button
              className="btn-primary w-full"
              onClick={() => formik.submitForm()}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </Box >
  );
}
