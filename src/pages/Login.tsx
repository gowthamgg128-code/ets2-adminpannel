import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: async () => {
      const payload = { username, password };
      const doLogin = async () =>
        api.post("/admin/login", payload, { timeout: 45000 });

      try {
        const response = await doLogin();
        return response.data as { access_token?: string };
      } catch (err) {
        const error = err as AxiosError;
        const shouldRetry =
          error.code === "ECONNABORTED" ||
          error.code === "ERR_NETWORK" ||
          !error.response;

        if (!shouldRetry) {
          throw err;
        }

        try {
          await api.get("/health", { timeout: 15000 });
        } catch {
          // Ignore warmup failures and still try one final login request.
        }

        const retryResponse = await doLogin();
        return retryResponse.data as { access_token?: string };
      }
    },
    onSuccess: (data) => {
      if (!data?.access_token) {
        setError("Login failed. Please try again.");
        return;
      }
      login(data.access_token);
      navigate("/dashboard");
    },
    onError: (err) => {
      const error = err as AxiosError<{ detail?: string }>;
      const message = error.response?.data?.detail;

      if (error.code === "ECONNABORTED") {
        setError("Server is slow or waking up. Please try again in a few seconds.");
        return;
      }

      if (error.code === "ERR_NETWORK" || !error.response) {
        setError("Network issue reaching backend. Check internet and try again.");
        return;
      }

      if (error.response?.status === 401) {
        setError("Invalid credentials. Please try again.");
        return;
      }

      setError(message || "Unable to reach backend. Check connection and try again.");
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/admin-logo.png"
            alt="Admin Panel logo"
            className="mx-auto h-20 w-20 rounded-lg object-contain mb-4"
          />
          <h1 className="text-xl font-semibold text-foreground">Admin Panel Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin Panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
