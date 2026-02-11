import { describe, expect, it } from "vitest";
import { TaskManagementFile } from "./task-management-file";

describe("TaskManagementFile", () => {
	it("increments the matched task line", () => {
		const file = new TaskManagementFile(
			`- [ ] write docs 1/3
- [ ] test code 0/2`,
		);

		const updated = file.toIncremented("write docs");

		expect(updated?.toContent()).toBe(
			`- [ ] write docs 2/3
- [ ] test code 0/2`,
		);
	});

	it("returns null when target task does not exist", () => {
		const file = new TaskManagementFile("- [ ] write docs 1/3");

		expect(file.toIncremented("unknown task")).toBeNull();
	});

	it("increments the first match when task names are duplicated", () => {
		const file = new TaskManagementFile(
			`- [ ] write docs 1/3
- [ ] write docs 2/3`,
		);

		const updated = file.toIncremented("write docs");

		expect(updated?.toContent()).toBe(
			`- [ ] write docs 2/3
- [ ] write docs 2/3`,
		);
	});

	it("increments a nested task line", () => {
		const file = new TaskManagementFile(
			`- [ ] parent task 0/1
	- [ ] child task 1/4`,
		);

		const updated = file.toIncremented("child task");

		expect(updated?.toContent()).toBe(
			`- [ ] parent task 0/1
	- [ ] child task 2/4`,
		);
	});

	it("increments only the targeted task line in a complex document", () => {
		const file = new TaskManagementFile(
			`# Daily Notes

Some free text paragraph.

- [ ] write docs 1/3
- [x] done task 5/5
	- [ ] nested but different 2/4

\`\`\`md
- [ ] write docs 99/99
\`\`\`

- [ ] test code 0/2`,
		);

		const updated = file.toIncremented("write docs");

		expect(updated?.toContent()).toBe(
			`# Daily Notes

Some free text paragraph.

- [ ] write docs 2/3
- [x] done task 5/5
	- [ ] nested but different 2/4

\`\`\`md
- [ ] write docs 99/99
\`\`\`

- [ ] test code 0/2`,
		);
	});
});
