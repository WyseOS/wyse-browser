import { useFormik } from "formik";
import * as yup from "yup";
import { MenuItem, OutlinedInput, Paper, Typography } from "@mui/material";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";

enum Browser {
  "Chromium" = "Chromium",
  "Firefox" = "Firefox",
  "Brave" = "Brave",
}

const validationSchemaForProfile = yup.object({
  profile_name: yup.string(),
  browser: yup.string(), //
  proxyType: yup.string(),
  fingerprint: yup.string(),
  width: yup.number(),
  height: yup.number(),
});
export default function AddProfile() {
  const proxyFormik = useFormik<any>({
    initialValues: {
      profile_name: "",
      browser: "", //
      proxyType: "",
      fingerprint: "",
      width: 1440,
      height: 800,
    },
    validationSchema: validationSchemaForProfile,
    onSubmit: () => {
      // console.log(1111);
    },
  });

  const { values } = proxyFormik;
  return (
    <div className="w-[400px] space-y-4">
      {Object.keys(values).map((item: string) => {
        return (
          <div key={item} className="space-y-1">
            <Typography className="capitalize">
              {item.replace("_", " ")}
            </Typography>
            {item === "browser" ? (
              <Select
                value={values[item]}
                fullWidth
                onChange={proxyFormik.handleChange}
              >
                <>
                  {Object.keys(Browser).map((browserItem: any) => (
                    <MenuItem value={browserItem} key={browserItem}>
                      {browserItem.replace("_", " ")}
                    </MenuItem>
                  ))}
                </>
              </Select>
            ) : (
              <OutlinedInput
                name={item}
                fullWidth
                value={values[item] || ""}
                onChange={proxyFormik.handleChange}
              />
            )}
          </div>
        );
      })}
      <div className="flex items-center space-x-4">
        <Button variant="outlined" fullWidth>
          clear
        </Button>
        <Button variant="contained" fullWidth>
          Submit
        </Button>
      </div>
    </div>
  );
}
