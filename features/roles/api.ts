import { api } from '@/lib/api/client'

export interface Role {
  id: string | number
  name: string
  type: string
}

type RawRole = {
  id: number | string
  attributes: {
    name: string
    type: string
  }
}

export const listRoles = async (guard_name?: string): Promise<Role[]> => {
  const { data: res } = await api.get('/roles', { params: guard_name ? { guard_name } : undefined })
  const raw: RawRole[] = res.data?.adminroles ?? res.data?.roles ?? res.data?.data ?? []
  return raw.map((r) => ({
    id:   r.id,
    name: r.attributes.name,
    type: r.attributes.type,
  }))
}
