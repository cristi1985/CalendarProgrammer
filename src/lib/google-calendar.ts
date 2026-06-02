import {google} from 'googleapis';
import {db} from "@/lib/db";

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
    tenant:{
        timezone: string
    }
}

function toGoogleLocalDateTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
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

    const timezone = booking.tenant.timezone || 'Europe/Bucharest'

    const event = await client.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
            summary: booking.clientName ? `B- ${booking.clientName}` : `B- : ${booking.room.name}`,
            description: `Room:${booking.room.name}`,
            start: {
                dateTime: toGoogleLocalDateTime(booking.startAt, timezone),
                timeZone: timezone,
            },
            end: {
                dateTime: toGoogleLocalDateTime(booking.endAt, timezone),
                timeZone: timezone,
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

    const timezone = booking.tenant.timezone || 'Europe/Bucharest'

    await client.calendar.events.update({
        calendarId: client.integration.calendarId,
        eventId: booking.googleEventId,
        requestBody: {
            summary: booking.clientName 
            ? `B- ${booking.clientName}` 
            : `B- : ${booking.room.name}`,
            description: `Room:${booking.room.name}`,
            start: {
                dateTime: toGoogleLocalDateTime(booking.startAt, timezone),
                timeZone: timezone,
            },
            end: {
                dateTime: toGoogleLocalDateTime(booking.endAt, timezone),
                timeZone: timezone,
            },
        },
    })
}