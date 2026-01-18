import { Routes, Route, NavLink } from "react-router-dom";
import Flows from "@/pages/flow";
import Profiles from "@/pages/profiles";
import Proxy from "@/pages/proxy";
import { Box } from "@mui/material";

export default function App() {
  return (
    <Box sx={{ width: "100vw", height: "100vh", bgcolor: "background.default" }} className="relative overflow-hidden">
      <Header />
      <Box className="pt-[80px] h-full w-full overflow-y-auto">
        <Routes>
          <Route path="/" element={<Flows />} />
          <Route path="/proxy/:type?" element={<Proxy />} />
          <Route path="/profile/:type?" element={<Profiles />}></Route>
        </Routes>
      </Box>
    </Box>
  );
}

export function Header() {
  return (
    <Box className="glass-header fixed top-0 left-0 right-0 h-[80px] z-50 flex items-center justify-between px-8 bg-[#fdfbf7] border-b-2 border-[#374151]">
      <div className="flex items-center space-x-2">
        <div className="w-10 h-10 border-2 border-[#374151] rounded-full flex items-center justify-center text-[#374151] font-bold text-xl shadow-[2px_2px_0_#374151] bg-white">
          W
        </div>
        <span className="text-2xl font-bold text-[#374151]" style={{ fontFamily: '"Patrick Hand", cursive' }}>
          Wyse Browser
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <NavButton to="/profile" label="Profile" />
        <NavButton to="/proxy" label="Proxy" />
        <NavButton to="/" label="Work Flow" />
      </div>
    </Box>
  );
}

function NavButton({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-6 py-2 text-lg font-bold transition-all duration-200 border-2 border-[#374151] rounded-[255px_15px_225px_15px/15px_225px_15px_255px] shadow-[2px_2px_0_#374151] ${isActive
          ? "bg-[#3b82f6] text-white transform -translate-y-1 shadow-[4px_4px_0_#374151]"
          : "bg-white text-[#374151] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#374151]"
        }`
      }
      style={{ fontFamily: '"Patrick Hand", cursive' }}
    >
      {label}
    </NavLink>
  );
}
