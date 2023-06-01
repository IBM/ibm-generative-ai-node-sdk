export type RequiredPartial<T, L extends keyof T> = Required<Pick<T, L>> &
  Partial<Omit<T, L>>;
