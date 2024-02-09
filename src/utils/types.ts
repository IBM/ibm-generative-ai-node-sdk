type UnionKeys<T> = T extends T ? keyof T : never;
type StrictUnionHelper<T, P> = T extends any
  ? T & Partial<Record<Exclude<UnionKeys<P>, keyof T>, never>>
  : never;
export type StrictUnion<T> = StrictUnionHelper<T, T>;

export type FilterKeys<Obj, Matchers> = {
  [K in keyof Obj]: K extends Matchers ? Obj[K] : never;
}[keyof Obj];

export type OmitVersion<T> = Omit<T, 'version'>;

export type Empty = Record<never, never>;
