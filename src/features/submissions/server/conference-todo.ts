import {
	type SubmissionTodo,
	type TodoKind,
	todoLabel,
	todoTone,
} from "@/features/submissions/labels";
import { getAdminSubmissions } from "@/features/submissions/server/admin-submissions";

export interface TodoItem {
	id: string;
	sequentialNumber: number;
	title: string;
	status: string;
	action: string;
	owner: string;
	ownerEmail: string;
	updatedAt: Date;
}

export interface TodoGroup {
	kind: TodoKind;
	count: number;
	items: TodoItem[];
}

export interface ConferenceTodo {
	/** Waiting on the organizer. */
	blocking: TodoGroup[];
	/** Waiting on an author or a reviewer — chase, don't act. */
	waiting: TodoGroup[];
	totals: { submissions: number; blocking: number; waiting: number };
}

// Same order the admin screen implies: unblock review first, then decide, then
// chase money.
const PRIORITY: TodoKind[] = [
	"REVIEWER_OVERDUE",
	"ASSIGN_REVIEWER",
	"MAKE_DECISION",
	"VERIFY_CONDITIONS",
	"PAYMENT_REMINDER",
	"AWAITING_REVIEWS",
	"AWAITING_REVISION",
	"AWAITING_SUBMISSION",
];

function toGroups(
	entries: Array<{ todo: SubmissionTodo; item: TodoItem }>,
	perGroup: number,
): TodoGroup[] {
	const byKind = new Map<TodoKind, TodoItem[]>();
	for (const { todo, item } of entries) {
		const bucket = byKind.get(todo.kind);
		if (bucket) bucket.push(item);
		else byKind.set(todo.kind, [item]);
	}

	return PRIORITY.filter((kind) => byKind.has(kind)).map((kind) => {
		const items = byKind.get(kind) ?? [];
		return { kind, count: items.length, items: items.slice(0, perGroup) };
	});
}

/**
 * Every submission that needs someone to do something, grouped by what that is.
 * Derived from the same computeSubmissionTodo the admin table renders, so the
 * two can never disagree.
 *
 * ponytail: loads every submission, exactly as /admin/submissions already does.
 * The counts are over the whole conference, so paginating here would report
 * wrong totals — the upgrade is a SQL aggregate that derives the todo kind in
 * the query, and it is worth writing only once a conference is big enough for
 * the admin table to hurt too.
 */
export async function getConferenceTodo(
	perGroup = 20,
): Promise<ConferenceTodo> {
	const { submissions } = await getAdminSubmissions({});

	const blocking: Array<{ todo: SubmissionTodo; item: TodoItem }> = [];
	const waiting: Array<{ todo: SubmissionTodo; item: TodoItem }> = [];

	for (const submission of submissions) {
		if (submission.todo.kind === "NONE") continue;
		const entry = {
			todo: submission.todo,
			item: {
				id: submission.id,
				sequentialNumber: submission.sequentialNumber,
				title: submission.title,
				status: submission.status,
				action: todoLabel(submission.todo),
				owner: submission.ownerName,
				ownerEmail: submission.ownerEmail,
				updatedAt: submission.updatedAt,
			},
		};
		if (todoTone(submission.todo.kind) === "action") blocking.push(entry);
		else waiting.push(entry);
	}

	return {
		blocking: toGroups(blocking, perGroup),
		waiting: toGroups(waiting, perGroup),
		totals: {
			submissions: submissions.length,
			blocking: blocking.length,
			waiting: waiting.length,
		},
	};
}
