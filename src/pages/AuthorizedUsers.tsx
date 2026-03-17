import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

type User = {
  id: string;
  phone: string;
  created_at: string;
};

const AuthorizedUsers = () => {
  const [phone, setPhone] = useState("");
  const queryClient = useQueryClient();

  /* ---------------- GET USERS ---------------- */

  const usersQuery = useQuery({
    queryKey: ["authorized-users"],
    queryFn: async () => {
      const res = await api.get<User[]>("/admin/users");
      return res.data;
    },
  });

  /* ---------------- ADD USER ---------------- */

  const addUserMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/admin/add-user?phone=${phone}`);
      return res.data;
    },

    onSuccess: () => {
      toast({
        title: "User added",
        description: "Phone authorized successfully",
      });

      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["authorized-users"] });
    },

    onError: () => {
      toast({
        title: "Failed to add user",
        variant: "destructive",
      });
    },
  });

  const handleAddUser = () => {
    if (!phone.trim()) {
      toast({
        title: "Enter phone number",
        variant: "destructive",
      });
      return;
    }

    addUserMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Authorized Users</h1>

      {/* ADD USER */}
      <div className="bg-white rounded-lg p-4 shadow flex gap-3">
        <Input
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-64"
        />

        <Button onClick={handleAddUser} disabled={addUserMutation.isPending}>
          {addUserMutation.isPending ? "Adding..." : "Add User"}
        </Button>
      </div>

      {/* USER TABLE */}
      <div className="bg-white rounded-lg p-4 shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {usersQuery.data?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}

            {usersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={2}>Loading...</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AuthorizedUsers;
