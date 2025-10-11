import { Routes, Route, NavLink } from "react-router-dom";
import Flows from "@/pages/flow";
import Profiles from "@/pages/profiles";
import Proxy from "@/pages/proxy";
import { Box } from "@mui/material";
import ProxyCreate from "@/pages/proxy/addProxy";
import ProfilesCreate from "@/pages/profiles/addProfile";

export default function App() {
  return (
    <Box sx={{ width: "100vw", height: "100vh" }} className="relative">
      <Header />
      <Routes>
        <Route path="/" element={<Flows />} />
        <Route path="/proxy" element={<Proxy />} />
        <Route path="/proxy/create" element={<ProxyCreate />} />
        <Route path="/profile" element={<Profiles />} />
        <Route path="/profile/create" element={<ProfilesCreate />} />
      </Routes>
    </Box>
  );
}

export function Header() {
  return (
    <Box className="h-[60px] flex items-center space-x-10 px-6 border-b border-[#000]/40 justify-center">
      <NavLink to="/">Work Flow</NavLink>
      <NavLink to="/proxy">Proxy</NavLink>
      <NavLink to="/profile">Profile</NavLink>
    </Box>
  );
}
