import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/lib/api";

type ModItem = Record<string, unknown>;

const StatusBadge = ({ status }: { status: "Active" | "Inactive" }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      status === "Active"
        ? "bg-status-active text-status-active-fg"
        : "bg-status-inactive text-status-inactive-fg"
    }`}
  >
    {status}
  </span>
);

const Mods = () => {
  const [modName, setModName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const modsQuery = useQuery({
    queryKey: ["mods"],
    queryFn: async () => {
      const response = await api.get<ModItem[]>("/mods");
      return response.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", modName);
      formData.append("version", version);
      formData.append("description", description);
      if (file) {
        formData.append("file", file);
      }
      const response = await api.post("/admin/upload-mod", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Upload complete", description: "Mod uploaded successfully." });
      queryClient.invalidateQueries({ queryKey: ["mods"] });
      setModName("");
      setVersion("");
      setDescription("");
      setFile(null);
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim() || !version.trim() || !description.trim() || !file) {
      toast({ title: "Missing fields", description: "Please fill all fields and attach a file.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate();
  };

  const displayMods = (modsQuery.data ?? []).map((mod) => {
    const name = (mod.name ?? mod.title ?? mod.mod_name ?? "Unnamed") as string;
    const modVersion = (mod.version ?? mod.mod_version ?? "-") as string;
    const statusValue = (mod.status ?? (mod.is_active ? "Active" : "Inactive")) as string;
    const status = statusValue === "Active" || statusValue === "Inactive" ? statusValue : "Inactive";
    const createdAt = (mod.createdAt ?? mod.created_at ?? mod.created ?? "-") as string;

    return {
      id: String(mod.id ?? mod.mod_id ?? name),
      name,
      version: modVersion,
      status: status as "Active" | "Inactive",
      createdAt,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Mods</h1>

      {/* Upload Section */}
      <div className="bg-card rounded-lg border border-border p-6 mb-8">
        <h2 className="text-base font-medium text-foreground mb-4">Upload Mod</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="modName">Mod Name</Label>
            <Input
              id="modName"
              placeholder="e.g. Realistic Physics Overhaul"
              value={modName}
              onChange={(e) => setModName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              placeholder="e.g. 1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the mod..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File (.zip / .scs)</Label>
            <Input
              id="file"
              type="file"
              accept=".zip,.scs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="gap-2" disabled={uploadMutation.isPending}>
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload Mod"}
            </Button>
          </div>
        </form>
      </div>

      {/* Mods Table */}
      <div className="bg-card rounded-lg border border-border">
        {modsQuery.isError && (
          <p className="px-6 pt-4 text-sm text-destructive">Failed to load mods.</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mod Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayMods.map((mod) => (
              <TableRow key={mod.id}>
                <TableCell className="font-medium">{mod.name}</TableCell>
                <TableCell>{mod.version}</TableCell>
                <TableCell>
                  <StatusBadge status={mod.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{mod.createdAt}</TableCell>
              </TableRow>
            ))}
            {modsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!modsQuery.isLoading && displayMods.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No mods found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Mods;
