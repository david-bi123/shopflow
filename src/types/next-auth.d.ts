import 'next-auth'
import type { Role } from './index'

declare module 'next-auth' {
  interface User {
    role: Role
    tenantId?: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role: Role
      tenantId?: string
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    tenantId?: string
  }
}
