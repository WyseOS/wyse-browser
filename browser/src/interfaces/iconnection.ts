import { IWorklet } from "./iworklet";

export interface IEdge {
    worklet: IWorklet;
    action: string;
}

export interface IConnection {
    name: string;
    src: IEdge;
    dest: IEdge[];
}