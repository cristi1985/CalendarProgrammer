export type ActionState = {
    ok:boolean,
    message?: string | null
}

export const initialActionState: ActionState = {
    ok: false,
    message: null,
}

export function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message
    }
    return 'Something went wrong. Please try again.'
}

export function isRedirectError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}
