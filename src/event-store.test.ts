import { describe, expect, it, vi } from "vitest";
import { EventStore, type EventSchema } from "./event-store";
import { InMemoryFileSystem } from "./filesystem-fake";
import type { Infer } from "./schema";

const schema = {
	type: "object",
	properties: {
		occurredAt: { type: "date" },
		message: { type: "string" },
	},
} as const satisfies EventSchema;

type TestEvent = Infer<typeof schema>;

const createEventStore = (
	overrides: { onError?: () => void; createId?: () => string } = {},
) => {
	const fileSystem = new InMemoryFileSystem();
	const eventStore = new EventStore({
		fileSystem,
		rootDirectory: "events",
		schema,
		getOccurredAt: (event: TestEvent) => event.occurredAt,
		createId: () => "id",
		...overrides,
	});
	return { eventStore, fileSystem };
};

describe("EventStore", () => {
	it("should record an event and find it again", async () => {
		const { eventStore } = createEventStore();

		eventStore.record({
			occurredAt: new Date("2024-01-01T00:00:00.000Z"),
			message: "hello",
		});
		await eventStore.flush();

		expect(await eventStore.find()).toStrictEqual([
			{
				occurredAt: new Date("2024-01-01T00:00:00.000Z"),
				message: "hello",
			},
		]);
	});

	it("should return an empty array when the directory does not exist", async () => {
		const { eventStore } = createEventStore();

		expect(await eventStore.find()).toStrictEqual([]);
	});

	it("should create the root directory on first write", async () => {
		const { eventStore, fileSystem } = createEventStore();

		eventStore.record({
			occurredAt: new Date("2024-01-01T00:00:00.000Z"),
			message: "hello",
		});
		await eventStore.flush();

		expect(await fileSystem.exists("events")).toBe(true);
	});

	it("should return events sorted by occurredAt", async () => {
		const { eventStore } = createEventStore();

		eventStore.record({
			occurredAt: new Date("2024-01-02T00:00:00.000Z"),
			message: "second",
		});
		eventStore.record({
			occurredAt: new Date("2024-01-01T00:00:00.000Z"),
			message: "first",
		});
		await eventStore.flush();

		expect(
			(await eventStore.find()).map((event) => event.message),
		).toStrictEqual(["first", "second"]);
	});

	it("should silently skip files that fail schema validation", async () => {
		const onError = vi.fn();
		const { eventStore, fileSystem } = createEventStore({ onError });
		fileSystem.writeRaw(
			"events/broken.json",
			JSON.stringify({ occurredAt: "2024-01-01T00:00:00.000Z" }),
		);

		const events = await eventStore.find();

		expect(events).toStrictEqual([]);
		expect(onError).not.toHaveBeenCalled();
	});

	it("should skip files that are not valid JSON and report an error", async () => {
		const onError = vi.fn();
		const { eventStore, fileSystem } = createEventStore({ onError });
		fileSystem.writeRaw("events/broken.json", "not json");

		const events = await eventStore.find();

		expect(events).toStrictEqual([]);
		expect(onError).toHaveBeenCalledOnce();
	});

	it("should report an error when writing fails, without throwing", async () => {
		const onError = vi.fn();
		const fileSystem = new InMemoryFileSystem();
		vi.spyOn(fileSystem, "write").mockRejectedValueOnce(
			new Error("disk full"),
		);
		const eventStore = new EventStore({
			fileSystem,
			rootDirectory: "events",
			schema,
			getOccurredAt: (event: TestEvent) => event.occurredAt,
			onError,
		});

		eventStore.record({
			occurredAt: new Date("2024-01-01T00:00:00.000Z"),
			message: "hello",
		});
		await eventStore.flush();

		expect(onError).toHaveBeenCalledOnce();
	});
});
