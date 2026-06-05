import { MailpitClient } from "mailpit-api"
import { fromAddrFor } from "../../playwright.config"

const mailpit = new MailpitClient(process.env.MAILPIT_URL ?? "http://localhost:8025")

export { mailpit }

export function workerFrom(): string {
	return fromAddrFor(Number(process.env.TEST_PARALLEL_INDEX ?? 0))
}

// Delete messages tagged with a test's unique run id (testRunId is globally
// unique, so this never touches other workers' or dev's mail).
export async function clearMailpit(testRunId: string) {
	try {
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
		await mailpit.deleteMessagesBySearch({ query: `from:${workerFrom()} to:${address}` })
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
			const { messages } = await mailpit.searchMessages({
				query: `from:${workerFrom()} to:${toEmail} subject:${subjectContains}`,
			})
			if (messages.length > 0) return messages[0]
		} catch {
			// Mailpit might not be running, fall through to retry
		}
		await new Promise((r) => setTimeout(r, 500))
	}
	return null
}
