import {Session, Thread} from './Session';
import {Decorator} from './Decorator';
import {ERROR_PREFIX} from './const';
import {Transition} from './types';

export class State<S, I = any, O = any> {
    public name:string;
    /**
     * @internal
     */
    public transitions: Map<string, State<S>>;
    /**
     * @internal
     */
    public decorators: Set<Decorator<any>>;
    
    constructor(name:string) {
        this.name = name;
        this.transitions = new Map();
        this.decorators = new Set();
    }
    
    public onEntry(session:Session<S>, thread:Thread, input:I, transition?:string): Promise<Transition<O>> {
        //should be overridden
        return Promise.reject([`${ERROR_PREFIX}DefaultState`, null]);
    }
    
    public destroy(): void {
        this.name = null;
        this.transitions = null;
        this.decorators = null;
    }
    
    public toString() {
        return this.name;
    }
}