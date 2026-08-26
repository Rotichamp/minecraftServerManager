import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Plus, Boxes } from "lucide-react";
import { cn } from "../lib/utils";

/** Blocky pixel logo mark — four squares, two lit */
function LogoMark() {
  return (
    <div className="grid h-7 w-7 shrink-0 grid-cols-2 grid-rows-2 gap-[3px] rounded-[5px] p-[3px] ring-1 ring-inset ring-white/10">
      <span className="rounded-[2px] bg-accent" />
      <span className="rounded-[2px] bg-accent/20" />
      <span className="rounded-[2px] bg-accent/20" />
      <span className="rounded-[2px] bg-accent" />
    </div>
  );
}

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/create", label: "New Server", icon: Plus, end: false },
];

export default function Layout() {
  return (
    <div className="pixel-grid min-h-screen">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[0.06] bg-surface/80 backdrop-blur md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark />
          <div>
            <p className="font-display text-sm font-bold leading-none tracking-tight">
              MSM Panel
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              server manager
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-ink",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <Boxes className="h-3.5 w-3.5" />
            docker engine
          </p>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-white/[0.06] bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <LogoMark />
        <p className="font-display text-sm font-bold tracking-tight">MSM Panel</p>
      </header>

      {/* ── Content ── */}
      <main className="px-4 pb-24 pt-6 md:ml-60 md:min-h-screen md:px-8 md:pb-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-2">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150",
                  isActive ? "text-accent" : "text-muted",
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
