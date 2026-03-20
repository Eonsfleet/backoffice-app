import { useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export function GlobalErrorBoundary() {
    const error = useRouteError()

    let title = 'Unexpected Application Error'
    let message = 'An unexpected error occurred.'

    if (isRouteErrorResponse(error)) {
        title = `${error.status} ${error.statusText}`
        message = error.data?.message || message
    } else if (error instanceof Error) {
        message = error.message
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-600 max-w-md mx-auto">{message}</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>Go to Home</Button>
            </div>
        </div>
    )
}
