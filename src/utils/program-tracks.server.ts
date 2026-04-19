import { prisma } from "@/db.server";

export interface ProgramTrackWithStats {
	id: string;
	name: string;
	color: string | null;
	series: string | null;
	seriesOrder: number | null;
	sessionCount: number;
}

const SERIES_RE = /^(.+?)\s+(\d+)$/;

export function parseSeries(name: string): {
	series: string | null;
	seriesOrder: number | null;
} {
	const m = name.trim().match(SERIES_RE);
	if (!m) return { series: null, seriesOrder: null };
	return { series: m[1].trim(), seriesOrder: Number.parseInt(m[2], 10) };
}

export async function getAllProgramTracks(): Promise<ProgramTrackWithStats[]> {
	const tracks = await prisma.programTrack.findMany({
		include: { _count: { select: { programSessions: true } } },
		orderBy: [
			{ series: { sort: "asc", nulls: "last" } },
			{ seriesOrder: "asc" },
			{ name: "asc" },
		],
	});

	return tracks.map((t) => ({
		id: t.id,
		name: t.name,
		color: t.color,
		series: t.series,
		seriesOrder: t.seriesOrder,
		sessionCount: t._count.programSessions,
	}));
}

export async function createProgramTrack(data: {
	name: string;
	color?: string | null;
}): Promise<{ id: string }> {
	const { series, seriesOrder } = parseSeries(data.name);
	return prisma.programTrack.create({
		data: {
			name: data.name,
			color: data.color ?? null,
			series,
			seriesOrder,
		},
		select: { id: true },
	});
}

export async function updateProgramTrack(
	id: string,
	data: { name?: string; color?: string | null },
): Promise<void> {
	const patch: {
		name?: string;
		color?: string | null;
		series?: string | null;
		seriesOrder?: number | null;
	} = { ...data };
	if (data.name !== undefined) {
		const parsed = parseSeries(data.name);
		patch.series = parsed.series;
		patch.seriesOrder = parsed.seriesOrder;
	}
	await prisma.programTrack.update({ where: { id }, data: patch });
}

export async function deleteProgramTrack(id: string): Promise<void> {
	await prisma.programTrack.delete({ where: { id } });
}

export async function importFromConferenceTracks(): Promise<{
	created: number;
	skipped: number;
}> {
	const [intake, existing] = await Promise.all([
		prisma.conferenceTrack.findMany({ select: { name: true } }),
		prisma.programTrack.findMany({ select: { name: true } }),
	]);
	const existingNames = new Set(existing.map((t) => t.name));
	const toCreate = intake.filter((t) => !existingNames.has(t.name));
	if (toCreate.length === 0) return { created: 0, skipped: intake.length };

	await prisma.programTrack.createMany({
		data: toCreate.map((t) => {
			const { series, seriesOrder } = parseSeries(t.name);
			return { name: t.name, series, seriesOrder };
		}),
	});
	return { created: toCreate.length, skipped: intake.length - toCreate.length };
}
