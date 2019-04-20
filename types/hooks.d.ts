/// <reference types="react" />
export declare function useRender(fn: Function, takeOverRenderloop: boolean): any;
export declare function useThree(): {
    [x: string]: any;
};
export declare function useUpdate(callback: Function, dependents: [], optionalRef: React.MutableRefObject<any>): React.MutableRefObject<any>;
export declare function useResource(optionalRef: React.MutableRefObject<any>): React.MutableRefObject<any>;
