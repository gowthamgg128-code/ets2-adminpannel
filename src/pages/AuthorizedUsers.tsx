import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function AuthorizedUsers() {

  const [phone, setPhone] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch(`${API}/admin/users`);
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async () => {

    if (!phone) return alert("Enter phone number");

    setLoading(true);

    const res = await fetch(`${API}/admin/add-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      setPhone("");
      fetchUsers();
    }

    alert(data.message);
  };

  return (
    <div className="page-container">

      <h2>Authorized Users</h2>

      <div className="card">

        <input
          type="text"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button onClick={addUser} disabled={loading}>
          {loading ? "Adding..." : "Add User"}
        </button>

      </div>

      <div className="card">

        <h3>Authorized Users List</h3>

        <table>

          <thead>
            <tr>
              <th>Phone</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>

            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.phone}</td>
                <td>{new Date(user.created_at).toLocaleString()}</td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
