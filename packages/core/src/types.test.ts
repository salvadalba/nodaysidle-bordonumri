import { describe, it, expect } from "vitest";
import { PermissionLevel } from "./types.js";

describe("Types", () => {
  it("should have correct permission level values", () => {
    expect(PermissionLevel.ReadOnly).toBe(0);
    expect(PermissionLevel.Communicate).toBe(1);
    expect(PermissionLevel.Modify).toBe(2);
    expect(PermissionLevel.Execute).toBe(3);
    expect(PermissionLevel.Admin).toBe(4);
  });

  it("should allow permission level comparison", () => {
    expect(PermissionLevel.Admin > PermissionLevel.ReadOnly).toBe(true);
    expect(PermissionLevel.Execute > PermissionLevel.Communicate).toBe(true);
    expect(PermissionLevel.ReadOnly < PermissionLevel.Modify).toBe(true);
  });
});
