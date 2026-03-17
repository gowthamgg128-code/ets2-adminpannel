import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, FileText, Key } from "lucide-react";
import { LayoutDashboard, Package, FileText, Key, Users } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Mods", path: "/mods", icon: Package },
  { label: "Requests", path: "/requests", icon: FileText },
  { label: "Licenses", path: "/licenses", icon: Key },
  { label: "Authorized Users", path: "/authorized-users", icon: Users },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-width)] bg-admin-sidebar-bg flex flex-col z-30">
      <div className="h-[var(--header-height)] flex items-center gap-2 px-5 border-b border-admin-sidebar-border">
        <img src="/admin-logo.png" alt="Admin Panel logo" className="h-8 w-8 rounded object-contain" />
        <span className="text-admin-sidebar-fg-active font-semibold text-sm tracking-wide">
          Admin Panel
        </span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-admin-sidebar-active text-admin-sidebar-fg-active"
                  : "text-admin-sidebar-fg hover:bg-admin-sidebar-hover hover:text-admin-sidebar-fg-active"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-admin-sidebar-border">
        <p className="text-xs text-admin-sidebar-fg/60">v1.0.0 - Mod Distribution</p>
      </div>
    </aside>
  );
};

export default AdminSidebar;
