import {Session} from './Session';
import {ERROR_PREFIX} from './const';

export class State<S, I = any, O = any> {
    public name:string;
    /**
     * @internal
     */
    public transitions: Map<string, State<S>>;
    
    constructor(name:string) {
        this.name = name;
        this.transitions = new Map();
    }
    
    public onEntry(session:Session<S>, input:I, transition?:string): Promise<[string, O]> {
        //should be overridden
        return Promise.reject([`${ERROR_PREFIX}DefaultState`, null]);
    }
    
    public destroy(): void {
        this.name = null;
        this.transitions = null;
    }
    
    public toString() {
        return this.name;
    }
}