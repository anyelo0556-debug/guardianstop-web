import { describe, expect, it } from "vitest";
import { getAffectedRowsCount } from "./risk-execution-intent-db-result";

describe("durable close lease update results", () => {
  it("reads the mysql2 ResultSetHeader from Drizzle tuple results", () => {
    expect(getAffectedRowsCount([{ affectedRows: 1 }, []])).toBe(1);
  });

  it("supports a direct result header", () => {
    expect(getAffectedRowsCount({ affectedRows: 2 })).toBe(2);
  });

  it("fails closed when the driver result does not prove a changed row", () => {
    expect(getAffectedRowsCount([{ affectedRows: 0 }, []])).toBe(0);
    expect(getAffectedRowsCount(undefined)).toBe(0);
    expect(getAffectedRowsCount([{ changedRows: 1 }, []])).toBe(0);
    expect(getAffectedRowsCount([{ affectedRows: "invalid" }, []])).toBe(0);
  });
});
