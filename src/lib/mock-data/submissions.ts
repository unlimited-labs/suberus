export type SubmissionStatus =
	| "DRAFT"
	| "SUBMITTED"
	| "UNDER_REVIEW"
	| "REVIEWS_COMPLETE"
	| "AWAITING_DECISION"
	| "REVISE_REQUIRED"
	| "RESUBMITTED"
	| "ACCEPTED"
	| "CONDITIONALLY_ACCEPTED"
	| "REJECTED"
	| "WITHDRAWN";

export type SubmissionType = "ABSTRACT" | "FULL_PAPER" | "POSTER";

export interface MockAuthor {
	firstName: string;
	lastName: string;
	email: string;
	affiliation: string;
	isPresenter: boolean;
}

export interface MockSubmission {
	id: string;
	title: string;
	type: SubmissionType;
	status: SubmissionStatus;
	currentRound: number;
	currentVersion: number;
	createdAt: Date;
	updatedAt: Date;
	content: string;
	authors: MockAuthor[];
	keywords: string[];
}

export interface MockStatusHistory {
	id: string;
	submissionId: string;
	status: SubmissionStatus;
	timestamp: Date;
	triggeredBy: string; // "System", "Dr. Jan Kowalski", etc.
	metadata?: { reason?: string; comment?: string };
}

export interface MockReview {
	id: string;
	submissionId: string;
	round: number;
	reviewerName: string; // "Recenzent 1" (anonymous)
	scores: {
		originality: number;
		clarity: number;
		significance: number;
		overall: number;
	};
	comments: string;
	createdAt: Date;
}

export interface MockEditorDecision {
	id: string;
	submissionId: string;
	decision: SubmissionStatus;
	reasoning: string;
	letterToAuthor: string;
	revisionsRequired?: string[];
	conditions?: string[];
	createdAt: Date;
}

export interface MockVersion {
	id: string;
	submissionId: string;
	version: number;
	title: string;
	content: string;
	authors: MockAuthor[];
	keywords: string[];
	createdAt: Date;
}

// Submission 1: ACCEPTED - Full journey with 2 reviews, editor decision
const submission1: MockSubmission = {
	id: "sub-001",
	title: "Machine Learning Approaches to Software Bug Prediction",
	type: "FULL_PAPER",
	status: "ACCEPTED",
	currentRound: 1,
	currentVersion: 1,
	createdAt: new Date("2026-01-10T10:30:00"),
	updatedAt: new Date("2026-01-17T14:20:00"),
	content:
		"Software bug prediction is a critical aspect of software quality assurance. This paper presents a novel approach to predicting software bugs using ensemble machine learning methods. We combine random forests, gradient boosting, and neural networks to create a robust prediction system that outperforms existing approaches.\n\nOur methodology involves extracting 47 code metrics from version control systems and issue trackers. We evaluate our approach on 15 open-source projects with over 2 million lines of code. The results demonstrate a 23% improvement in F1-score compared to state-of-the-art methods.\n\nThe key contributions include: (1) a novel feature engineering pipeline for code metrics, (2) an ensemble architecture that combines complementary learning algorithms, and (3) a comprehensive evaluation framework for bug prediction systems. Our tool is available as an open-source project and has been integrated into several CI/CD pipelines.",
	authors: [
		{
			firstName: "Jan",
			lastName: "Kowalski",
			email: "j.kowalski@put.poznan.pl",
			affiliation: "Poznan University of Technology",
			isPresenter: true,
		},
		{
			firstName: "Anna",
			lastName: "Nowak",
			email: "a.nowak@amu.edu.pl",
			affiliation: "Adam Mickiewicz University",
			isPresenter: false,
		},
		{
			firstName: "Michael",
			lastName: "Schmidt",
			email: "m.schmidt@tum.de",
			affiliation: "Technical University of Munich",
			isPresenter: false,
		},
	],
	keywords: [
		"machine learning",
		"bug prediction",
		"software quality",
		"ensemble methods",
		"code metrics",
	],
};

