import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;

export default function AuthorizedUsers() {
  const [phone, setPhone] = useState("");
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const res = await fetch(`${API}/admin/users`);
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async () => {
    const res = await fetch(`${API}/admin/add-user?phone=${phone}`, {
      method: "POST"
  });

    const data = await res.json();

    if (data.success) {
      setPhone("");
      fetchUsers();
    }

    alert(data.message);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Authorized Users</h1>

      <div className="bg-white rounded-lg p-4 shadow flex gap-3">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
          className="border p-2 rounded w-64"
        />

        <button
          onClick={addUser}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b">
                <td className="p-2">{u.phone}</td>
                <td className="p-2">
                  {new Date(u.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
