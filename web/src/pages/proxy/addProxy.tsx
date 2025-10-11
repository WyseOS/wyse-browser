import { useFormik } from "formik";
import * as yup from "yup";
import { MenuItem, OutlinedInput, Typography } from "@mui/material";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";

const validationSchemaForProxy = yup.object({
  proxy_name: yup.string(),
  host: yup.string().url(""),
  //proxyType: yup.string(),
  port: yup.string(),
  username: yup.string(),
  password: yup.string(),
});

enum ProxyType {
  "http" = "http",
  "https" = "https",
  "socks4" = "socks4",
  "socks5" = "socks5",
  "all" = "all",
}

export default function AddProxy() {
  const proxyFormik = useFormik<any>({
    initialValues: {
      proxy_name: "",
      host: "127.0.0.1",
      proxyType: "all",
      port: "8080",
      username: "",
      password: "",
    },
    validationSchema: validationSchemaForProxy,
    onSubmit: () => {
      // console.log(1111);
    },
  });

  const { values } = proxyFormik;

  const handleCreateProxy = () => {
    fetch("/api/proxy/create", {
      method: "POST",
      body: JSON.stringify(values),
    }).then(async (resp) => {
      const data = await resp.json();
      console.log("resp data", data);
    });
  };

  return (
    <div className="w-[400px] space-y-4 px-6">
      {Object.keys(values).map((item: string) => {
        return (
          <div key={item} className="space-y-1">
            <Typography className="capitalize">
              {item.replace("_", " ")}
            </Typography>
            {item === "proxyType" ? (
              <Select
                value={values.proxyType}
                fullWidth
                onChange={proxyFormik.handleChange}
              >
                {Object.keys(ProxyType).map((proxyItem: any) => (
                  <MenuItem
                    value={proxyItem}
                    key={proxyItem}
                    onClick={() =>
                      proxyFormik.setFieldValue("proxyType", proxyItem)
                    }
                    className="uppercase"
                  >
                    {proxyItem.replace("_", " ")}
                  </MenuItem>
                ))}
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
        <Button variant="contained" fullWidth onClick={handleCreateProxy}>
          Submit
        </Button>
      </div>
    </div>
  );
}
