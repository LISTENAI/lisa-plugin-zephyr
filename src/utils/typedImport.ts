interface Module<T> {
  default: T;
}

export default async function typedImport<T>(name: string): Promise<T> {
  const mod = await import(name) as Module<T>;
  return mod.default;  
}
