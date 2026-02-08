import { describe, expect, it } from "vitest";
import { KeyValueStore } from "./key-value-store";

describe("KeyValueStore", () => {
	it("should set and get a value", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", "hello");

		expect(kvs.get("key1")).toBe("hello");
	});
	it("should return null for a non-existent key", () => {
		const kvs = new KeyValueStore("unique-key");

		expect(kvs.get("key2")).toBeNull();
	});

	it("should namespace keys by unique key", () => {
		const kvsA = new KeyValueStore("a");
		const kvsB = new KeyValueStore("b");

		kvsA.set("shared", "value-a");
		kvsB.set("shared", "value-b");

		expect(kvsA.get("shared")).toBe("value-a");
		expect(kvsB.get("shared")).toBe("value-b");
	});

	it("should overwrite existing value", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", "first");
		kvs.set("key1", "second");

		expect(kvs.get("key1")).toBe("second");
	});
});
