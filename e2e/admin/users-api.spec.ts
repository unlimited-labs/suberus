import { test, expect } from "@playwright/test"

test.describe("Admin Users API", () => {
	test("GET /api/admin/users returns users list", async ({ request }) => {
		const response = await request.get("/api/admin/users")

		expect(response.status()).toBe(200)
		const data = await response.json()
		expect(data).toHaveProperty("users")
		expect(data).toHaveProperty("total")
		expect(Array.isArray(data.users)).toBe(true)
	})

	test("GET /api/admin/users supports role filter", async ({ request }) => {
		const response = await request.get("/api/admin/users?role=ADMIN")

		expect(response.status()).toBe(200)
		const data = await response.json()
		// All returned users should have ADMIN role
		for (const user of data.users) {
			expect(user.role).toBe("ADMIN")
		}
	})

	test("GET /api/admin/users supports search filter", async ({ request }) => {
		const response = await request.get("/api/admin/users?search=e2e")

		expect(response.status()).toBe(200)
		const data = await response.json()
		// Should find the e2e test users
		expect(data.users.length).toBeGreaterThan(0)
	})

	test("GET /api/admin/users supports fee filter - paid", async ({ request }) => {
		const response = await request.get("/api/admin/users?feePaid=true")

		expect(response.status()).toBe(200)
		const data = await response.json()
		// All returned users should have fee paid
		for (const user of data.users) {
			expect(user.fee?.paid).toBe(true)
		}
	})

	test("GET /api/admin/users supports fee filter - unpaid", async ({ request }) => {
		const response = await request.get("/api/admin/users?feePaid=false")

		expect(response.status()).toBe(200)
		const data = await response.json()
		// All returned users should have unpaid or no fee
		for (const user of data.users) {
			expect(user.fee?.paid !== true).toBe(true)
		}
	})

	test("GET /api/admin/users/:id returns single user", async ({ request }) => {
		// First get list to find a user ID
		const listResponse = await request.get("/api/admin/users")
		const listData = await listResponse.json()

		if (listData.users.length === 0) {
			test.skip()
			return
		}

		const userId = listData.users[0].id
		const response = await request.get(`/api/admin/users/${userId}`)

		expect(response.status()).toBe(200)
		const user = await response.json()
		expect(user.id).toBe(userId)
		expect(user).toHaveProperty("email")
		expect(user).toHaveProperty("role")
	})

	test("GET /api/admin/users/:id returns 404 for non-existent user", async ({ request }) => {
		const response = await request.get("/api/admin/users/00000000-0000-0000-0000-000000000000")

		expect(response.status()).toBe(404)
	})

	test("GET /api/admin/users/export returns XLSX file", async ({ request }) => {
		const response = await request.get("/api/admin/users/export")

		expect(response.status()).toBe(200)

		const contentType = response.headers()["content-type"]
		expect(contentType).toContain(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		)

		const contentDisposition = response.headers()["content-disposition"]
		expect(contentDisposition).toContain("attachment")
		expect(contentDisposition).toContain(".xlsx")
	})

	test("GET /api/admin/users/export respects filters", async ({ request }) => {
		// Both requests should succeed - we just verify the endpoint handles filters
		const responseWithRole = await request.get("/api/admin/users/export?role=ADMIN")
		expect(responseWithRole.status()).toBe(200)

		const responseWithSearch = await request.get("/api/admin/users/export?search=test")
		expect(responseWithSearch.status()).toBe(200)

		const responseWithFee = await request.get("/api/admin/users/export?feePaid=true")
		expect(responseWithFee.status()).toBe(200)
	})

	test("POST /api/admin/users/bulk requires userIds", async ({ request }) => {
		const response = await request.post("/api/admin/users/bulk", {
			data: { action: "mark_fee" },
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBeTruthy()
	})

	test("POST /api/admin/users/bulk mark_fee requires feeType", async ({ request }) => {
		const response = await request.post("/api/admin/users/bulk", {
			data: {
				action: "mark_fee",
				userIds: ["00000000-0000-0000-0000-000000000000"],
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toContain("Fee type")
	})

	test("POST /api/admin/users/bulk change_role requires role", async ({ request }) => {
		const response = await request.post("/api/admin/users/bulk", {
			data: {
				action: "change_role",
				userIds: ["00000000-0000-0000-0000-000000000000"],
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toContain("Role")
	})

	test("POST /api/admin/users/bulk rejects invalid action", async ({ request }) => {
		const response = await request.post("/api/admin/users/bulk", {
			data: {
				action: "invalid_action",
				userIds: ["test-id"],
			},
		})

		expect(response.status()).toBe(400)
	})
})
