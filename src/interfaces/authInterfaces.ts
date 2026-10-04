import type { UserRole } from "~/interfaces/userInterfaces"

export interface AuthResponse {
  token: string
  refreshToken: string
  userId: number
  email: string
  companyId: number | null
  role: UserRole
}
