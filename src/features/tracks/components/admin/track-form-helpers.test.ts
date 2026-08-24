import { describe, expect, it } from "vitest";
import {
	initialTrackForm,
	normalizeSupervisorId,
	trackDialogLabels,
} from "./track-form-helpers";

describe("initialTrackForm", () => {
	it("seeds from an existing track", () => {
		expect(
			initialTrackForm({ name: "AI", supervisorId: "u1", isActive: false }),
		).toEqual({ name: "AI", supervisorId: "u1", isActive: false });
	});

	it("defaults to blank/active for a new track", () => {
		expect(initialTrackForm()).toEqual({
			name: "",
			supervisorId: undefined,
			isActive: true,
		});
	});

	it("treats an empty supervisor as undefined", () => {
		expect(
			initialTrackForm({ name: "AI", supervisorId: null, isActive: true })
				.supervisorId,
		).toBeUndefined();
	});
});

describe("normalizeSupervisorId", () => {
	it("maps 'none' and undefined to null, keeps a real id", () => {
		expect(normalizeSupervisorId("none")).toBeNull();
		expect(normalizeSupervisorId(undefined)).toBeNull();
		expect(normalizeSupervisorId("u1")).toBe("u1");
	});
});

describe("trackDialogLabels", () => {
	it("switches labels by mode", () => {
		expect(trackDialogLabels(true)).toEqual({
			title: "Edit Track",
			description: "Update track details",
			submitLabel: "Save",
		});
		expect(trackDialogLabels(false).submitLabel).toBe("Create");
	});
});
