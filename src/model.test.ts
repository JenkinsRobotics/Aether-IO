import { expect, test } from "vitest";
import { addPart, connect, createProject, endpoint, removePart } from "./model";
test("deleting a component removes only its incident connections", () => {
  const p = createProject("Test");
  const next = removePart(p, "U1");
  expect(next.parts).toHaveLength(p.parts.length - 1);
  expect(next.parts.some((p) => p.id === "D1")).toBe(true);
  expect(
    next.wires.every(
      (w) => !w.from.startsWith("U1:") && !w.to.startsWith("U1:"),
    ),
  ).toBe(true);
  expect(next.wires.some((w) => w.from === "R1:b" && w.to === "D1:a")).toBe(
    true,
  );
});
test("connections reject missing pins, loops and reversed duplicates", () => {
  const p = createProject("Test");
  expect(connect(p, "U1:vcc", "J1:a")).toBe(p);
  expect(connect(p, "U1:bad", "J1:a")).toBe(p);
  expect(connect(p, "J1:a", "J1:a")).toBe(p);
  expect(connect(p, "U1:gpio21", "C1:a").wires).toHaveLength(
    p.wires.length + 1,
  );
});
test("adding parts uses unique designators and PCB placement stays independent", () => {
  let p = createProject("Test");
  p = addPart(p, "resistor", { x: 10, y: 20 });
  p = addPart(p, "resistor", { x: 30, y: 40 });
  expect(p.parts.slice(-2).map((p) => p.id)).toEqual(["R2", "R3"]);
  const before = endpoint(p, "R2:a", "schematic");
  const changed = {
    ...p,
    parts: p.parts.map((p) =>
      p.id === "R2" ? { ...p, board: { x: 500, y: 400 } } : p,
    ),
  };
  expect(endpoint(changed, "R2:a", "schematic")).toEqual(before);
  expect(endpoint(changed, "R2:a", "pcb")).toEqual({ x: 500, y: 440 });
});
