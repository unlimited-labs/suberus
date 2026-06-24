/**
 * E2E tests for the autoplan queue feature.
 *
 * Requires:
 *  - LLM API (embeddings + completion) to be available
 *  - Planner API service to be running
 *
 * These tests hit real LLM endpoints — use generous timeouts.
 */

import { test, expect } from "./fixtures";
import { createSubmission, createProgramSession, createRoom, cleanupPlannerForRun, getPrisma, setAppSetting } from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

const TEST_PREFIX = "autoplan_e2e";

// Shared state across serial tests
let sharedRoomId: string;
let sharedSubmissionIds: string[] = [];

test.describe.serial("Autoplan — queue happy path", () => {
	// Proposal generation hits real LLM endpoints (see file header) and the
	// "Proposal ready" expects already allow 180s; lift the per-test budget to
	// match so the default 30s cap doesn't kill the run before the LLM responds.
	test.describe.configure({ timeout: 240_000 });

	test.beforeAll(async () => {
		// Enable autoplanner (default is false)
		await setAppSetting("PLANNER_AUTOPLAN_ENABLED", true);

		// Create room
		sharedRoomId = await createRoom(TEST_PREFIX, "MainRoom");

		// Create accepted abstracts with meaningful content for clustering
		const abstracts = [
			{
				title: "Neural Network Optimization for Image Classification",
				content:
					"Deep learning approaches for visual recognition tasks using convolutional architectures and residual connections. " +
					"We explore batch normalization, dropout regularization, and data augmentation strategies to improve model generalization. " +
					"Experiments on ImageNet demonstrate state-of-the-art accuracy. The proposed method reduces training time significantly " +
					"while maintaining competitive performance across multiple benchmark datasets. Transfer learning is also evaluated.",
			},
			{
				title: "Transformer Models for Natural Language Understanding",
				content:
					"Attention-based architectures for text processing and semantic analysis in large-scale NLP tasks. " +
					"We investigate fine-tuning strategies for BERT and GPT variants on downstream classification and generation tasks. " +
					"Our approach achieves strong results on GLUE benchmarks with efficient parameter usage and reduced memory footprint. " +
					"Prompt engineering and instruction tuning are compared in ablation studies across multiple language domains.",
			},
			{
				title: "Reinforcement Learning in Robotic Control Systems",
				content:
					"Policy gradient methods for autonomous robot manipulation tasks in unstructured environments. " +
					"We combine model-based and model-free approaches to achieve sample-efficient learning for dexterous manipulation. " +
					"Sim-to-real transfer is addressed via domain randomization and adaptive curriculum training schedules. " +
					"Results on physical robot platforms confirm the viability of the proposed framework for real-world deployment.",
			},
			{
				title: "Computer Vision Applications in Medical Imaging",
				content:
					"Image segmentation and detection algorithms for clinical diagnostics using convolutional neural networks. " +
					"We present a novel U-Net variant with attention gates for organ segmentation in CT and MRI scans. " +
					"The method achieves high Dice scores on public medical imaging benchmarks with limited annotated training data. " +
					"Integration with radiologist workflows and uncertainty estimation for safe clinical deployment are discussed.",
			},
		];

		for (const abstract of abstracts) {
			const sub = await createSubmission({
				testRunId: TEST_PREFIX,
				title: abstract.title,
				status: SubmissionStatus.ACCEPTED,
				type: SubmissionType.ABSTRACT,
				content: abstract.content,
			});
			sharedSubmissionIds.push(sub.id);
		}

		// Create 2 program sessions to act as target slots
		const baseDate = new Date("2026-07-01T09:00:00Z");
		for (let i = 0; i < 2; i++) {
			const startAt = new Date(baseDate.getTime() + i * 2 * 60 * 60 * 1000);
			const endAt = new Date(startAt.getTime() + 90 * 60 * 1000);
			await createProgramSession({
				testRunId: TEST_PREFIX,
				title: `Session ${i + 1}`,
				startAt,
				endAt,
				roomId: sharedRoomId,
			});
		}
	});

	test.afterAll(async () => {
		const db = getPrisma();

		// Restore default
		await setAppSetting("PLANNER_AUTOPLAN_ENABLED", false).catch(() => {});

		// applyAutoPlan rewrites session titles, so prefix-based cleanup misses
		// them. Delete by roomId first; cleanupPlannerForRun then drops the room.
		if (sharedRoomId) {
			const sessions = await db.programSession.findMany({
				where: { roomId: sharedRoomId },
				select: { id: true },
			});
			for (const s of sessions) {
				await db.presentationSlot.deleteMany({ where: { sessionId: s.id } }).catch(() => {});
				await db.programSession.delete({ where: { id: s.id } }).catch(() => {});
			}
		}

		// Clean up planner state created with TEST_PREFIX (room, breaks, tracks)
		await cleanupPlannerForRun(TEST_PREFIX).catch(() => {});

		// Clean up submissions
		const { deleteSubmission } = await import("../../helpers/test-db");
		for (const id of sharedSubmissionIds) {
			await deleteSubmission(id).catch(() => {});
		}

		// Also catch orphaned submissions by prefix
		const orphaned = await db.submission.findMany({
			where: { title: { startsWith: `${TEST_PREFIX}_` } },
			select: { id: true },
		});
		for (const sub of orphaned) {
			await deleteSubmission(sub.id).catch(() => {});
		}
	});

	test("autoplan page loads and shows Generate proposal button", async ({ page }) => {
		await page.goto("/admin/program-planner/auto-plan");

		await expect(
			page.getByRole("button", { name: /Generate proposal/i }),
		).toBeVisible({ timeout: 15000 });
	});

	test("autoplan generates proposal with progress stages", async ({ page }) => {
		await page.goto("/admin/program-planner/auto-plan");

		const generateBtn = page.getByRole("button", { name: /Generate proposal/i });
		await expect(generateBtn).toBeVisible({ timeout: 15000 });
		await generateBtn.click();

		// At least one stage label should appear shortly after clicking
		await expect(
			page.getByText("Loading data"),
		).toBeVisible({ timeout: 30000 });

		// Wait for proposal to complete — LLM calls can be slow
		await expect(
			page.getByText("Proposal ready"),
		).toBeVisible({ timeout: 180000 });
	});

	test("proposal can be applied to schedule", async ({ page }) => {
		await page.goto("/admin/program-planner/auto-plan");

		const generateBtn = page.getByRole("button", { name: /Generate proposal/i });
		await expect(generateBtn).toBeVisible({ timeout: 15000 });
		await generateBtn.click();

		// Wait for proposal to be ready
		await expect(
			page.getByText("Proposal ready"),
		).toBeVisible({ timeout: 180000 });

		// Apply to schedule
		const applyBtn = page.getByRole("button", { name: /Apply to schedule/i });
		await expect(applyBtn).toBeVisible({ timeout: 10000 });
		await applyBtn.click();

		// Should navigate back to the planner
		await expect(page).toHaveURL(/\/admin\/program-planner$/, { timeout: 30000 });

		// Toast confirmation (optional — may not always render in time)
		await page.getByText("Auto-plan applied").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
	});
});
