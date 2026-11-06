import type { PrintLanguage } from "./print-options-schema";

const en = {
	noRoom: "No room",
	time: "Time",
	room: "Room",
	parts: {
		glance: "Program at a glance",
		detailed: "Detailed program",
		index: "Author index",
		contents: "Contents",
	},
	chair: "Chair",
	chairs: "Chairs",
	invited: "Invited",
	sheets: { program: "Program", authors: "Authors" },
	columns: {
		date: "Date",
		weekday: "Weekday",
		sessionCode: "Session code",
		sessionTitle: "Session title",
		sessionStart: "Session start",
		sessionEnd: "Session end",
		room: "Room",
		track: "Track",
		chairs: "Chairs",
		type: "Type",
		board: "Board",
		start: "Start",
		end: "End",
		title: "Title",
		authors: "Authors",
		presenter: "Presenter",
		badge: "Badge",
		submissionType: "Submission type",
		invited: "Invited",
		submissionId: "Submission ID",
		cancelled: "Cancelled",
	},
	rowTypes: {
		slot: "Slot",
		session: "Session",
		BREAK: "Break",
		EVENT: "Event",
	},
	roles: { author: "Author", presenter: "Presenter", chair: "Chair" },
	authorColumns: {
		lastName: "Surname",
		firstName: "First name",
		sessionCode: "Session code",
		role: "Role",
		slotTitle: "Slot title",
	},
};

export type PrintLabels = typeof en;

export const PRINT_LOCALE = { en: "en-GB", pl: "pl-PL" } satisfies Record<
	PrintLanguage,
	string
>;

export const capitalizeFirst = (text: string, language: PrintLanguage) =>
	text.charAt(0).toLocaleUpperCase(PRINT_LOCALE[language]) + text.slice(1);

export const utcDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

export const PRINT_LABELS = {
	en,
	pl: {
		noRoom: "Bez sali",
		time: "Godz.",
		room: "Sala",
		parts: {
			glance: "Program w skrócie",
			detailed: "Program szczegółowy",
			index: "Indeks autorów",
			contents: "Spis treści",
		},
		chair: "Prowadzący",
		chairs: "Prowadzący",
		invited: "Zaproszony",
		sheets: { program: "Program", authors: "Autorzy" },
		columns: {
			date: "Data",
			weekday: "Dzień tygodnia",
			sessionCode: "Kod sesji",
			sessionTitle: "Tytuł sesji",
			sessionStart: "Początek sesji",
			sessionEnd: "Koniec sesji",
			room: "Sala",
			track: "Sekcja",
			chairs: "Prowadzący",
			type: "Typ",
			board: "Tablica",
			start: "Początek",
			end: "Koniec",
			title: "Tytuł",
			authors: "Autorzy",
			presenter: "Prezentujący",
			badge: "Wyróżnienie",
			submissionType: "Rodzaj zgłoszenia",
			invited: "Zaproszone",
			submissionId: "ID zgłoszenia",
			cancelled: "Odwołane",
		},
		rowTypes: {
			slot: "Wystąpienie",
			session: "Sesja",
			BREAK: "Przerwa",
			EVENT: "Wydarzenie",
		},
		roles: { author: "Autor", presenter: "Prezentujący", chair: "Prowadzący" },
		authorColumns: {
			lastName: "Nazwisko",
			firstName: "Imię",
			sessionCode: "Kod sesji",
			role: "Rola",
			slotTitle: "Tytuł wystąpienia",
		},
	} satisfies typeof en,
} satisfies Record<PrintLanguage, typeof en>;
