export type RequiredPartial<T, L extends keyof T> = Required<Pick<T, L>> &
  Partial<Omit<T, L>>;

export type FlagOption<Key extends string, T extends boolean> = T extends true
  ? { [k in Key]: true }
  : { [k in Key]?: false };
