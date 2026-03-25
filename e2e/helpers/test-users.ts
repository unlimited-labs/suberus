export interface TestUserData {
	email: string
	password: string
	firstName: string
	lastName: string
	affiliationName: string
}

export const TEST_USER: TestUserData = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
	affiliationName: "Test University",
}

export const ADMIN_USER: TestUserData = {
	email: "admin@e2e.local",
	password: "testpass123",
	firstName: "Admin",
	lastName: "User",
	affiliationName: "Admin University",
}

export const REVIEWER_USER: TestUserData = {
	email: "reviewer@e2e.local",
	password: "testpass123",
	firstName: "Reviewer",
	lastName: "User",
	affiliationName: "Reviewer University",
}

export const EDITOR_USER: TestUserData = {
	email: "editor@e2e.local",
	password: "testpass123",
	firstName: "Editor",
	lastName: "User",
	affiliationName: "Editor University",
}

export const UNVERIFIED_USER: TestUserData = {
	email: "unverified@e2e.local",
	password: "testpass123",
	firstName: "Unverified",
	lastName: "User",
	affiliationName: "Unverified University",
}

export const ADMIN_VERIFY_TEST_USER: TestUserData = {
	email: "admin-verify-test@e2e.local",
	password: "testpass123",
	firstName: "AdminVerify",
	lastName: "Test",
	affiliationName: "AdminVerify University",
}

export const RESET_PASSWORD_USER: TestUserData = {
	email: "reset-test@e2e.local",
	password: "testpass123",
	firstName: "Reset",
	lastName: "Test",
	affiliationName: "Password Reset Institute",
}

export const DEFAULT_PASSWORD = "testpass123"

/** Contact email configured in Basic Information — receives admin notifications */
export const CONTACT_EMAIL = "contact@e2e.local"
