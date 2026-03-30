import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

type RequestItem = Record<string, unknown>;

const Requests = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyGenerated, setKeyGenerated] = useState(false);
  const [search, setSearch] = useState(""); // 🔥 NEW

  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["modRequests"],
    queryFn: async () => {
      const response = await api.get<RequestItem[]>("/admin/mod-requests");
      return response.data;
    },
  });

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModId) {
        throw new Error("Missing mod id");
      }
      const response = await api.post("/admin/generate-key", { mod_id: selectedModId });
      return response.data as Record<string, unknown>;
    },
    onSuccess: (data) => {
      const key = (data.key ?? data.generated_key ?? data.license_key) as string | undefined;
      if (!key) {
        toast({ title: "Key generation failed", description: "Invalid server response.", variant: "destructive" });
        return;
      }
      setGeneratedKey(key);
      setKeyGenerated(true);
      queryClient.invalidateQueries({ queryKey: ["modRequests"] });
    },
    onError: () => {
      toast({ title: "Key generation failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const openModal = (modId: string) => {
    setSelectedModId(modId);
    setGeneratedKey(null);
    setKeyGenerated(false);
    setModalOpen(true);
  };

  const handleGenerate = () => {
    generateKeyMutation.mutate();
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedModId(null);
    setGeneratedKey(null);
    setKeyGenerated(false);
  };

  // 🔥 UPDATED DATA MAPPING + SEARCH
  const displayRequests = (requestsQuery.data ?? [])
    .map((req) => {
      const statusValue = (req.status ?? "Pending") as string;
      const status = statusValue === "Approved" ? "Approved" : "Pending";

      return {
        id: String(req.id ?? ""),
        userName: String(req.user_name ?? "-"),
        phone: String(req.phone ?? "-"),
        pcId: String(req.pc_id ?? "-"),

        // 🔥 NEW FIELDS
        modName: String(req.mod_name ?? "-"),
        description: String(req.description ?? ""),

        // IMPORTANT → still needed for API
        modId: String(req.mod_id ?? ""),

        status,
      };
    })
    .filter((req) =>
      req.description.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Mod Requests</h1>

      <div className="bg-card rounded-lg border border-border">

        {/* 🔍 SEARCH BAR */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Search by description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        {requestsQuery.isError && (
          <p className="px-6 pt-4 text-sm text-destructive">Failed to load requests.</p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>PC ID</TableHead>
              <TableHead>Mod Name</TableHead> {/* 🔥 UPDATED */}
              <TableHead>Description</TableHead> {/* 🔥 NEW */}
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {displayRequests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.userName}</TableCell>
                <TableCell className="text-muted-foreground">{req.phone}</TableCell>
                <TableCell className="font-mono text-sm">{req.pcId}</TableCell>

                {/* 🔥 NEW UI */}
                <TableCell>{req.modName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {req.description}
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      req.status === "Pending"
                        ? "bg-status-pending text-status-pending-fg"
                        : "bg-status-active text-status-active-fg"
                    }`}
                  >
                    {req.status}
                  </span>
                </TableCell>

                <TableCell>
                  {req.status === "Pending" ? (
                    <Button size="sm" onClick={() => openModal(req.modId)}>
                      Generate Key
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Key Generated</span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {requestsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}

            {!requestsQuery.isLoading && displayRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          {!keyGenerated ? (
            <>
              <DialogHeader>
                <DialogTitle>Generate License Key</DialogTitle>
                <DialogDescription>
                  This key is valid for <strong>ONE mod</strong> and <strong>ONE PC</strong> only.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generateKeyMutation.isPending}>
                  {generateKeyMutation.isPending ? "Generating..." : "Generate"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>License Key Generated</DialogTitle>
              </DialogHeader>
              <div className="my-4">
                <div className="flex items-center gap-2 p-3 rounded-md border bg-key-bg border-key-border">
                  <code className="flex-1 text-lg font-mono font-bold text-key-fg tracking-wider">
                    {generatedKey}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Copy this key and send it to the user via WhatsApp.
                  <br />
                  <strong>This key will NOT be shown again.</strong>
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Requests;
