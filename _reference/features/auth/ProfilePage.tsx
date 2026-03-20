import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function ProfilePage() {
    const admin = useAuthStore((s) => s.admin)
    const initials = admin?.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'

    return (
        <div className="max-w-xl mx-auto space-y-6 mt-10">
            <h1 className="text-2xl font-bold">My Profile</h1>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle>{admin?.name}</CardTitle>
                        <p className="text-sm text-gray-500">{admin?.email}</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm"><strong>Role:</strong> {admin?.role}</p>
                </CardContent>
            </Card>
        </div>
    )
}
