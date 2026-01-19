import { Routes, Route, NavLink } from "react-router-dom";
import Flows from "@/pages/flow";
import Profiles from "@/pages/profiles";
import Proxy from "@/pages/proxy";


export default function App() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground antialiased">
      <Header />
      <main className="pt-[72px] h-screen w-full overflow-y-auto">
        <Routes>
          <Route path="/" element={<Flows />} />
          <Route path="/proxy/:type?" element={<Proxy />} />
          <Route path="/profile/:type?" element={<Profiles />}></Route>
        </Routes>
      </main>
    </div>
  );
}

export function Header() {
  return (
    <header className="glass-header fixed top-0 left-0 right-0 h-[72px] px-6 lg:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-xl shadow-sm border border-primary/20">
          W
        </div>
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Wyse Browser
        </span>
      </div>
      <nav className="flex items-center space-x-1 bg-secondary/50 p-1 rounded-lg border border-border">
        <NavButton to="/profile" label="Profile" />
        <NavButton to="/proxy" label="Proxy" />
        <NavButton to="/" label="Work Flow" />
      </nav>
    </header>
  );
}

function NavButton({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${isActive
          ? "bg-white text-primary shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-white/50"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
