import * as THREE from 'three';
import React from 'react';
export declare type CanvasContext = {
    canvas?: React.MutableRefObject<any>;
    subscribers: Array<Function>;
    frames: 0;
    aspect: 0;
    gl?: THREE.WebGLRenderer;
    camera?: THREE.Camera;
    scene?: THREE.Scene;
    canvasRect?: DOMRectReadOnly;
    viewport?: {
        width: number;
        height: number;
    };
    size?: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    ready: boolean;
    manual: boolean;
    active: boolean;
    captured: boolean;
    invalidateFrameloop: boolean;
    subscribe?: (callback: Function, main: any) => () => any;
    setManual: (takeOverRenderloop: boolean) => any;
    setDefaultCamera: (camera: THREE.Camera) => any;
    invalidate: () => any;
};
export declare type CanvasProps = {
    children: React.ReactNode;
    gl: THREE.WebGLRenderer;
    orthographic: THREE.OrthographicCamera | THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    camera?: THREE.Camera;
    style?: React.CSSProperties;
    pixelRatio?: number;
    invalidateFrameloop?: boolean;
    onCreated: Function;
};
export declare type Measure = [{
    ref: React.MutableRefObject<any>;
}, {
    left: number;
    top: number;
    width: number;
    height: number;
}];
export declare type IntersectObject = Event & THREE.Intersection & {
    ray: THREE.Raycaster;
    stopped: {
        current: boolean;
    };
    uuid: string;
    transform: {
        x: Function;
        y: Function;
    };
};
export declare const stateContext: any;
export declare const Canvas: any;
