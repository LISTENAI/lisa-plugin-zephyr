interface Module<T> {
  default: T;
}

export default async function typedImport<T>(name: string): Promise<T> {
  try {
    const mod = await import(name) as Module<T>;
    return mod.default;  
  } catch (error) {
    return <T>{}
  }
}
