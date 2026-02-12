import { MailpitClient } from "mailpit-api"

const mailpit = new MailpitClient(process.env.MAILPIT_URL ?? "http://localhost:8025")

export { mailpit }

export async function clearMailpit(testRunId?: string) {
	try {
		if (!testRunId) {
			await mailpit.deleteMessages()
			return
		}

		const { messages } = await mailpit.listMessages(0, 200)
		for (const message of messages) {
			try {
				const headers = await mailpit.getMessageHeaders(message.ID)
				if (headers["X-Test-Run-Id"]?.[0] === testRunId) {
					await mailpit.deleteMessages({ IDs: [message.ID] })
				}
			} catch {
				// Skip if message already deleted or error fetching
			}
		}
	} catch {
		// Mailpit might not be running
	}
}

export async function clearMailpitForAddress(address: string) {
	try {
		await mailpit.deleteMessagesBySearch({ query: `to:${address}` })
	} catch {
		// Mailpit might not be running
	}
}

export async function getMailpitMessages() {
	try {
		return await mailpit.listMessages(0, 200)
	} catch {
		return { messages: [] }
	}
}

export async function getMailpitMessage(id: string) {
	try {
		return await mailpit.getMessageSummary(id)
	} catch {
		return null
	}
}

export async function waitForEmail(toEmail: string, subjectContains: string, timeout = 10000) {
	const startTime = Date.now()
	while (Date.now() - startTime < timeout) {
		try {
			const { messages } = await getMailpitMessages()
			const email = messages.find(
				(m) =>
					m.To.some((t) => t.Address === toEmail) &&
					m.Subject.toLowerCase().includes(subjectContains.toLowerCase()),
			)
			if (email) return email
		} catch {
			// Mailpit might not be running, fall through to retry
		}
		await new Promise((r) => setTimeout(r, 500))
	}
	return null
}