const submission1History: MockStatusHistory[] = [
	{
		id: "hist-001-1",
		submissionId: "sub-001",
		status: "DRAFT",
		timestamp: new Date("2026-01-10T10:30:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-001-2",
		submissionId: "sub-001",
		status: "SUBMITTED",
		timestamp: new Date("2026-01-10T11:00:00"),
		triggeredBy: "Jan Kowalski",
	},
	{
		id: "hist-001-3",
		submissionId: "sub-001",
		status: "UNDER_REVIEW",
		timestamp: new Date("2026-01-11T09:15:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
	},
	{
		id: "hist-001-4",
		submissionId: "sub-001",
		status: "REVIEWS_COMPLETE",
		timestamp: new Date("2026-01-16T16:30:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-001-5",
		submissionId: "sub-001",
		status: "AWAITING_DECISION",
		timestamp: new Date("2026-01-16T16:31:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-001-6",
		submissionId: "sub-001",
		status: "ACCEPTED",
		timestamp: new Date("2026-01-17T14:20:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
		metadata: {
			comment: "Strong acceptance based on reviewer consensus",
		},
	},
];

const submission1Reviews: MockReview[] = [
	{
		id: "rev-001-1",
		submissionId: "sub-001",
		round: 1,
		reviewerName: "Reviewer 1",
		scores: {
			originality: 4,
			clarity: 5,
			significance: 4,
			overall: 4.3,
		},
		comments:
			"This paper presents a novel approach to bug prediction using ensemble learning methods. The methodology is sound, and the experimental results are convincing. The paper is well-written and makes a solid contribution to the field. Minor revisions needed for clarity in Section 3.",
		createdAt: new Date("2026-01-14T15:20:00"),
	},
	{
		id: "rev-001-2",
		submissionId: "sub-001",
		round: 1,
		reviewerName: "Reviewer 2",
		scores: {
			originality: 5,
			clarity: 4,
			significance: 5,
			overall: 4.7,
		},
		comments:
			"Excellent work. The authors have addressed an important problem with a creative solution. The evaluation is thorough and the results demonstrate clear improvements over existing approaches. I recommend acceptance.",
		createdAt: new Date("2026-01-16T16:30:00"),
	},
];

const submission1Decision: MockEditorDecision = {
	id: "dec-001",
	submissionId: "sub-001",
	decision: "ACCEPTED",
	reasoning:
		"Both reviewers strongly recommend acceptance. The paper makes a significant contribution to the field with solid methodology and compelling results.",
	letterToAuthor:
		"Dear Dr. Kowalski,\n\nWe are pleased to inform you that your paper 'Machine Learning Approaches to Software Bug Prediction' has been accepted for presentation at ICSE 2026.\n\nBoth reviewers found your work to be of high quality with significant contributions to software engineering research. Please address the minor comments from Reviewer 1 in your camera-ready version.\n\nCongratulations!\n\nBest regards,\nDr. Anna Nowak\nProgram Chair",
	createdAt: new Date("2026-01-17T14:20:00"),
};

// Submission 2: ACCEPTED after 2 rounds - Full revision cycle example
const submission2: MockSubmission = {
	id: "sub-002",
	title:
		"Automated Testing Strategies for Microservices Architectures: A Systematic Review",
	type: "FULL_PAPER",
	status: "ACCEPTED",
	currentRound: 2,
	currentVersion: 2,
	createdAt: new Date("2026-01-08T14:20:00"),
	updatedAt: new Date("2026-01-18T11:00:00"),
	content:
		"Microservices architectures have gained significant popularity in modern software development, but testing these distributed systems presents unique challenges. This systematic review analyzes 87 primary studies published between 2018 and 2025 to identify and categorize automated testing strategies for microservices.\n\nWe examine testing approaches across multiple levels: unit testing of individual services, integration testing between services, contract testing for API compatibility, and end-to-end testing of complete workflows. Our analysis reveals that while unit testing practices are well-established, integration and contract testing remain challenging areas with limited tool support.\n\nKey findings include: (1) service mesh technologies enable new testing patterns, (2) chaos engineering is increasingly adopted for resilience testing, and (3) observability tools play a crucial role in test debugging. We provide recommendations for practitioners and identify gaps for future research.",
	authors: [
		{
			firstName: "Maria",
			lastName: "Wiśniewska",
			email: "m.wisniewska@pw.edu.pl",
			affiliation: "Warsaw University of Technology",
			isPresenter: true,
		},
		{
			firstName: "Tomasz",
			lastName: "Lewandowski",
			email: "t.lewandowski@pw.edu.pl",
			affiliation: "Warsaw University of Technology",
			isPresenter: false,
		},
	],
	keywords: [
		"microservices",
		"automated testing",
		"systematic review",
		"integration testing",
		"DevOps",
	],
};

const submission2History: MockStatusHistory[] = [
	// Round 1
	{
		id: "hist-002-1",
		submissionId: "sub-002",
		status: "DRAFT",
		timestamp: new Date("2026-01-08T14:20:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-002-2",
		submissionId: "sub-002",
		status: "SUBMITTED",
		timestamp: new Date("2026-01-08T15:00:00"),
		triggeredBy: "Maria Wiśniewska",
	},
	{
		id: "hist-002-3",
		submissionId: "sub-002",
		status: "UNDER_REVIEW",
		timestamp: new Date("2026-01-09T08:30:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
		metadata: { comment: "Round 1: Assigned 2 reviewers" },
	},
	{
		id: "hist-002-4",
		submissionId: "sub-002",
		status: "REVIEWS_COMPLETE",
		timestamp: new Date("2026-01-12T17:00:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-002-5",
		submissionId: "sub-002",
		status: "REVISE_REQUIRED",
		timestamp: new Date("2026-01-13T10:45:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
		metadata: { comment: "Methodology and case studies improvements required" },
	},
	// Round 2
	{
		id: "hist-002-6",
		submissionId: "sub-002",
		status: "RESUBMITTED",
		timestamp: new Date("2026-01-16T09:00:00"),
		triggeredBy: "Maria Wiśniewska",
		metadata: { comment: "Version 2 with revisions" },
	},
	{
		id: "hist-002-7",
		submissionId: "sub-002",
		status: "UNDER_REVIEW",
		timestamp: new Date("2026-01-16T10:00:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
		metadata: { comment: "Round 2: Assigned same reviewers" },
	},
	{
		id: "hist-002-8",
		submissionId: "sub-002",
		status: "REVIEWS_COMPLETE",
		timestamp: new Date("2026-01-17T16:00:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-002-9",
		submissionId: "sub-002",
		status: "ACCEPTED",
		timestamp: new Date("2026-01-18T11:00:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
		metadata: { comment: "Revisions accepted, paper accepted" },
	},
];

const submission2Reviews: MockReview[] = [
	// Round 1 reviews
	{
		id: "rev-002-1-r1",
		submissionId: "sub-002",
		round: 1,
		reviewerName: "Reviewer 1",
		scores: {
			originality: 3,
			clarity: 4,
			significance: 3,
			overall: 3.3,
		},
		comments:
			"The systematic review is comprehensive, but the analysis of testing strategies could be deeper. The paper would benefit from more detailed case studies and practical examples. The related work section needs expansion to include recent 2025 publications.",
		createdAt: new Date("2026-01-11T11:20:00"),
	},
	{
		id: "rev-002-2-r1",
		submissionId: "sub-002",
		round: 1,
		reviewerName: "Reviewer 2",
		scores: {
			originality: 4,
			clarity: 3,
			significance: 4,
			overall: 3.7,
		},
		comments:
			"Good overview of the field, but the methodology section needs clarification. How were the papers selected? What were the inclusion/exclusion criteria? The discussion of threats to validity is too brief. I recommend major revisions.",
		createdAt: new Date("2026-01-12T17:00:00"),
	},
	// Round 2 reviews (after revisions)
	{
		id: "rev-002-1-r2",
		submissionId: "sub-002",
		round: 2,
		reviewerName: "Reviewer 1",
		scores: {
			originality: 4,
			clarity: 5,
			significance: 4,
			overall: 4.3,
		},
		comments:
			"The authors have addressed my previous concerns thoroughly. The methodology section is now clear with well-defined inclusion/exclusion criteria. The new case studies add significant value. The paper is ready for acceptance.",
		createdAt: new Date("2026-01-17T10:30:00"),
	},
	{
		id: "rev-002-2-r2",
		submissionId: "sub-002",
		round: 2,
		reviewerName: "Reviewer 2",
		scores: {
			originality: 4,
			clarity: 4,
			significance: 5,
			overall: 4.5,
		},
		comments:
			"Excellent revision. All my concerns have been addressed. The expanded threats to validity section is now comprehensive. The paper makes a solid contribution to the field. I recommend acceptance.",
		createdAt: new Date("2026-01-17T16:00:00"),
	},
];

const submission2Decision: MockEditorDecision = {
	id: "dec-002",
	submissionId: "sub-002",
	decision: "ACCEPTED",
	reasoning:
		"After a successful revision cycle, both reviewers now recommend acceptance. The paper has significantly improved in methodology, clarity, and practical value.",
	letterToAuthor:
		"Dear Dr. Wiśniewska,\n\nWe are pleased to inform you that your revised paper 'Automated Testing Strategies for Microservices Architectures: A Systematic Review' has been accepted for presentation at ICSE 2026.\n\nBoth reviewers commended the quality of your revisions and the improvements made to the methodology and case studies sections.\n\nCongratulations on your acceptance!\n\nBest regards,\nDr. Anna Nowak\nProgram Chair",
	createdAt: new Date("2026-01-18T11:00:00"),
};

// Submission 3: REJECTED - Full journey with rejection letter
const submission3: MockSubmission = {
	id: "sub-003",
	title: "A Comparative Study of Code Review Tools in Open Source Projects",
	type: "ABSTRACT",
	status: "REJECTED",
	currentRound: 1,
	currentVersion: 1,
	createdAt: new Date("2026-01-05T09:00:00"),
	updatedAt: new Date("2026-01-12T16:00:00"),
	content:
		"This study compares popular code review tools used in open source projects, including GitHub Pull Requests, GitLab Merge Requests, Gerrit, and Phabricator. We analyzed 50 repositories to understand tool adoption patterns and developer preferences.\n\nOur findings suggest that integrated tools like GitHub PRs are most popular due to their low barrier to entry. However, Gerrit remains preferred for projects requiring strict review policies.",
	authors: [
		{
			firstName: "Piotr",
			lastName: "Zieliński",
			email: "p.zielinski@student.uw.edu.pl",
			affiliation: "University of Warsaw",
			isPresenter: true,
		},
	],
	keywords: ["code review", "open source", "developer tools"],
};

const submission3History: MockStatusHistory[] = [
	{
		id: "hist-003-1",
		submissionId: "sub-003",
		status: "DRAFT",
		timestamp: new Date("2026-01-05T09:00:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-003-2",
		submissionId: "sub-003",
		status: "SUBMITTED",
		timestamp: new Date("2026-01-05T09:30:00"),
		triggeredBy: "Piotr Zieliński",
	},
	{
		id: "hist-003-3",
		submissionId: "sub-003",
		status: "UNDER_REVIEW",
		timestamp: new Date("2026-01-06T10:00:00"),
		triggeredBy: "Dr. Marek Kowal (Editor)",
	},
	{
		id: "hist-003-4",
		submissionId: "sub-003",
		status: "REVIEWS_COMPLETE",
		timestamp: new Date("2026-01-12T15:45:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-003-5",
		submissionId: "sub-003",
		status: "REJECTED",
		timestamp: new Date("2026-01-12T16:00:00"),
		triggeredBy: "System",
		metadata: {
			comment: "Reviewer recommendation: REJECT",
		},
	},
];

const submission3Reviews: MockReview[] = [
	{
		id: "rev-003-1",
		submissionId: "sub-003",
		round: 1,
		reviewerName: "Reviewer 1",
		scores: {
			originality: 2,
			clarity: 3,
			significance: 2,
			overall: 2.3,
		},
		comments:
			"This work lacks novelty and depth. The comparison is superficial and doesn't provide insights beyond what is already available in tool documentation. The evaluation methodology is not rigorous, and the sample size is too small to draw meaningful conclusions. The related work is outdated. I recommend rejection.",
		createdAt: new Date("2026-01-12T15:45:00"),
	},
];

const submission3Decision: MockEditorDecision = {
	id: "dec-003",
	submissionId: "sub-003",
	decision: "REJECTED",
	reasoning:
		"Reviewer found insufficient novelty and methodological rigor for acceptance.",
	letterToAuthor:
		"Dear Mr. Zieliński,\n\nThank you for your submission to ICSE 2026. Unfortunately, we cannot accept your abstract for presentation.\n\nThe reviewer found that the comparative study lacks the depth and novelty expected for this conference. The methodology needs significant strengthening, and the insights provided are not sufficiently beyond existing tool documentation.\n\nWe encourage you to consider the reviewer's feedback for future work and hope you will submit to ICSE again.\n\nBest regards,\nDr. Marek Kowal\nProgram Chair",
	createdAt: new Date("2026-01-12T16:00:00"),
};

// Submission 4: UNDER_REVIEW - In progress (2/3 reviews received)
const submission4: MockSubmission = {
	id: "sub-004",
	title:
		"Blockchain-Based Version Control Systems: Security and Performance Analysis",
	type: "FULL_PAPER",
	status: "UNDER_REVIEW",
	currentRound: 1,
	currentVersion: 1,
	createdAt: new Date("2026-01-12T13:15:00"),
	updatedAt: new Date("2026-01-17T11:30:00"),
	content:
		"Traditional version control systems rely on centralized trust models that may be vulnerable to various attacks. This paper proposes a blockchain-based approach to version control that provides cryptographic guarantees for code integrity and provenance.\n\nWe present BlockGit, a distributed version control system built on Ethereum smart contracts. Our system enables trustless collaboration where commits are immutably recorded on the blockchain, and merge conflicts are resolved through consensus mechanisms.\n\nPerformance evaluation shows that BlockGit introduces acceptable overhead for most development workflows. The average commit time is 12 seconds (compared to <1 second for Git), but this tradeoff provides strong security guarantees including tamper-evident history, decentralized access control, and automated license enforcement through smart contracts.\n\nSecurity analysis demonstrates resilience against history rewriting attacks, unauthorized access, and single points of failure. We discuss practical deployment scenarios and limitations of the current implementation.",
	authors: [
		{
			firstName: "Katarzyna",
			lastName: "Lewandowska",
			email: "k.lewandowska@agh.edu.pl",
			affiliation: "AGH University of Science and Technology",
			isPresenter: true,
		},
		{
			firstName: "Paweł",
			lastName: "Górski",
			email: "p.gorski@agh.edu.pl",
			affiliation: "AGH University of Science and Technology",
			isPresenter: false,
		},
		{
			firstName: "Elena",
			lastName: "Petrova",
			email: "e.petrova@ethz.ch",
			affiliation: "ETH Zurich",
			isPresenter: false,
		},
		{
			firstName: "James",
			lastName: "Wilson",
			email: "j.wilson@mit.edu",
			affiliation: "Massachusetts Institute of Technology",
			isPresenter: false,
		},
	],
	keywords: [
		"blockchain",
		"version control",
		"smart contracts",
		"security",
		"distributed systems",
	],
};

const submission4History: MockStatusHistory[] = [
	{
		id: "hist-004-1",
		submissionId: "sub-004",
		status: "DRAFT",
		timestamp: new Date("2026-01-12T13:15:00"),
		triggeredBy: "System",
	},
	{
		id: "hist-004-2",
		submissionId: "sub-004",
		status: "SUBMITTED",
		timestamp: new Date("2026-01-12T14:00:00"),
		triggeredBy: "Katarzyna Lewandowska",
	},
	{
		id: "hist-004-3",
		submissionId: "sub-004",
		status: "UNDER_REVIEW",
		timestamp: new Date("2026-01-13T09:00:00"),
		triggeredBy: "Dr. Anna Nowak (Editor)",
		metadata: {
			comment: "Assigned to 3 reviewers",
		},
	},
];

const submission4Reviews: MockReview[] = [
	{
		id: "rev-004-1",
		submissionId: "sub-004",
		round: 1,
		reviewerName: "Reviewer 1",
		scores: {
			originality: 5,
			clarity: 4,
			significance: 5,
			overall: 4.7,
		},
		comments:
			"Innovative approach to version control using blockchain. The security analysis is thorough and the performance benchmarks are comprehensive. This is excellent work that will be of great interest to the software engineering community.",
		createdAt: new Date("2026-01-16T14:20:00"),
	},
	{
		id: "rev-004-2",
		submissionId: "sub-004",
		round: 1,
		reviewerName: "Reviewer 2",
		scores: {
			originality: 4,
			clarity: 4,
			significance: 4,
			overall: 4.0,
		},
		comments:
			"Solid contribution. The blockchain integration is well-designed and the evaluation covers both security and performance aspects. Some concerns about scalability should be addressed, but overall this is good work.",
		createdAt: new Date("2026-01-17T11:30:00"),
	},
	// Third review still pending
];

// Submission 5: DRAFT - Minimal history
const submission5: MockSubmission = {
	id: "sub-005",
	title: "Refactoring Techniques for Legacy Monolithic Applications",
	type: "POSTER",
	status: "DRAFT",
	currentRound: 1,
	currentVersion: 1,
	createdAt: new Date("2026-01-15T16:45:00"),
	updatedAt: new Date("2026-01-15T17:30:00"),
	content:
		"This poster presents practical refactoring techniques for migrating legacy monolithic applications to modern architectures. We focus on the strangler fig pattern, domain-driven decomposition, and incremental modernization strategies.\n\nBased on our experience with 5 enterprise systems, we provide guidelines for identifying service boundaries, managing data dependencies, and ensuring business continuity during migration.",
	authors: [
		{
			firstName: "Aleksandra",
			lastName: "Kowalczyk",
			email: "a.kowalczyk@pwr.edu.pl",
			affiliation: "Wroclaw University of Science and Technology",
			isPresenter: true,
		},
	],
	keywords: ["refactoring", "legacy systems", "modernization", "microservices"],
};

const submission5History: MockStatusHistory[] = [
	{
		id: "hist-005-1",
		submissionId: "sub-005",
		status: "DRAFT",
		timestamp: new Date("2026-01-15T16:45:00"),
		triggeredBy: "System",
	},
];

// Version data - only for submission 2 which has 2 versions
const submission2Versions: MockVersion[] = [
	{
		id: "ver-002-1",
		submissionId: "sub-002",
		version: 1,
		title:
			"Automated Testing Strategies for Microservices Architectures: A Systematic Review",
		content:
			"Microservices architectures have gained significant popularity in modern software development, but testing these distributed systems presents unique challenges. This systematic review analyzes 87 primary studies published between 2018 and 2025 to identify and categorize automated testing strategies for microservices.\n\nWe examine testing approaches across multiple levels: unit testing of individual services, integration testing between services, contract testing for API compatibility, and end-to-end testing of complete workflows.",
		authors: [
			{
				firstName: "Maria",
				lastName: "Wiśniewska",
				email: "m.wisniewska@pw.edu.pl",
				affiliation: "Warsaw University of Technology",
				isPresenter: true,
			},
			{
				firstName: "Tomasz",
				lastName: "Lewandowski",
				email: "t.lewandowski@pw.edu.pl",
				affiliation: "Warsaw University of Technology",
				isPresenter: false,
			},
		],
		keywords: ["microservices", "automated testing", "systematic review"],
		createdAt: new Date("2026-01-08T15:00:00"),
	},
	{
		id: "ver-002-2",
		submissionId: "sub-002",
		version: 2,
		title:
			"Automated Testing Strategies for Microservices Architectures: A Systematic Review",
		content:
			"Microservices architectures have gained significant popularity in modern software development, but testing these distributed systems presents unique challenges. This systematic review analyzes 87 primary studies published between 2018 and 2025 to identify and categorize automated testing strategies for microservices.\n\nWe examine testing approaches across multiple levels: unit testing of individual services, integration testing between services, contract testing for API compatibility, and end-to-end testing of complete workflows. Our analysis reveals that while unit testing practices are well-established, integration and contract testing remain challenging areas with limited tool support.\n\nKey findings include: (1) service mesh technologies enable new testing patterns, (2) chaos engineering is increasingly adopted for resilience testing, and (3) observability tools play a crucial role in test debugging. We provide recommendations for practitioners and identify gaps for future research.",
		authors: [
			{
				firstName: "Maria",
				lastName: "Wiśniewska",
				email: "m.wisniewska@pw.edu.pl",
				affiliation: "Warsaw University of Technology",
				isPresenter: true,
			},
			{
				firstName: "Tomasz",
				lastName: "Lewandowski",
				email: "t.lewandowski@pw.edu.pl",
				affiliation: "Warsaw University of Technology",
				isPresenter: false,
			},
		],
		keywords: [
			"microservices",
			"automated testing",
			"systematic review",
			"integration testing",
			"DevOps",
		],
		createdAt: new Date("2026-01-16T09:00:00"),
	},
];

export const mockVersions: Map<string, MockVersion[]> = new Map([
	["sub-002", submission2Versions],
]);

// Exports
export const mockSubmissions: MockSubmission[] = [
	submission1,
	submission2,
	submission3,
	submission4,
	submission5,
];

export const mockStatusHistories: Map<string, MockStatusHistory[]> = new Map([
	["sub-001", submission1History],
	["sub-002", submission2History],
	["sub-003", submission3History],
	["sub-004", submission4History],
	["sub-005", submission5History],
]);

export const mockReviews: Map<string, MockReview[]> = new Map([
	["sub-001", submission1Reviews],
	["sub-002", submission2Reviews],
	["sub-003", submission3Reviews],
	["sub-004", submission4Reviews],
	["sub-005", []],
]);

export const mockEditorDecisions: Map<string, MockEditorDecision | undefined> =
	new Map([
		["sub-001", submission1Decision],
		["sub-002", submission2Decision],
		["sub-003", submission3Decision],
		["sub-004", undefined],
		["sub-005", undefined],
	]);

// Helper functions
export function getSubmissionById(id: string): MockSubmission | undefined {
	return mockSubmissions.find((s) => s.id === id);
}

export function getStatusHistoryForSubmission(
	submissionId: string,
): MockStatusHistory[] {
	return mockStatusHistories.get(submissionId) || [];
}

export function getReviewsForSubmission(submissionId: string): MockReview[] {
	return mockReviews.get(submissionId) || [];
}

export function getEditorDecisionForSubmission(
	submissionId: string,
): MockEditorDecision | undefined {
	return mockEditorDecisions.get(submissionId);
}

export function getVersionsForSubmission(submissionId: string): MockVersion[] {
	return mockVersions.get(submissionId) || [];
}

export function getVersionByNumber(
	submissionId: string,
	versionNumber: number,
): MockVersion | undefined {
	const versions = mockVersions.get(submissionId);
	return versions?.find((v) => v.version === versionNumber);
}
