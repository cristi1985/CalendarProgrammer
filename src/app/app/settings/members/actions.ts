'use server'

import {db} from '@/lib/db'
import {syncAuthenticatedUser} from '@/lib/auth'
import {redirect} from 'next/navigation'
import {revalidatePath} from 'next/cache'
import type {ActionState} from '@/lib/action-state'
import {getErrorMessage, isRedirectError} from '@/lib/action-state'

export async function deleteTenantMember(formData: FormData){
    const result = await syncAuthenticatedUser()

    if(!result){
        redirect('/signin')
    }

    if(!result.tenantUser){
        redirect('/onboarding')
    }

    const tenantUserId = formData.get('tenantUserId')

    if(typeof tenantUserId !== 'string' || !tenantUserId.trim()){
        throw new Error('Please select a valid workspace member to delete.')
    }

    const targetTenantUser = await db.tenantUser.findFirst({
        where: {
            id: tenantUserId,
            tenantId: result.tenantUser.tenantId
        },
        select:{
            id: true,
            userId: true,
            role: true
        },
    })

    if(!targetTenantUser){
        throw new Error('The selected workspace member does not exist.')
    }

    if(targetTenantUser.userId === result.tenantUser.userId){
        throw new Error('You cannot delete yourself from the workspace.')
    }

    const curentUserRole = result.tenantUser.role
    const targetUserRole = targetTenantUser.role

    const isAllowed = 
    (curentUserRole === 'owner' && targetUserRole == 'member') ||
    (curentUserRole === 'admin' && (targetUserRole == 'member' || targetUserRole == 'owner'))

    if(!isAllowed){
        throw new Error('You do not have permission to delete this workspace member.')
    }

    const deletetion = await db.tenantUser.deleteMany({
        where:{
            id: targetTenantUser.id,
            tenantId: result.tenantUser.tenantId,
            role: targetUserRole
        }
    })

    if(deletetion.count === 0){
        throw new Error('Failed to delete the workspace member. Please try again.')
    }
    revalidatePath('/settings/members')
}

export async function deleteTenantMemberAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
    try{
        await deleteTenantMember(formData)
        return {
            ok:true,
            message: 'Workspace member deleted successfully.'
        }
    } catch (error) {
        if(isRedirectError(error)){
            throw error
        }
        return {
            ok:false,
            message: getErrorMessage(error)
        }
    }
}