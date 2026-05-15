'use server'

import { db } from "@/lib/db"
import { syncAuthenticatedUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function toggleGoogleCalendarSync(formData: FormData) {
    const result = await syncAuthenticatedUser()

    if (!result) {
        redirect('/signin')
    }
    
    if(!result?.tenantUser){
        redirect('/onboarding')
    }

    const enabled = formData.get('enabled') === 'true'

    const integration = await db.googleCalendarIntegration.findUnique({
        where: {
            userId: result.user.id,
        },
    })

    if(!integration?.refreshToken){
        throw new Error('Google Calendar is not connected') 
    }

    await db.googleCalendarIntegration.update({
        where: {
            userId: result.user.id,
        },
        data: {
            enabled,
        },
    })

    revalidatePath('/profile')  
}