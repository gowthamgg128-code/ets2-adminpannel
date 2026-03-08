import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminHeader = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-[var(--sidebar-width)] right-0 h-[var(--header-height)] bg-card border-b border-border flex items-center justify-between px-6 z-20">
      <h2 className="text-sm font-medium text-muted-foreground">Admin Panel</h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-muted-foreground hover:text-foreground gap-2"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </header>
  );
};

export default AdminHeader;
