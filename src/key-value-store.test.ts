import { beforeEach, describe, expect, it } from "vitest";
import { KeyValueStore } from "./key-value-store";

describe("KeyValueStore", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("should set and get a value", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", "hello");

		expect(kvs.get("key1")?.as("string")).toBe("hello");
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

		expect(kvsA.get("shared")?.as("string")).toBe("value-a");
		expect(kvsB.get("shared")?.as("string")).toBe("value-b");
	});

	it("should overwrite existing value", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", "first");
		kvs.set("key1", "second");

		expect(kvs.get("key1")?.as("string")).toBe("second");
	});

	it("should delete a value", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", "value");
		kvs.delete("key1");

		expect(kvs.get("key1")).toBeNull();
	});
	it("should keep the type of a stored number", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", 25);

		expect(kvs.get("key1")?.as("number")).toBe(25);
	});

	it("should keep the type of a stored boolean", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", false);

		expect(kvs.get("key1")?.as("boolean")).toBe(false);
	});

	it("should keep the shape of a stored object", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", { name: "focus", intervals: { total: 7, set: 2 } });

		expect(kvs.get("key1")?.as("object")).toEqual({
			name: "focus",
			intervals: { total: 7, set: 2 },
		});
	});

	it("should return null when the value is of another type", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", 25);

		expect(kvs.get("key1")?.as("string")).toBeNull();
	});

	it("should return the value whatever its type when no type is expected", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", 25);

		expect(kvs.get("key1")?.as("unknown")).toBe(25);
	});

	it("should not read an array as an object", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", [1, 2]);

		expect(kvs.get("key1")?.as("object")).toBeNull();
	});

	it("should read a stored null", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", null);

		expect(kvs.get("key1")?.as("unknown")).toBeNull();
	});

	it("should return null for a value it did not write", () => {
		const kvs = new KeyValueStore("unique-key");

		window.localStorage.setItem("unique-key:key1", "not encoded");

		expect(kvs.get("key1")).toBeNull();
	});

	it("should drop a non-finite number", () => {
		const kvs = new KeyValueStore("unique-key");

		kvs.set("key1", Number.NaN);

		expect(kvs.get("key1")?.as("number")).toBeNull();
	});
});
