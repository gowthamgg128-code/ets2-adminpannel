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

const isEncFile = (selectedFile: File) =>
  selectedFile.name.toLowerCase().endsWith(".enc");

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;

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
        if (!event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return;
  }

  await axios.put(target.upload_url, file, {
    headers: {
      ...signedHeaders,
      "Content-Type": "application/octet-stream",
    },
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
};

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

      await uploadFileToStorage(target, file, setUploadProgress);

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
      toast({ title: "Upload complete", description: "Mod uploaded successfully." });
      queryClient.invalidateQueries({ queryKey: ["mods"] });
      resetForm();
    },

    onError: () => {
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setUploadStage("idle");
    },
  });

  const handleUpload = (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateUpload({
      modName,
      version,
      description,
      file,
    });

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

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Mods</h1>

      <div className="bg-card rounded-lg border p-6 mb-8">
        <h2 className="text-base font-medium mb-4">Upload Mod</h2>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Input placeholder="Mod Name" value={modName} onChange={(e) => setModName(e.target.value)} />
          <Input placeholder="Version" value={version} onChange={(e) => setVersion(e.target.value)} />

          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="md:col-span-2"
          />

          {/* ✅ NEW FIELD */}
          <Input
            placeholder="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="md:col-span-2"
          />

          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <Button type="submit">
            {uploadMutation.isPending ? "Uploading..." : "Upload Mod"}
          </Button>

        </form>
      </div>
    </div>
  );
};

export default Mods;
