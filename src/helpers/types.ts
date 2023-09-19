export type RequiredPartial<T, L extends keyof T> = Required<Pick<T, L>> &
  Partial<Omit<T, L>>;

export type FlagOption<Key extends string, T extends boolean> = T extends true
  ? { [k in Key]: true }
  : { [k in Key]?: false };

export type FalsyValues = false | '' | 0 | null | undefined;
export type Truthy<T> = T extends FalsyValues ? never : T;

export type ErrorCallback = (err: unknown) => void;
export type DataCallback<T> = (err: unknown, result: T) => void;
export type Callback<T> = ErrorCallback | DataCallback<T>;
