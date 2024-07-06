import { Component } from "./components";

export type Entity = number;

export type ComponentConstructor<T extends Component = Component> = new (...args: any) => T;
