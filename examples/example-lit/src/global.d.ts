declare global {
  function t(id: string): string;
  function t(id: string, defaultMessage: string): string;
  function t(id: string, values: Record<string, any>): string;
  function t(
    id: string,
    defaultMessage?: string | Record<string, any>,
    values?: Record<string, any>
  ): string;
}

export {};
