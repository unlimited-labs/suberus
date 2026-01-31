import type { FeeType, UserRole } from "@/generated/prisma/enums";

export interface MockUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	title: string | null;
	affiliation: string | null;
	role: UserRole;
	isActive: boolean;
	createdAt: Date;
	lastLoginAt: Date | null;
	fee: MockFee | null;
}

export interface MockFee {
	id: string;
	userId: string;
	paid: boolean;
	type: FeeType;
	paidAt: Date | null;
}

export const mockUsers: MockUser[] = [
	{
		id: "user-001",
		email: "jan.kowalski@put.poznan.pl",
		firstName: "Jan",
		lastName: "Kowalski",
		title: "Dr inż.",
		affiliation: "Politechnika Poznańska",
		role: "ADMIN",
		isActive: true,
		createdAt: new Date("2025-12-01T10:00:00"),
		lastLoginAt: new Date("2026-01-19T08:30:00"),
		fee: {
			id: "fee-001",
			userId: "user-001",
			paid: true,
			type: "STAFF",
			paidAt: new Date("2025-12-15T12:00:00"),
		},
	},
	{
		id: "user-002",
		email: "anna.nowak@amu.edu.pl",
		firstName: "Anna",
		lastName: "Nowak",
		title: "Prof. dr hab.",
		affiliation: "Uniwersytet im. Adama Mickiewicza",
		role: "EDITOR",
		isActive: true,
		createdAt: new Date("2025-12-02T14:00:00"),
		lastLoginAt: new Date("2026-01-18T15:45:00"),
		fee: {
			id: "fee-002",
			userId: "user-002",
			paid: true,
			type: "INVITED",
			paidAt: new Date("2025-12-20T09:00:00"),
		},
	},
	{
		id: "user-003",
		email: "m.wisniewska@pw.edu.pl",
		firstName: "Maria",
		lastName: "Wiśniewska",
		title: "Dr",
		affiliation: "Politechnika Warszawska",
		role: "AUTHOR",
		isActive: true,
		createdAt: new Date("2026-01-05T11:00:00"),
		lastLoginAt: new Date("2026-01-17T10:00:00"),
		fee: {
			id: "fee-003",
			userId: "user-003",
			paid: true,
			type: "FULL",
			paidAt: new Date("2026-01-10T14:30:00"),
		},
	},
	{
		id: "user-004",
		email: "t.lewandowski@pw.edu.pl",
		firstName: "Tomasz",
		lastName: "Lewandowski",
		title: "Mgr inż.",
		affiliation: "Politechnika Warszawska",
		role: "AUTHOR",
		isActive: true,
		createdAt: new Date("2026-01-05T11:30:00"),
		lastLoginAt: new Date("2026-01-16T09:15:00"),
		fee: null,
	},
	{
		id: "user-005",
		email: "p.zielinski@student.uw.edu.pl",
		firstName: "Piotr",
		lastName: "Zieliński",
		title: null,
		affiliation: "Uniwersytet Warszawski",
		role: "AUTHOR",
		isActive: true,
		createdAt: new Date("2026-01-04T08:00:00"),
		lastLoginAt: new Date("2026-01-12T16:30:00"),
		fee: {
			id: "fee-005",
			userId: "user-005",
			paid: true,
			type: "STUDENT",
			paidAt: new Date("2026-01-08T11:00:00"),
		},
	},
	{
		id: "user-006",
		email: "k.lewandowska@agh.edu.pl",
		firstName: "Katarzyna",
		lastName: "Lewandowska",
		title: "Dr inż.",
		affiliation: "AGH Uniwersytet Nauki i Techniki",
		role: "AUTHOR",
		isActive: true,
		createdAt: new Date("2026-01-10T09:00:00"),
		lastLoginAt: new Date("2026-01-18T14:00:00"),
		fee: null,
	},
	{
		id: "user-007",
		email: "marek.kowal@uj.edu.pl",
		firstName: "Marek",
		lastName: "Kowal",
		title: "Dr hab.",
		affiliation: "Uniwersytet Jagielloński",
		role: "REVIEWER",
		isActive: true,
		createdAt: new Date("2025-12-10T10:00:00"),
		lastLoginAt: new Date("2026-01-15T11:30:00"),
		fee: {
			id: "fee-007",
			userId: "user-007",
			paid: true,
			type: "INVITED",
			paidAt: new Date("2025-12-22T10:00:00"),
		},
	},
	{
		id: "user-008",
		email: "ewa.kaczmarek@pwr.edu.pl",
		firstName: "Ewa",
		lastName: "Kaczmarek",
		title: "Dr",
		affiliation: "Politechnika Wrocławska",
		role: "REVIEWER",
		isActive: true,
		createdAt: new Date("2025-12-12T14:00:00"),
		lastLoginAt: new Date("2026-01-17T16:45:00"),
		fee: null,
	},
	{
		id: "user-009",
		email: "adam.wojcik@pg.edu.pl",
		firstName: "Adam",
		lastName: "Wójcik",
		title: "Dr inż.",
		affiliation: "Politechnika Gdańska",
		role: "REVIEWER",
		isActive: true,
		createdAt: new Date("2025-12-15T09:30:00"),
		lastLoginAt: new Date("2026-01-14T10:00:00"),
		fee: {
			id: "fee-009",
			userId: "user-009",
			paid: true,
			type: "FULL",
			paidAt: new Date("2026-01-02T15:00:00"),
		},
	},
	{
		id: "user-010",
		email: "a.kowalczyk@pwr.edu.pl",
		firstName: "Aleksandra",
		lastName: "Kowalczyk",
		title: "Mgr",
		affiliation: "Politechnika Wrocławska",
		role: "AUTHOR",
		isActive: true,
		createdAt: new Date("2026-01-14T16:00:00"),
		lastLoginAt: new Date("2026-01-15T17:30:00"),
		fee: null,
	},
	{
		id: "user-011",
		email: "inactive@test.pl",
		firstName: "Test",
		lastName: "Inactive",
		title: null,
		affiliation: null,
		role: "AUTHOR",
		isActive: false,
		createdAt: new Date("2025-11-01T10:00:00"),
		lastLoginAt: null,
		fee: null,
	},
];

export function getUserById(id: string): MockUser | undefined {
	return mockUsers.find((u) => u.id === id);
}

export function getUsersByRole(role: UserRole): MockUser[] {
	return mockUsers.filter((u) => u.role === role);
}

export function getReviewers(): MockUser[] {
	return mockUsers.filter((u) => u.role === "REVIEWER" && u.isActive);
}
