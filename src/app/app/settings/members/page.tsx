import {db} from "@/lib/db";
import {syncAuthenticatedUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import {MemberList} from "./MembersList";

export default async function MembersPage() {
    const result = await syncAuthenticatedUser();

    if (!result) {
        redirect("/signin");
    }

    if(!result.tenantUser){
        redirect('/onboarding')
    }

    if (
        result.tenantUser.role !== 'owner' &&
        result.tenantUser.role !== 'admin'
    ) {
        redirect('/app/calendar')
    }

    const members = await db.tenantUser.findMany({
        where: {
            tenantId: result.tenantUser.tenantId,
        },
        select: {
            id: true,
            userId: true,
            role: true,
            user:{
                select:{
                    fullName: true,
                    email: true,
                }
            }
        },
        orderBy: {
            user: {
                fullName: 'asc'
            }
        },
    });

    return (
        <div className="stack">
            <div>
                <h1 className="page-title">Members</h1>
            </div>

            <MemberList 
            members={members} 
            currentUserId={result.user.id} 
            currentRole={result.tenantUser.role} />
        </div>
    )

}