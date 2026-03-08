import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

type LicenseItem = Record<string, unknown>;

const Licenses = () => {
  const licensesQuery = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await api.get<LicenseItem[]>("/admin/licenses");
      return response.data;
    },
  });

  const displayLicenses = (licensesQuery.data ?? []).map((license) => {
    const statusValue = (license.status ?? license.license_status ?? "Active") as string;
    const status = statusValue === "Revoked" ? "Revoked" : "Active";
    return {
      id: String(license.id ?? license.license_id ?? license.pc_id ?? ""),
      modId: String(license.modId ?? license.mod_id ?? "-"),
      pcId: String(license.pcId ?? license.pc_id ?? "-"),
      status: status as "Active" | "Revoked",
      activatedAt: String(license.activatedAt ?? license.activated_at ?? "-"),
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Licenses</h1>

      <div className="bg-card rounded-lg border border-border">
        {licensesQuery.isError && (
          <p className="px-6 pt-4 text-sm text-destructive">Failed to load licenses.</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mod ID</TableHead>
              <TableHead>PC ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Activated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayLicenses.map((license) => (
              <TableRow key={license.id}>
                <TableCell className="font-mono text-sm">{license.modId}</TableCell>
                <TableCell className="font-mono text-sm">{license.pcId}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      license.status === "Active"
                        ? "bg-status-active text-status-active-fg"
                        : "bg-status-revoked text-status-revoked-fg"
                    }`}
                  >
                    {license.status}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{license.activatedAt}</TableCell>
              </TableRow>
            ))}
            {licensesQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!licensesQuery.isLoading && displayLicenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No licenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Licenses;
