import {google} from 'googleapis';
import {db} from "@/lib/db";
import { calendar } from 'googleapis/build/src/apis/calendar';

type BookingForGoogleSync = {
    id: string,
    userId: string,
    clientName: string | null,
    googleEventId: string | null,
    startAt: Date,
    endAt: Date,
    room: {
        name: string
    }
    user: {
        fullName: string
    }
}

async function getGoogleCalendarClient(userId: string) {
    const integration = await db.googleCalendarIntegration.findUnique({
        where: {
            userId,
        },
    })

    if(!integration?.enabled || !integration.refreshToken){
        return null
    }

    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
    )

    auth.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
    })

    auth.on('tokens', async (tokens) => {
        await db.googleCalendarIntegration.update({
            where: {
                userId,
            },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
            },
        })
    })

    return {
        calendar: google.calendar({version: 'v3', auth}),
        integration,
    }
}
 
export async function createGoogleCalendarEventForBooking(booking: BookingForGoogleSync) {
    const client = await getGoogleCalendarClient(booking.userId)

    if(!client){
        return
    }

    const event = await client.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
            summary: booking.clientName ? `Booking for ${booking.clientName}` : `Booking : ${booking.room.name}`,
            description: `Room:${booking.room.name}`,
            start: {
                dateTime: booking.startAt.toISOString(),
            },
            end: {
                dateTime: booking.endAt.toISOString(),
            },
        },
    })

    if(!event.data.id){
        return
    }

    await db.booking.update({
        where: {
            id: booking.id,
        },
        data: {
            googleEventId: event.data.id,
        },
    })
}

export async function deleteGoogleCalendarEventForBooking({userId, googleEventId}: {userId: string, googleEventId: string | null}) {
    if(!googleEventId){
        return
    }
    const client = await getGoogleCalendarClient(userId)
    if(!client){
        return
    }
    try {
        await client.calendar.events.delete({
        calendarId: client.integration.calendarId,
        eventId: googleEventId,
    })
    } catch (error:unknown) {
        const status = (error as {status?: number, code?: number}).status ?? 
        (error as {status?: number, code?: number}).code
        if(status === 404 || status === 410){
            // Event already deleted, ignore
            return
        }
        throw error
    }
}

export async function updateGoogleCalendarEventForBooking(booking: BookingForGoogleSync) {
    if(!booking.googleEventId){
        await createGoogleCalendarEventForBooking(booking)
        return
    }
    const client = await getGoogleCalendarClient(booking.userId)
    if(!client){
        return
    }
    await client.calendar.events.update({
        calendarId: client.integration.calendarId,
        eventId: booking.googleEventId,
        requestBody: {
            summary: booking.clientName 
            ? `Booking for ${booking.clientName}` 
            : `Booking : ${booking.room.name}`,
            description: `Room:${booking.room.name}`,
            start: {
                dateTime: booking.startAt.toISOString(),
            },
            end: {
                dateTime: booking.endAt.toISOString(),
            },
        },
    })
}