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
   
