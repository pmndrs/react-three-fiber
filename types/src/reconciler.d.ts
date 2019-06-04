export declare function addEffect(callback: Function): void
export declare function renderGl(state: any, timestamp: number, repeat?: number, runGlobalEffects?: boolean): number
export declare function invalidate(state: any, frames?: number): void
export declare const extend: (objects: any) => any
export declare function applyProps(instance: any, newProps: any, oldProps?: any, accumulative?: boolean): void
export declare function render(element: any, container: any, state: any): any
export declare function unmountComponentAtNode(container: any): void
export declare function createPortal(
  children: any,
  containerInfo: any,
  implementation: any,
  key?: null
): {
  $$typeof: number | symbol
  key: string | null
  children: any
  containerInfo: any
  implementation: any
}
