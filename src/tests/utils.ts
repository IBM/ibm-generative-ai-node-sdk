export function describeIf(
  value: boolean,
): typeof describe | typeof describe.skip {
  return value ? describe : describe.skip;
}
