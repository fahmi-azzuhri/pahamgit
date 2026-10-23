export interface AuthUser {
  id: number
  username: string
  email: string
}

interface AuthResponse {
	token: string
	user: AuthUser
}


const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8080"

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error("Tidak bisa menghubungi server")
  }
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(data?.error ?? `Request gagal (${res.status})`)
  return data as T
}

export function login(identifier: string, password: string) {
  return post<AuthResponse>("/api/auth/login", { identifier, password })
}

export function register(username: string, email: string, password: string) {
  return post<AuthResponse>("/api/auth/register", { username, email, password })
}

export async function me(token: string): Promise<AuthUser> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error("Tidak bisa menghubungi server")
  }
  if (!res.ok) throw new Error("Sesi tidak valid")
  return (await res.json()) as AuthUser
}

export async function logout(token: string) {
  // stateless JWT: server holds nothing to delete, failure is fine
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    /* offline logout still works locally */
  }
}
