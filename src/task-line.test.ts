import { describe, expect, it } from "vitest";
import { TaskLine } from "./task-line";

describe("TaskLine", () => {
	it("parses a valid task line", () => {
		const taskLine = TaskLine.from("- [ ] write docs 1/3");

		expect(taskLine).not.toBeNull();
		expect(taskLine?.prefix).toBe("- [ ] ");
		expect(taskLine?.taskName).toBe("write docs");
		expect(taskLine?.completedIntervals).toBe(1);
		expect(taskLine?.carriedOverIntervals).toBeNull();
		expect(taskLine?.estimatedIntervals).toBe(3);
		expect(taskLine?.toString()).toBe("- [ ] write docs 1/3");
	});

	it("increments completed intervals", () => {
		const taskLine = TaskLine.from("- [ ] write docs 3/2");

		expect(taskLine?.toIncremented().toString()).toBe(
			"- [ ] write docs 4/2",
		);
	});

	it("parses a task line with carried-over intervals", () => {
		const taskLine = TaskLine.from("- [ ] write docs 2,1/6");

		expect(taskLine).not.toBeNull();
		expect(taskLine?.completedIntervals).toBe(1);
		expect(taskLine?.carriedOverIntervals).toBe(2);
		expect(taskLine?.estimatedIntervals).toBe(6);
		expect(taskLine?.toString()).toBe("- [ ] write docs 2,1/6");
	});

	it("increments completed intervals while preserving carried-over intervals", () => {
		const taskLine = TaskLine.from("- [ ] write docs 2,1/6");

		expect(taskLine?.toIncremented().toString()).toBe(
			"- [ ] write docs 2,2/6",
		);
	});

	it("returns null for non-task line", () => {
		expect(TaskLine.from("plain text")).toBeNull();
		expect(TaskLine.from("- [x] done 1/3")).toBeNull();
	});

	it("parses task line with extra whitespace around slash", () => {
		const taskLine = TaskLine.from("  - [ ] write docs   1 / 3  ");

		expect(taskLine).not.toBeNull();
		expect(taskLine?.prefix).toBe("  - [ ] ");
		expect(taskLine?.taskName).toBe("write docs");
		expect(taskLine?.completedIntervals).toBe(1);
		expect(taskLine?.carriedOverIntervals).toBeNull();
		expect(taskLine?.estimatedIntervals).toBe(3);
	});

	it("parses task line with carried-over intervals and extra whitespace", () => {
		const taskLine = TaskLine.from("  - [ ] write docs   2 , 1 / 6  ");

		expect(taskLine).not.toBeNull();
		expect(taskLine?.completedIntervals).toBe(1);
		expect(taskLine?.carriedOverIntervals).toBe(2);
		expect(taskLine?.estimatedIntervals).toBe(6);
	});

	it("parses task name containing slash", () => {
		const taskLine = TaskLine.from("- [ ] api v2/a 1/3");

		expect(taskLine).not.toBeNull();
		expect(taskLine?.taskName).toBe("api v2/a");
		expect(taskLine?.completedIntervals).toBe(1);
		expect(taskLine?.carriedOverIntervals).toBeNull();
		expect(taskLine?.estimatedIntervals).toBe(3);
	});

	it("returns null for malformed progress", () => {
		expect(TaskLine.from("- [ ] task a/3")).toBeNull();
		expect(TaskLine.from("- [ ] task 1/-3")).toBeNull();
		expect(TaskLine.from("- [ ] task 1/")).toBeNull();
	});

	it("keeps original line unchanged after incrementing", () => {
		const original = TaskLine.from("- [ ] write docs 1/3");
		const incremented = original?.toIncremented();

		expect(original?.completedIntervals).toBe(1);
		expect(original?.carriedOverIntervals).toBeNull();
		expect(incremented?.completedIntervals).toBe(2);
		expect(incremented?.carriedOverIntervals).toBeNull();
		expect(original?.toString()).toBe("- [ ] write docs 1/3");
		expect(incremented?.toString()).toBe("- [ ] write docs 2/3");
	});
});
