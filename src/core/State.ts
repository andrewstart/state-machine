import {Thread} from './Thread';
import {Decorator} from './Decorator';
import {ERROR_PREFIX} from './const';
import {Transition} from './types';

/**
 * The base state class. Must be subclassed to use. Subclasses should not store
 * stateful information on themselves, but on the session object that they are given.
 * @typeparam S The type of the session that this state is used for.
 * @typeparam I The input data type that this state expects.
 * @typeparam O The output data type that this state produces (when not rejecting).
 */
export class State<S, I = any, O = any> {
    /**
     * The name of the state, for identification.
     */
    public name:string;
    /**
     * Transitions out of this state by name.
     * @internal
     */
    public transitions: Map<string, State<S>>;
    /**
     * Non-global Decorators attached to this state.
     * @internal
     */
    public decorators: Set<Decorator<any>>;

    /**
     * @param name The name of the state.
     */
    constructor(name:string) {
        this.name = name;
        this.transitions = new Map();
        this.decorators = new Set();
    }

    /**
     * Is called when the state is entered. This asynchronous method comprises
     * the entirety of the state.
     * @param session The active session.
     * @param thread The thread that this state is running in. Use this to wrap promises for cancelability.
     * @param input The input from the previous state.
     * @param transition The name of the transition that led to this state.
     * @returns A Promise that resolves or rejects when the state is complete.
     */
    public onEntry(session:S, thread:Thread, input:I, transition?:string): Promise<Transition<O>> {
        //should be overridden
        return Promise.reject([`${ERROR_PREFIX}DefaultState`, null]);
    }

    /**
     * Final cleanup for a State when it is no longer in use.
     */
    public destroy(): void {
        this.name = null;
        this.transitions = null;
        this.decorators = null;
    }
    
    public toString() {
        return this.name;
    }
}