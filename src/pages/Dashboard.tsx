import { Package, FileText, Key } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModItem = Record<string, unknown>;
type RequestItem = Record<string, unknown>;
type LicenseItem = Record<string, unknown>;

const Dashboard = () => {
  const modsQuery = useQuery({
    queryKey: ["mods"],
    queryFn: async () => {
      const response = await api.get<ModItem[]>("/mods");
      return response.data;
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["modRequests"],
    queryFn: async () => {
      const response = await api.get<RequestItem[]>("/admin/mod-requests");
      return response.data;
    },
  });

  const licensesQuery = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await api.get<LicenseItem[]>("/admin/licenses");
      return response.data;
    },
  });

  const totalMods = modsQuery.data?.length ?? 0;
  const pendingRequests =
    requestsQuery.data?.filter((item) => {
      const status = String((item as { status?: string }).status ?? "").toLowerCase();
      return status === "pending";
    }).length ?? 0;
  const activeLicenses = licensesQuery.data?.length ?? 0;

  const stats = [
    { label: "Total Mods", value: totalMods, icon: Package, loading: modsQuery.isLoading, error: modsQuery.isError },
    { label: "Pending Requests", value: pendingRequests, icon: FileText, loading: requestsQuery.isLoading, error: requestsQuery.isError },
    { label: "Active Licenses", value: activeLicenses, icon: Key, loading: licensesQuery.isLoading, error: licensesQuery.isError },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {stat.loading ? "..." : stat.error ? "--" : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
