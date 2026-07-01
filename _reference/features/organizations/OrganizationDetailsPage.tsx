import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getOrganization } from '@/api/organizations' // We'll add this
import { PageError } from '@/components/shared/PageError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, Globe, Mail, Phone, Users, Calendar, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import type { Organization } from '@/types'
import { AssignSubscriptionDialog } from './AssignSubscriptionDialog'

export default function OrganizationDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)

    const { data: org, isLoading, isError, refetch } = useQuery<Organization>({
        queryKey: ['organization', id],
        queryFn: () => getOrganization(Number(id)),
        enabled: !!id,
    })

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading organization details...</div>
    }

    if (isError || !org) {
        return <PageError message="Failed to load organization details or organization not found." />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{org.name}</h1>
                    <p className="text-sm text-gray-500">ID: {org.identifier || org.id}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="md:col-span-2 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Organization Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2">
                        {org.logo && (
                            <div className="col-span-full mb-4">
                                <img src={org.logo} alt={org.name} className="h-24 w-24 object-cover rounded-md border bg-gray-50" />
                            </div>
                        )}
                        <div className="flex items-center gap-3 border-b pb-4">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Industry</p>
                                <p className="font-medium">{org.industry || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-b pb-4">
                            <Users className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Fleet Size</p>
                                <p className="font-medium">{org.fleet_size?.toLocaleString() || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-b pb-4">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Email Address</p>
                                <p className="font-medium">{org.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-b pb-4">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Phone Number</p>
                                <p className="font-medium">{org.phone || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-b pb-4">
                            <Globe className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Domains</p>
                                <p className="font-medium">
                                    {org.domain ? org.domain : (org.subdomain ? `${org.subdomain}.eonsfleet.com` : 'N/A')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-b pb-4">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500">Joined Date</p>
                                <p className="font-medium">
                                    {org.joined_date ? format(new Date(org.joined_date), 'MMMM dd, yyyy') : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Internal ID</p>
                                <p className="font-mono text-sm">{org.id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Slug</p>
                                <p className="font-mono text-sm">{org.slug || 'N/A'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Manage this organization</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Button variant="outline" className="w-full justify-start" onClick={() => setIsAssignDialogOpen(true)}>
                                Manage Subscription
                            </Button>
                            <Button variant="outline" className="w-full justify-start">View Devices</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AssignSubscriptionDialog
                organizationId={org.id}
                isOpen={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                onSuccess={() => refetch()}
            />
        </div>
    )
}
