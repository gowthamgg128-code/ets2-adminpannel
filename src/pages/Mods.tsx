import { useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { calculateFileSha256 } from "@/lib/sha256";

type ModItem = Record<string, unknown>;

type UploadStage = "idle" | "preparing" | "uploading" | "checksum" | "saving";

type UploadTargetResponse = {
  upload_url: string;
  file_url: string;
  storage_key?: string;
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
  fields?: Record<string, string>;
};

type UploadMetadataPayload = {
  name: string;
  version: string;
  description: string;
  file_url: string;
  size: number;
  checksum: string;
  storage_key?: string;
  mime_type: string;
  original_filename: string;
};

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
const ENCRYPTED_MIME_TYPE = "application/octet-stream";

const stageLabels: Record<Exclude<UploadStage, "idle">, string> = {
  preparing: "Preparing upload",
  uploading: "Uploading file",
  checksum: "Calculating checksum",
  saving: "Saving metadata",
};

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

const isEncFile = (selectedFile: File) => selectedFile.name.toLowerCase().endsWith(".enc");

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const validateUpload = ({
  modName,
  version,
  description,
  file,
}: {
  modName: string;
  version: string;
  description: string;
  file: File | null;
}) => {
  if (!modName.trim() || !version.trim() || !description.trim() || !file) {
    return {
      title: "Missing fields",
      description: "Please fill all fields and attach an encrypted .enc file.",
    };
  }

  if (!isEncFile(file)) {
    return {
      title: "Invalid file type",
      description: "Only encrypted .enc files can be uploaded.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      title: "File exceeds 2GB limit",
      description: "Choose an encrypted file smaller than 2GB.",
    };
  }

  return null;
};

const uploadFileToStorage = async (
  target: UploadTargetResponse,
  file: File,
  onProgress: (percent: number) => void,
) => {
  const method = target.method ?? "PUT";
  const signedHeaders = target.headers ?? {};

  if (method === "POST") {
    const formData = new FormData();
    Object.entries(target.fields ?? {}).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    await axios.post(target.upload_url, formData, {
      headers: signedHeaders,
      onUploadProgress: (event) => {
        if (!event.total) {
          return;
        }
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return;
  }

  const signedContentType = Object.entries(signedHeaders).find(
    ([key]) => key.toLowerCase() === "content-type",
  )?.[1];

  await axios.put(target.upload_url, file, {
    headers: {
      ...signedHeaders,
      "Content-Type": signedContentType ?? "application/octet-stream",
    },
    onUploadProgress: (event) => {
      if (!event.total) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
};

const Mods = () => {
  const [modName, setModName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const modsQuery = useQuery({
    queryKey: ["mods"],
    queryFn: async () => {
      const response = await api.get<ModItem[]>("/mods");
      return response.data;
    },
  });

  const resetForm = () => {
    setModName("");
    setVersion("");
    setDescription("");
    setFile(null);
    setUploadStage("idle");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Missing file");
      }

      setUploadStage("preparing");
      setUploadProgress(5);

      let target: UploadTargetResponse;
      try {
        const response = await api.post<UploadTargetResponse>("/admin/mod-upload-target", {
          filename: file.name,
          size: file.size,
          content_type: ENCRYPTED_MIME_TYPE,
        });
        target = response.data;
      } catch {
        throw new Error("Failed to start upload");
      }

      if (!target.upload_url || !target.file_url) {
        throw new Error("Failed to start upload");
      }

      setUploadStage("uploading");
      setUploadProgress(0);

      try {
        await uploadFileToStorage(target, file, setUploadProgress);
      } catch {
        throw new Error("Upload failed");
      }

      setUploadStage("checksum");
      setUploadProgress(0);

      let checksum: string;
      try {
        checksum = await calculateFileSha256(file, setUploadProgress);
      } catch {
        throw new Error("Checksum calculation failed");
      }

      setUploadStage("saving");
      setUploadProgress(100);

      const payload: UploadMetadataPayload = {
        name: modName.trim(),
        version: version.trim(),
        description: description.trim(),
        file_url: target.file_url,
        size: file.size,
        checksum,
        storage_key: target.storage_key,
        mime_type: ENCRYPTED_MIME_TYPE,
        original_filename: file.name,
      };

      try {
        const response = await api.post("/admin/upload-mod", payload);
        return response.data;
      } catch {
        throw new Error("Metadata submission failed");
      }
    },
    onSuccess: () => {
      toast({ title: "Upload complete", description: "Mod uploaded successfully." });
      queryClient.invalidateQueries({ queryKey: ["mods"] });
      resetForm();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message === "Upload failed") {
        toast({
          title: "Upload to storage failed. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({ title: message, description: "Please try again.", variant: "destructive" });
      }
      setUploadStage("idle");
    },
  });

  const handleUpload = (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateUpload({ modName, version, description, file });
    if (validationError) {
      toast({
        title: validationError.title,
        description: validationError.description,
        variant: "destructive",
      });
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

  const selectedFileName = file?.name ?? "No file selected";
  const selectedFileSize = file ? formatFileSize(file.size) : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Mods</h1>

      <div className="bg-card rounded-lg border border-border p-6 mb-8">
        <h2 className="text-base font-medium text-foreground mb-4">Upload Mod</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="modName">Mod Name</Label>
            <Input
              id="modName"
              placeholder="e.g. Realistic Physics Overhaul"
              value={modName}
              onChange={(event) => setModName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              placeholder="e.g. 1.0.0"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the mod..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="file">Encrypted File (.enc)</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept=".enc"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground">
              {selectedFileName}
              {selectedFileSize ? ` • ${selectedFileSize}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Upload encrypted `.enc` files only. Files larger than 2GB are rejected.
            </p>
          </div>
          {uploadMutation.isPending && uploadStage !== "idle" && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{stageLabels[uploadStage]}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
          <div className="flex items-end">
            <Button type="submit" className="gap-2" disabled={uploadMutation.isPending}>
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload Mod"}
            </Button>
          </div>
        </form>
      </div>

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
