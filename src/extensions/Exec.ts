import {State} from '../core/State';
import {Thread} from '../core/Thread';
import {Transition} from '../core/types';

/**
 * A method that can be called by the Exec state.
 * @typeparam S The type of the session that the method is used for.
 * @typeparam I The input data type that this method expects.
 * @typeparam O The output data type that this method produces (when not rejecting).
 */
export type StateMethod<S, I, O> = (session:S, thread:Thread, input:I, transition?:string) => Promise<Transition<O>>;

/**
 * A State that calls a given method to perform all state logic.
 * @typeparam S The type of the session that the method is used for.
 * @typeparam I The input data type that this method expects.
 * @typeparam O The output data type that this method produces (when not rejecting).
 */
export class Exec<S, I = any, O = any> extends State<S, I, O> {
    /**
     * The method to call.
     */
    private method: StateMethod<S, I, O>;
    /**
     * @param name The name of the state.
     * @param method The method to call when entering the state.
     */
    constructor(name:string, method:StateMethod<S, I, O>) {
        super(name);
        this.method = method;
    }

    /**
     * Calls the given method.
     */
    public onEntry(session:S, thread:Thread, input:I, transition?:string): Promise<Transition<O>> {
        return thread.wrap(this.method(session, thread, input, transition));
    }

    /**
     * Cleans up the state when no longer in use.
     */
    public destroy() {
        this.method = null;
        super.destroy();
    }
}