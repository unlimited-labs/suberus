/** Author entry shared by submission/exhibitor forms and document extraction. */
export interface Author {
	firstName: string;
	lastName: string;
	email: string;
	affiliationId: string | null;
	affiliationName: string;
	isPresenter: boolean;
}
