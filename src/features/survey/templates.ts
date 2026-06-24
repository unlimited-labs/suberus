import { type Icon, IconSalad } from "@tabler/icons-react";
import type { SurveyQuestionType } from "@/generated/prisma/enums";

export interface SurveyTemplateQuestion {
	label: string;
	type: SurveyQuestionType;
	options?: string[];
	allowOther?: boolean;
	isRequired?: boolean;
}

export interface SurveyTemplate {
	id: string;
	name: string;
	description: string;
	icon: Icon;
	questions: SurveyTemplateQuestion[];
}

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
	{
		id: "dietary-basic",
		name: "Dietary requirements – basic",
		description: "A single multi-select for common dietary needs.",
		icon: IconSalad,
		questions: [
			{
				label: "Dietary requirements",
				type: "MULTI_SELECT",
				allowOther: true,
				options: [
					"Vegetarian",
					"Vegan",
					"Gluten-free",
					"Lactose-free",
					"Halal",
					"Kosher",
					"Nut allergy",
				],
			},
		],
	},
];

export const getSurveyTemplate = (id: string): SurveyTemplate | undefined =>
	SURVEY_TEMPLATES.find((t) => t.id === id);
