export function PageError({ message }: { message?: string }) {
    return (
        <div className="flex h-48 items-center justify-center text-gray-400">
            {message ?? 'Something went wrong. Please try again.'}
        </div>
    )
}
