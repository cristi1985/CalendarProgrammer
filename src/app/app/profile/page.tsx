import { db } from "@/lib/db";
import { syncAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function getMonthBounds(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

function getBookedHours(bookings: Array<{ startAt: Date; endAt: Date }>) {
    const totalMs = bookings.reduce((sum, booking) => {
        return sum + (booking.endAt.getTime() - booking.startAt.getTime()) / (1000 * 60 * 60);
    }, 0)
    return totalMs;
}

export default async function ProfilePage() {
    const result = await syncAuthenticatedUser();

    if(!result) {
        redirect('/signin');
    }
    if(!result.tenantUser) {
        redirect('/onboarding');
    }

    const now = new Date();
    const { start, end } = getMonthBounds(now);

    const bookings = await db.booking.findMany({
        where: {
            tenantId: result.tenantUser.tenantId,
            userId: result.user.id,
            startAt: {
                gte: start,
            },
            endAt: {
                lte: end,
            },
        },
        orderBy: {
            startAt: 'asc',
        },
    })

    const bookedHours = getBookedHours(bookings);

    return (
        <div className="stack">
            <div>
                <h1 className="page-title">Profile</h1>
                <p className="muted">View your account details and monthly booked hours</p>
            </div>

            <section className="card-item">
                <h2 className="section-title">User details</h2>
                <div className="stack">
                    <div>
                        <strong>Name:</strong> {result.user.fullName}
                    </div>
                    <div>
                        <strong>Email:</strong> {result.user.email}
                    </div>
                    <div>
                        <strong>Role:</strong> {result.tenantUser.role}
                    </div>
                    <div>
                        <strong>Permanent user:</strong> {result.tenantUser.isPermanent ? 'Yes' : 'No'}
                    </div>
                </div>
            </section>

            <section className="card-item">
                <h2 className="section-title">This month's bookings</h2>
                <div className="stack">
                    <div>
                        <strong>Bookings this month:</strong> {bookings.length}
                     </div>
                </div>
                <div>
                    <strong>Hours booked this month:</strong> {' '}
                    {bookedHours % 1 === 0 ? bookedHours: bookedHours.toFixed(1)} hours
                </div>
            </section>         
        </div>
    );
}