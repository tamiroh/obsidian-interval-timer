import { describe, expect, it } from "vitest";
import { KeyValueStore } from "./keyValueStore";

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
});
