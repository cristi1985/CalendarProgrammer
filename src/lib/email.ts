type SendInvitationEmailParams = {
    to: string
    workspaceName: string
    invitedByName: string
    role: string
    isPermanent: boolean
    inviteUrl: string
}

type SendEmailParams = {
    to: string
    subject: string
    html: string
}

type SendBookingCreatedEmailParams = {
    to: string
    bookedByName: string
    roomName: string
    startAt: string
    endAt: string
    timeZone: string
}

export async function sendInvitationEmail({
    to,
    workspaceName,
    invitedByName,
    role,
    isPermanent,
    inviteUrl,
}: SendInvitationEmailParams) {
    const apiKey = process.env.RESEND_API_KEY
    console.log('Sending invitation email to', to, 'with invite URL:', inviteUrl, 'using API key:', apiKey ? 'configured' : 'not configured')

    if (!apiKey) {
        console.warn('Resend API key is not configured. Skipping sending email.')
        return
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Calendar Programmer <onboarding@yourdomain.com>',
            to,
            subject: `You're invited to join ${workspaceName} on Calendar Programmer!`,
            html: `
            <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">
                <h2>You have been invited to join ${workspaceName}</h2>
                <p>${invitedByName} invited you to join the workspace.</p>
                <p><strong>Role:</strong> ${role}</p>
                <p><strong>Permanent user:</strong> ${isPermanent ? 'Yes' : 'No'}</p>
                <p>
                    Use the link below to sign in or create your account and access the workspace:
                </p>
                <p>
                    <a href="${inviteUrl}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
                    Open invitation
                    </a>
                </p>
                <p>If the button does not work, use this link:</p>
                <p><a href="${inviteUrl}">${inviteUrl}</a></p>
            </div>`,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to send invitation email:', errorText)
        throw new Error('Failed to send invitation email')
    }   
}

async function sendEmail({ to, subject, html }: SendEmailParams) {
    const apiKey = process.env.RESEND_API_KEY
    console.log('Sending email to', to, 'with subject:', subject, 'using API key:', apiKey ? 'configured' : 'not configured')

    if (!apiKey) {
        console.warn('Resend API key is not configured. Skipping sending email.')
        return
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Calendar Programmer <onboarding@yourdomain.com>',
            to,
            subject,
            html,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to send email:', errorText)
        throw new Error('Failed to send email')
    }
}

function escapeHtml(value: string){
    return value
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;')
        .replaceAll(/"/g, '&quot;')
        .replaceAll(/'/g, '&#039;');
}

function formatBookingDate(date:Date, timeZone: string){
    return new Intl.DateTimeFormat('ro-RO', {
        timeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export async function sendBookingCreatedEmail({
    to,
    bookedByName,
    roomName,
    startAt,
    endAt,
    timeZone
}:SendBookingCreatedEmailParams) {
    const safeBookedByName = escapeHtml(bookedByName);
    const safeRoomName = escapeHtml(roomName);
    const safeStartAt = formatBookingDate(new Date(startAt), timeZone);
    const safeEndAt = formatBookingDate(new Date(endAt), timeZone);

    await sendEmail({
        to,
        subject: `A booking was created by ${safeBookedByName} on ${safeStartAt}`,
        html: `
            <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">
                <h2>Booking Created</h2>
                <p>A new booking has been created in your workspace.</p>
                <p><strong>Booked by:</strong> ${safeBookedByName}</p>
                <p><strong>Room:</strong> ${safeRoomName}</p>
                <p><strong>Start:</strong> ${escapeHtml(safeStartAt)}</p>
                <p><strong>End:</strong> ${escapeHtml(safeEndAt)}</p>
            </div>
        `
    });
}
