import { WORKS, type Work } from "../catalog/works";

export function randomWork(excludeId?: string): Work {
  const pool = WORKS.filter((work) => work.id !== excludeId);
  const list = pool.length > 0 ? pool : WORKS;
  return list[Math.floor(Math.random() * list.length)] ?? WORKS[0];
}
