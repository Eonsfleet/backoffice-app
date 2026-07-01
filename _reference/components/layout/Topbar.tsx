import { useAuthStore } from '@/store/authStore'
import { useMutation } from '@tanstack/react-query'
import { logoutAdmin } from '@/api/auth'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

export default function Topbar() {
    const { admin, clearAuth } = useAuthStore()
    const navigate = useNavigate()

    const { mutate: logout } = useMutation({
        mutationFn: logoutAdmin,
        onSettled: () => { clearAuth(); navigate('/login') },
    })

    const initials = admin?.name.split(' ').map(n => n[0]).join('').toUpperCase() ?? 'A'

    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-6">
            <div />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 outline-none">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{admin?.name ?? 'Admin'}</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => logout()}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
