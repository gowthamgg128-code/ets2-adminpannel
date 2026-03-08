# ETS2 Admin Panel - Technical Architecture Documentation

## Table of Contents
1. [Admin Panel Tech Stack](#1-admin-panel-tech-stack)
2. [Admin Features](#2-admin-features)
3. [Upload Flow](#3-upload-flow)
4. [Key Generation Logic](#4-key-generation-logic)
5. [Access Control](#5-access-control)
6. [Architecture Overview](#6-architecture-overview)
7. [API Endpoints Reference](#7-api-endpoints-reference)

---

## 1. Admin Panel Tech Stack

### 1.1 Frontend Framework

**Primary Framework**: React 18 with TypeScript

**Build Tool**: Vite
- Fast development server with Hot Module Replacement (HMR)
- Optimized production builds with code splitting
- Native ES modules support

**Core Dependencies**:
- **React Router v6** (`react-router-dom`): Client-side routing and navigation
- **TanStack React Query v5**: Server state management, caching, and data fetching
- **Axios**: HTTP client for API requests with interceptors
- **shadcn/ui + Radix UI**: Pre-built accessible UI components
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **React Hook Form + Zod**: Form management and validation (dependencies present)

**Development Tools**:
- **TypeScript**: Static type checking
- **ESLint**: Code linting with flat config
- **Vitest**: Unit testing framework with jsdom
- **PostCSS**: CSS processing

### 1.2 Backend Connection Method

**API Communication**: RESTful HTTP API via Axios

**Base Configuration** (`src/lib/api.ts`):
```typescript
const api = axios.create({
  baseURL: "http://localhost:8000",
});
```

**Authentication Flow**:
- **Token-based authentication** using JWT (JSON Web Tokens)
- Token stored in `localStorage` under key: `ets2_admin_token`
- All authenticated requests include the token via **Axios request interceptor**:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ets2_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Auto-logout on 401**:
- **Axios response interceptor** monitors for 401 Unauthorized responses
- Automatically clears token and redirects to `/login` when session expires

**Data Fetching Pattern**:
- Uses **TanStack React Query** for all API calls
- Provides automatic caching, background refetching, and optimistic updates
- Query invalidation on mutations ensures data consistency

---

## 2. Admin Features

### 2.1 Dashboard Overview
**Route**: `/dashboard`  
**Component**: `src/pages/Dashboard.tsx`

**Functionality**:
- Displays key metrics across three cards:
  - **Total Mods**: Count of all mods in the system
  - **Pending Requests**: Number of unprocessed license requests
  - **Active Licenses**: Count of currently active licenses
- Real-time data fetching with React Query
- Loading and error states for each metric

**API Endpoints Used**:
- `GET /mods` - Fetch all mods
- `GET /admin/mod-requests` - Fetch all mod requests
- `GET /admin/licenses` - Fetch all licenses

### 2.2 View User Requests
**Route**: `/requests`  
**Component**: `src/pages/Requests.tsx`

**Functionality**:
- View all mod license requests submitted by users
- Display request details:
  - User Name
  - Phone Number
  - PC ID (unique hardware identifier)
  - Mod ID (requested mod)
  - Status (Pending/Approved)
- Filter and identify pending requests requiring action
- Action button to generate activation keys for pending requests

**Data Fields**:
```typescript
{
  id: string;
  userName: string;
  phone: string;
  pcId: string;    // Hardware identifier
  modId: string;   // Requested mod reference
  status: "Pending" | "Approved";
}
```

**API Endpoint**:
- `GET /admin/mod-requests` - Retrieves all user requests

### 2.3 Generate Activation Key
**Route**: `/requests` (modal dialog)  
**Component**: `src/pages/Requests.tsx`

**Functionality**:
- Generate unique license keys for approved mod requests
- Two-step modal workflow:
  1. Confirmation dialog explaining key constraints
  2. Key display with copy-to-clipboard functionality
- Automatic status update from "Pending" to "Approved"
- Query invalidation to refresh request list

**Key Generation Flow**:
1. Admin clicks "Generate Key" button for a pending request
2. Modal opens with confirmation message:
   - "This key is valid for ONE mod and ONE PC only"
3. Admin clicks "Generate" button
4. Backend generates key and returns in response
5. Key displayed in monospace font with copy button
6. Admin can copy key to send to user (e.g., via WhatsApp)

**API Endpoint**:
- `POST /admin/generate-key`
  - Request Body: `{ mod_id: string }`
  - Response: `{ key: string }` (or `generated_key` or `license_key`)

**Key Format** (expected server-side):
- Format: `ETS2-XXXX-YYYY-ZZZZ` (implementation detail on backend)

**Mutation Logic**:
```typescript
const generateKeyMutation = useMutation({
  mutationFn: async () => {
    const response = await api.post("/admin/generate-key", { 
      mod_id: selectedModId 
    });
    return response.data;
  },
  onSuccess: (data) => {
    setGeneratedKey(data.key);
    queryClient.invalidateQueries({ queryKey: ["modRequests"] });
  }
});
```

### 2.4 Upload Mod File
**Route**: `/mods`  
**Component**: `src/pages/Mods.tsx`

**Functionality**:
- Upload new mod files to the system
- Multi-field form with validation:
  - Mod Name (text input)
  - Version (text input, e.g., "1.0.0")
  - Description (textarea)
  - File upload (.zip or .scs formats)
- Form validation ensures all fields are filled
- Toast notifications for success/failure
- Automatic form reset after successful upload

**Form Fields**:
```typescript
{
  name: string;        // Mod display name
  version: string;     // Version number
  description: string; // Mod description
  file: File;          // Binary mod file
}
```

**Upload Handler**:
```typescript
const formData = new FormData();
formData.append("name", modName);
formData.append("version", version);
formData.append("description", description);
formData.append("file", file);

await api.post("/admin/upload-mod", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
```

**File Type Validation**:
- Accepted formats: `.zip`, `.scs`
- Frontend validation via `accept` attribute
- Backend should perform additional validation

**API Endpoint**:
- `POST /admin/upload-mod` (multipart/form-data)

### 2.5 Edit Mod
**Route**: `/mods`  
**Component**: `src/pages/Mods.tsx`

**Current Implementation**:
- **View-only mod table** displaying:
  - Mod Name
  - Version
  - Status (Active/Inactive badge)
  - Created At timestamp
- **No edit functionality currently implemented**

**Planned Edit Features** (Not Yet Implemented):
- In-place editing of mod metadata
- Version updates
- Status toggle (Active/Inactive)
- File replacement
- Would require additional API endpoints:
  - `PUT /admin/mods/:id` - Update mod details
  - `DELETE /admin/mods/:id` - Delete mod

**Data Display**:
```typescript
{
  id: string;
  name: string;
  version: string;
  status: "Active" | "Inactive";
  createdAt: string;
}
```

### 2.6 Disable Key (License Management)
**Route**: `/licenses`  
**Component**: `src/pages/Licenses.tsx`

**Current Implementation**:
- **View-only license table** displaying:
  - Mod ID
  - PC ID (hardware identifier)
  - Status (Active/Revoked)
  - Activated At timestamp
- **No revocation functionality currently implemented**

**Planned Revocation Features** (Not Yet Implemented):
- Action button to revoke/disable active licenses
- Confirmation dialog before revocation
- Would require additional API endpoint:
  - `POST /admin/revoke-license` or `PUT /admin/licenses/:id/revoke`

**Data Display**:
```typescript
{
  id: string;
  modId: string;
  pcId: string;
  status: "Active" | "Revoked";
  activatedAt: string;
}
```

**API Endpoint** (Current):
- `GET /admin/licenses` - Fetch all licenses

---

## 3. Upload Flow

### 3.1 How File Upload is Handled

**Client-Side Flow**:

1. **Form Input Collection**:
   - Admin fills out form fields (name, version, description)
   - Admin selects file using HTML file input with `accept=".zip,.scs"`
   - File object stored in component state: `const [file, setFile] = useState<File | null>(null)`

2. **Frontend Validation**:
   - Checks all fields are non-empty: `!modName.trim() || !version.trim() || !description.trim() || !file`
   - Shows error toast if validation fails
   - Prevents submission if validation fails

3. **FormData Construction**:
   ```typescript
   const formData = new FormData();
   formData.append("name", modName);
   formData.append("version", version);
   formData.append("description", description);
   formData.append("file", file);
   ```

4. **HTTP Request**:
   - Method: `POST`
   - Content-Type: `multipart/form-data` (automatically set by browser)
   - Authorization header added via Axios interceptor
   - Request sent to `/admin/upload-mod`

5. **Response Handling**:
   - **Success**: 
     - Toast notification: "Upload complete"
     - Invalidates `["mods"]` query to refresh mod list
     - Clears form fields
   - **Error**: 
     - Toast notification: "Upload failed"
     - Form retains current values for retry

**React Query Mutation**:
```typescript
const uploadMutation = useMutation({
  mutationFn: async () => {
    const formData = new FormData();
    // ... append fields
    return await api.post("/admin/upload-mod", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  onSuccess: () => {
    toast({ title: "Upload complete" });
    queryClient.invalidateQueries({ queryKey: ["mods"] });
    // Clear form
  },
  onError: () => {
    toast({ title: "Upload failed", variant: "destructive" });
  }
});
```

### 3.2 File Size Limit

**Current Implementation**: 
- **No explicit file size limit enforced on frontend**
- Browser may have implicit limits (typically 2GB for most browsers)

**Backend Responsibility**:
- Backend server should implement file size restrictions
- Common limits for mod files: 50MB - 500MB
- Should return appropriate error response if file exceeds limit

**Recommended Implementation**:
```typescript
// Frontend size check (example):
if (file.size > 100 * 1024 * 1024) { // 100MB
  toast({ 
    title: "File too large", 
    description: "Maximum file size is 100MB",
    variant: "destructive" 
  });
  return;
}
```

**Upload Progress** (Not Currently Implemented):
- Could add progress bar using Axios `onUploadProgress` callback
- Would improve UX for large file uploads

### 3.3 Where File is Sent (Backend Endpoint)

**Endpoint**: `POST /admin/upload-mod`

**Full URL**: `http://localhost:8000/admin/upload-mod`

**Request Format**:
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Headers**: 
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data` (set automatically)

**Request Body** (FormData):
```
name: string
version: string
description: string
file: binary (File object)
```

**Expected Response** (Success):
```json
{
  "id": "mod_123",
  "name": "Realistic Physics",
  "version": "1.0.0",
  "status": "Active",
  "createdAt": "2026-03-03T10:30:00Z"
}
```

**Expected Response** (Error):
```json
{
  "error": "File too large",
  "message": "Maximum file size exceeded"
}
```

**Backend Processing** (Expected):
1. Validate authentication token
2. Validate file type (must be .zip or .scs)
3. Validate file size
4. Scan file for malware (recommended)
5. Generate unique file identifier
6. Store file in object storage or filesystem
7. Create database record for mod
8. Return mod details

---

## 4. Key Generation Logic

### 4.1 Is the Key Random?

**Yes, the key is randomly generated.**

**Current Implementation Details**:
- Key generation happens **server-side** via the `/admin/generate-key` endpoint
- Frontend sends request with `mod_id` only
- Backend generates and returns the key
- Frontend does NOT generate keys (security best practice)

**Expected Format**: `ETS2-XXXX-YYYY-ZZZZ`
- Four-segment format separated by hyphens
- Each segment typically contains alphanumeric characters
- Example: `ETS2-A7B3-K9M2-X5Q8`

**Security Considerations**:
- Keys should use **cryptographically secure random generation** (e.g., `crypto.randomBytes()`)
- Should have sufficient entropy to prevent brute force attacks
- Typical recommendation: 128-bit entropy minimum

**Backend Implementation** (Expected):
```python
# Example Python implementation
import secrets
import string

def generate_license_key():
    chars = string.ascii_uppercase + string.digits
    segments = [
        ''.join(secrets.choice(chars) for _ in range(4))
        for _ in range(3)
    ]
    return f"ETS2-{'-'.join(segments)}"
```

### 4.2 Is the Key Linked to PC ID?

**Yes, keys are linked to PC ID (hardware identifier).**

**How It Works**:

1. **Request Phase**:
   - User submits mod request including their `pcId`
   - Request data: `{ userName, phone, pcId, modId }`
   - PC ID represents unique hardware fingerprint

2. **Key Generation Phase**:
   - Admin generates key for specific `mod_id`
   - Backend creates license record linking:
     - Generated key
     - Mod ID
     - PC ID (from the original request)

3. **Activation Phase** (User-side):
   - User enters license key in their mod client
   - Client sends: `{ key, pcId }` to validation endpoint
   - Backend checks:
     - Is key valid?
     - Does PC ID match the key's registered PC ID?
     - Is key not expired or revoked?

**Database Schema** (Expected):
```sql
licenses (
  id            SERIAL PRIMARY KEY,
  license_key   VARCHAR(255) UNIQUE NOT NULL,
  mod_id        VARCHAR(255) NOT NULL,
  pc_id         VARCHAR(255) NOT NULL,
  status        ENUM('Active', 'Revoked') DEFAULT 'Active',
  activated_at  TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NULL
)
```

**PC ID Binding Enforcement**:
- One key can only be activated on **one PC**
- Attempting to use the key on a different PC should fail validation
- Prevents key sharing between users

**Request to License Flow**:
```typescript
// Step 1: User Request
POST /api/mod-requests
Body: { userName, phone, pcId, modId }

// Step 2: Admin Generates Key
POST /admin/generate-key
Body: { mod_id: "123" }
Response: { key: "ETS2-XXXX-YYYY-ZZZZ" }

// Backend creates license record:
{
  license_key: "ETS2-XXXX-YYYY-ZZZZ",
  mod_id: "123",
  pc_id: "ABC-DEF-GHI",  // From original request
  status: "Active"
}

// Step 3: User Activates
POST /api/activate-license
Body: { key: "ETS2-XXXX-YYYY-ZZZZ", pcId: "ABC-DEF-GHI" }
Response: { success: true, modDownloadUrl: "..." }
```

### 4.3 Is Expiration Supported?

**Implementation Status**: **Partially Planned**

**Current Implementation**:
- Frontend does NOT display or handle expiration dates
- License table shows only: `modId, pcId, status, activatedAt`
- No `expiresAt` field visible in UI

**Backend Support** (Expected):
- Database schema likely includes `expires_at` timestamp field
- Keys can be generated with optional expiration dates
- Validation endpoint would check expiration

**Expiration Logic** (Expected Backend):
```javascript
function validateLicense(key, pcId) {
  const license = db.findLicense(key);
  
  if (!license) return { valid: false, reason: "Key not found" };
  if (license.status === "Revoked") return { valid: false, reason: "Key revoked" };
  if (license.pc_id !== pcId) return { valid: false, reason: "PC ID mismatch" };
  if (license.expires_at && new Date() > license.expires_at) {
    return { valid: false, reason: "Key expired" };
  }
  
  return { valid: true };
}
```

**Expiration Types** (Common Patterns):
1. **Permanent Licenses**: `expires_at = NULL` (no expiration)
2. **Time-Limited**: `expires_at = activated_at + duration` (e.g., 1 year)
3. **Subscription-Based**: Renewable expiration dates

**Admin Panel Enhancements Needed**:
- Add expiration date field to key generation form
- Display expiration dates in licenses table
- Add filter for expired licenses
- Add renewal/extension functionality

**Example Extended UI** (Not Implemented):
```typescript
// Key generation with expiration
{
  mod_id: string;
  expiration_type: "permanent" | "duration";
  duration_days?: number;  // If duration type
}

// License display
{
  id: string;
  modId: string;
  pcId: string;
  status: "Active" | "Revoked" | "Expired";
  activatedAt: string;
  expiresAt: string | null;
}
```

---

## 5. Access Control

### 5.1 How Admin Authentication Works

**Authentication Flow**:

#### **Step 1: Login** (`/login`)

**Component**: `src/pages/Login.tsx`

1. Admin enters username and password
2. Frontend validates both fields are non-empty
3. Sends credentials to backend:
   ```typescript
   POST /admin/login
   Body: { username: string, password: string }
   ```

4. Backend validates credentials (database lookup + password hash comparison)
5. Backend generates JWT token with admin claims
6. Backend responds:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

7. Frontend stores token in localStorage:
   ```typescript
   localStorage.setItem("ets2_admin_token", data.access_token);
   ```

8. Auth context updates state: `isAuthenticated = true`
9. Redirect to `/dashboard`

**Login API Endpoint**:
- **Endpoint**: `POST /admin/login`
- **Request**: `{ username: string, password: string }`
- **Response**: `{ access_token: string }`
- **Status Codes**:
  - `200`: Successful authentication
  - `401`: Invalid credentials
  - `500`: Server error

#### **Step 2: Authenticated Requests**

**Axios Request Interceptor** (`src/lib/api.ts`):
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ets2_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

- **Every API request** automatically includes: `Authorization: Bearer <token>`
- Backend validates token on each request
- Backend decodes JWT to extract admin identity and permissions

#### **Step 3: Session Validation**

**Axios Response Interceptor**:
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("ets2_admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

**Auto-logout Triggers**:
- Token expired
- Token revoked
- Invalid token
- Backend returns 401 Unauthorized

#### **Step 4: Route Protection**

**Protected Route Component**: `src/components/AdminLayout.tsx`
```typescript
const AdminLayout = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      <AdminSidebar />
      <AdminHeader />
      <main>
        <Outlet />  {/* Renders child routes */}
      </main>
    </>
  );
};
```

**Route Structure**:
```typescript
<Routes>
  <Route path="/login" element={<Login />} />  {/* Public */}
  
  <Route element={<AdminLayout />}>  {/* Protected wrapper */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/mods" element={<Mods />} />
    <Route path="/requests" element={<Requests />} />
    <Route path="/licenses" element={<Licenses />} />
  </Route>
</Routes>
```

**Auth Context** (`src/contexts/AuthContext.tsx`):
```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => 
    localStorage.getItem("ets2_admin_token")
  );

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("ets2_admin_token", newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("ets2_admin_token");
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: Boolean(token), 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### **Step 5: Logout**

**Logout Flow**:
1. User clicks "Logout" button in header
2. Calls `logout()` from AuthContext
3. Clears token from localStorage
4. Updates `isAuthenticated` to `false`
5. Redirects to `/login`

**Logout Handler**:
```typescript
const handleLogout = () => {
  logout();
  navigate("/login");
  toast({ title: "Logged out successfully" });
};
```

### 5.2 Role-Based Permissions

**Current Implementation**: **Not Implemented**

**Current Behavior**:
- All authenticated admins have **full access** to all features
- No distinction between admin roles or permission levels
- Single-tier authentication: logged in = full access

**Planned Role-Based Access Control (RBAC)**:

**Potential Role Structure**:
```typescript
enum AdminRole {
  SUPER_ADMIN = "super_admin",    // Full access
  MOD_MANAGER = "mod_manager",    // Upload and manage mods
  LICENSE_MANAGER = "license_manager",  // Generate and revoke keys
  SUPPORT = "support",            // View-only access
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  createdAt: string;
}
```

**Permission Matrix** (Proposed):

| Feature | Super Admin | Mod Manager | License Manager | Support |
|---------|-------------|-------------|-----------------|---------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Upload Mods | ✅ | ✅ | ❌ | ❌ |
| Edit Mods | ✅ | ✅ | ❌ | ❌ |
| Delete Mods | ✅ | ❌ | ❌ | ❌ |
| View Requests | ✅ | ✅ | ✅ | ✅ |
| Generate Keys | ✅ | ❌ | ✅ | ❌ |
| View Licenses | ✅ | ✅ | ✅ | ✅ |
| Revoke Keys | ✅ | ❌ | ✅ | ❌ |
| Manage Admins | ✅ | ❌ | ❌ | ❌ |

**Implementation Steps** (Future):

1. **Backend Changes**:
   ```typescript
   // JWT token would include role
   {
     sub: "admin_123",
     username: "admin@example.com",
     role: "mod_manager",
     permissions: ["upload_mod", "edit_mod", "view_requests"],
     iat: 1234567890,
     exp: 1234571490
   }
   ```

2. **Frontend Changes**:
   ```typescript
   // Enhanced AuthContext
   interface AuthContextType {
     isAuthenticated: boolean;
     user: AdminUser | null;
     hasPermission: (permission: string) => boolean;
     hasRole: (role: AdminRole) => boolean;
     login: (token: string) => void;
     logout: () => void;
   }

   // Conditional rendering
   {hasPermission('upload_mod') && (
     <Button onClick={handleUpload}>Upload Mod</Button>
   )}
   ```

3. **Route-Level Protection**:
   ```typescript
   <Route 
     path="/mods/upload" 
     element={
       <RequirePermission permission="upload_mod">
         <ModUpload />
       </RequirePermission>
     } 
   />
   ```

4. **Backend Middleware**:
   ```javascript
   // Express middleware example
   function requirePermission(permission) {
     return (req, res, next) => {
       if (!req.user.permissions.includes(permission)) {
         return res.status(403).json({ error: "Forbidden" });
       }
       next();
     };
   }

   app.post('/admin/upload-mod', 
     authenticate, 
     requirePermission('upload_mod'), 
     uploadModHandler
   );
   ```

**Security Best Practices**:

1. **Token Security**:
   - Use HTTPS only in production
   - Set short token expiration (15-30 minutes)
   - Implement refresh token mechanism
   - Use httpOnly cookies instead of localStorage (more secure)

2. **Password Security**:
   - Enforce strong password requirements
   - Use bcrypt/argon2 for password hashing
   - Implement rate limiting on login attempts
   - Add 2FA for sensitive operations

3. **Authorization**:
   - Always validate permissions on backend (never trust frontend)
   - Use the principle of least privilege
   - Log all admin actions for audit trail
   - Implement session timeout

4. **CSRF Protection**:
   - Use CSRF tokens for state-changing operations
   - Validate `Origin` and `Referer` headers

---

## 6. Architecture Overview

### 6.1 Component Hierarchy

```
App (Providers)
├── BrowserRouter
│   └── AuthProvider
│       ├── Login (Public Route)
│       └── AdminLayout (Protected)
│           ├── AdminSidebar
│           ├── AdminHeader
│           └── Outlet
│               ├── Dashboard
│               ├── Mods
│               ├── Requests
│               └── Licenses
```

### 6.2 Data Flow Architecture

**State Management Layers**:

1. **Server State** (TanStack React Query):
   - API data caching
   - Background refetching
   - Optimistic updates
   - Query keys:
     - `["mods"]` - All mods
     - `["modRequests"]` - All mod requests
     - `["licenses"]` - All licenses

2. **Auth State** (React Context):
   - Authentication token
   - Login status
   - User session

3. **Local Component State** (React useState):
   - Form inputs
   - Modal visibility
   - UI toggles

**Query Invalidation Flow**:
```typescript
// User uploads mod
uploadMutation.mutate()
  → onSuccess
  → queryClient.invalidateQueries({ queryKey: ["mods"] })
  → Dashboard and Mods page re-fetch mods
  → UI updates with new mod
```

### 6.3 Request/Response Cycle

```
User Action → Component → React Query → Axios → API Interceptor
    ↓                                              ↓
UI Update ← Component ← React Query ← Axios ← Backend Response
```

**Example: Generate Key Flow**:
```
1. User clicks "Generate Key" button
2. Component calls generateKeyMutation.mutate()
3. React Query executes mutationFn
4. Axios sends POST /admin/generate-key
5. Request interceptor adds Authorization header
6. Backend validates token and generates key
7. Response interceptor checks for 401
8. React Query triggers onSuccess callback
9. Component updates state with generated key
10. Query invalidation triggers request list refresh
11. UI displays key in modal
```

### 6.4 Error Handling

**Multiple Error Layers**:

1. **Network Level** (Axios):
   - Connection failures
   - Timeout errors
   - 5xx server errors

2. **Authentication Level** (Interceptor):
   - 401 → Auto-logout and redirect

3. **Application Level** (React Query):
   - `isError` state per query/mutation
   - Error callbacks: `onError`

4. **User Feedback** (Toast Notifications):
   - Success messages
   - Error messages with descriptions
   - Loading states

---

## 7. API Endpoints Reference

### 7.1 Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/admin/login` | ❌ | Admin login with credentials |

**Login Request**:
```typescript
POST /admin/login
Body: {
  username: string;
  password: string;
}
Response: {
  access_token: string;
}
```

### 7.2 Dashboard Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/mods` | ✅ | Fetch all mods (for count) |
| GET | `/admin/mod-requests` | ✅ | Fetch all requests (for pending count) |
| GET | `/admin/licenses` | ✅ | Fetch all licenses (for active count) |

### 7.3 Mod Management Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/mods` | ✅ | List all mods with details |
| POST | `/admin/upload-mod` | ✅ | Upload new mod file with metadata |

**Upload Mod Request**:
```typescript
POST /admin/upload-mod
Content-Type: multipart/form-data
Headers: {
  Authorization: Bearer <token>
}
Body (FormData): {
  name: string;
  version: string;
  description: string;
  file: File;  // .zip or .scs
}
Response: {
  id: string;
  name: string;
  version: string;
  status: "Active" | "Inactive";
  createdAt: string;
}
```

### 7.4 Request Management Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/admin/mod-requests` | ✅ | List all user mod requests |
| POST | `/admin/generate-key` | ✅ | Generate license key for mod |

**Generate Key Request**:
```typescript
POST /admin/generate-key
Headers: {
  Authorization: Bearer <token>
}
Body: {
  mod_id: string;
}
Response: {
  key: string;  // or generated_key or license_key
}
```

### 7.5 License Management Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/admin/licenses` | ✅ | List all licenses with status |

**License Response**:
```typescript
Response: Array<{
  id: string;
  modId: string;
  pcId: string;
  status: "Active" | "Revoked";
  activatedAt: string;
}>
```

### 7.6 Expected Future Endpoints (Not Yet Implemented)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/admin/mods/:id` | Update mod details |
| DELETE | `/admin/mods/:id` | Delete mod |
| POST | `/admin/licenses/:id/revoke` | Revoke license |
| PUT | `/admin/licenses/:id/renew` | Extend license expiration |
| GET | `/admin/stats` | Get dashboard statistics (optimized) |
| GET | `/admin/audit-logs` | View admin action logs |

---

## Summary

**Key Architectural Decisions**:

1. ✅ **Single-Page Application (SPA)** with React Router for fast navigation
2. ✅ **JWT-based authentication** with Bearer token in headers
3. ✅ **TanStack React Query** for efficient server state management
4. ✅ **Component-based architecture** with shadcn/ui for consistency
5. ✅ **Token-based auto-logout** via Axios interceptors
6. ✅ **File upload via FormData** with multipart/form-data encoding
7. ✅ **Server-side key generation** for security
8. ✅ **PC ID binding** for license enforcement

**Security Highlights**:

- ✅ Authentication required for all admin endpoints
- ✅ Automatic session invalidation on token expiration
- ✅ Auth token sent in Authorization header (not URL)
- ✅ Server-side key generation (frontend cannot forge keys)
- ⚠️ Token stored in localStorage (consider httpOnly cookies for production)
- ⚠️ No RBAC implemented yet (all admins have full access)

**Performance Optimizations**:

- ✅ React Query caching reduces redundant API calls
- ✅ Vite's fast HMR for development
- ✅ Code splitting with React Router
- ✅ Optimistic updates with query invalidation

**Future Enhancements**:

- 🔜 Role-based access control (RBAC)
- 🔜 Mod editing and deletion
- 🔜 License revocation UI
- 🔜 File upload progress indicators
- 🔜 Expiration date management
- 🔜 Admin audit logs
- 🔜 Bulk operations (batch key generation)
- 🔜 Advanced filtering and search
- 🔜 Analytics and reporting dashboard

---

**Document Version**: 1.0  
**Last Updated**: March 3, 2026  
**Maintained By**: ETS2 Development Team
