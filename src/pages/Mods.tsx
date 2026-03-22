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
  image_url?: string; // ✅ NEW
};

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
const ENCRYPTED_MIME_TYPE = "application/octet-stream";

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

const isEncFile = (file: File) =>
  file.name.toLowerCase().endsWith(".enc");

const Mods = () => {
  const [modName, setModName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // ✅ NEW
  const [file, setFile] = useState<File | null>(null);

  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  // ✅ FETCH MODS
  const modsQuery = useQuery({
    queryKey: ["mods"],
    queryFn: async () => {
      const res = await api.get<ModItem[]>("/mods");
      return res.data;
    },
  });

  const resetForm = () => {
    setModName("");
    setVersion("");
    setDescription("");
    setImageUrl(""); // ✅ NEW
    setFile(null);
    setUploadStage("idle");
    setUploadProgress(0);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Missing file");

      const target = (
        await api.post<UploadTargetResponse>("/admin/mod-upload-target", {
          filename: file.name,
          size: file.size,
          content_type: ENCRYPTED_MIME_TYPE,
        })
      ).data;

      await axios.put(target.upload_url, file, {
        headers: { "Content-Type": "application/octet-stream" },
        onUploadProgress: (e) => {
          if (!e.total) return;
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const checksum = await calculateFileSha256(file, setUploadProgress);

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
        image_url: imageUrl.trim(), // ✅ NEW
      };

      return (await api.post("/admin/upload-mod", payload)).data;
    },

    onSuccess: () => {
      toast({ title: "Upload complete" });
      queryClient.invalidateQueries({ queryKey: ["mods"] });
      resetForm();
    },

    onError: () => {
      toast({
        title: "Upload failed",
        variant: "destructive",
      });
    },
  });

  const handleUpload = (e: FormEvent) => {
    e.preventDefault();

    if (!modName || !version || !description || !file) {
      toast({
        title: "Fill all fields",
        variant: "destructive",
      });
      return;
    }

    if (!isEncFile(file)) {
      toast({
        title: "Only .enc file allowed",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate();
  };

  const mods = modsQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Mods</h1>

      {/* ✅ UPLOAD FORM */}
      <div className="bg-card border rounded-lg p-6 mb-8">
        <form
          onSubmit={handleUpload}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Input
            placeholder="Mod Name"
            value={modName}
            onChange={(e) => setModName(e.target.value)}
          />

          <Input
            placeholder="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />

          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="md:col-span-2"
          />

          {/* ✅ IMAGE URL FIELD */}
          <Input
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="md:col-span-2"
          />

          <Input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="md:col-span-2"
          />

          <Button type="submit">
            {uploadMutation.isPending ? "Uploading..." : "Upload Mod"}
          </Button>
        </form>
      </div>

      {/* ✅ MOD LIST TABLE */}
      <div className="bg-card border rounded-lg">
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
            {mods.map((mod: any) => (
              <TableRow key={mod.id}>
                <TableCell>{mod.name}</TableCell>
                <TableCell>{mod.version}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={mod.status || (mod.is_active ? "Active" : "Inactive")}
                  />
                </TableCell>
                <TableCell>{mod.created_at || "-"}</TableCell>
              </TableRow>
            ))}

            {modsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            )}

            {!modsQuery.isLoading && mods.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No mods found
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
