type UnionKeys<T> = T extends T ? keyof T : never;
type StrictUnionHelper<T, P> = T extends any
  ? T & Partial<Record<Exclude<UnionKeys<P>, keyof T>, never>>
  : never;
export type StrictUnion<T> = StrictUnionHelper<T, T>;
