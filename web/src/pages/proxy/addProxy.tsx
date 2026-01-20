import { useFormik } from "formik";
import * as yup from "yup";
import { Typography } from "@mui/material";
import { Link } from "react-router-dom";

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

export default function AddProxy(props: any) {
  const { initalData, callback } = props;
  const proxyFormik = useFormik<any>({
    initialValues: initalData
      ? initalData
      : {
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
    fetch(initalData ? "/api/proxy/update" : "/api/proxy/create", {
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
    <div className="w-[400px] space-y-4 px-6">
      {Object.keys(values)
        .filter((item) => !["proxy_id", "useage"].includes(item))
        .map((item: string) => {
          return (
            <div key={item} className="space-y-1">
              <Typography className="capitalize">
                {item.replace("_", " ")}
              </Typography>
              {item === "proxyType" ? (
                <select
                  name="proxyType"
                  value={values.proxyType}
                  className="select-clean uppercase"
                  onChange={proxyFormik.handleChange}
                >
                  {Object.keys(ProxyType).map((proxyItem: any) => (
                    <option
                      value={proxyItem}
                      key={proxyItem}
                    >
                      {proxyItem.replace("_", " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={item}
                  className="input-clean"
                  value={values[item] || ""}
                  onChange={proxyFormik.handleChange}
                />
              )}
            </div>
          );
        })}
      <div className="flex items-center space-x-4">
        <button className="btn-outline w-full" onClick={() => props.callback()}>
          <Link to="/proxy" className="w-full h-full flex items-center justify-center no-underline text-inherit">
            cancel
          </Link>
        </button>
        <button className="btn-primary w-full" onClick={handleCreateProxy}>
          Submit
        </button>
      </div>
    </div>
  );
}
