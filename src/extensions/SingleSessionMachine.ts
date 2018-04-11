import {StateMachine} from '../core/StateMachine';
import {Transition} from '../core/types';
import {State} from '../core/State';

/**
 * A StateMachine that will only run one session at a time, and will remember the running session.
 * @typeparam S The session type, for the session object that is shared with all states and decorators.
 * @typeparam O The (non-error) output data type for the final state, and thus the state machine as a whole.
 */
export class SingleSessionMachine<S, O = any> extends StateMachine<S, O> {
    /**
     * The active session.
     */
    private session:S;

    /**
     * Begins the StateMachine on the first state. Stores the transition for stop/interrupt.
     * @param session The session data.
     * @returns A promise that resolves or rejects upon StateMachine completion or failure.
     */
    public run(session:S):Promise<Transition<O>>;
    /**
     * Begins the StateMachine on a specific state. Stores the transition for stop/interrupt.
     * @param session The session data.
     * @param startState The state to begin on.
     * @param input Input data that startState is expecting.
     * @returns A promise that resolves or rejects upon StateMachine completion or failure.
     */
    public run<I>(session:S, startState:State<S, I, any>, input:I):Promise<Transition<O>>;
    /**
     * @param session The session data.
     * @param startState The state to begin on.
     * @param input Input data that startState is expecting.
     * @returns A promise that resolves or rejects upon StateMachine completion or failure.
     * @hidden
     */
    public run<I>(session:S, startState?:State<S, I, any>, input?:I):Promise<Transition<O>> {
        if (this.session) {
            throw new Error('SingleSessionMachine is already running!');
        }
        this.session = session;
        return super.run(session, startState, input);
    }

    /**
     * Stops execution of all threads. Clears the stored session.
     */
    public stop(): void {
        if (!this.session) {
            return;
        }
        super.stop(this.session);
        this.session = null;
    }

    /**
     * Injects an error into the state machine, interrupting the current state and performing
     * standard error transition handling to determine where to go next.
     * @param transition The error transition to take. If it does not start with {@linkcode ERROR_PREFIX}
     * it will be prepended with ERROR_PREFIX.
     * @param input Input data for the next state.
     */
    public interrupt(transition:string, input?:any): void;
    /**
     * To satisfy Typescript's method overriding, the original method signature is here. Do not use it.
     */
    public interrupt(session:S, transition:string, input?:any): void;
    public interrupt(transition:string|S, input?:any, lastInput?:any): void {
        //handle someone passing the session in
        if (transition === this.session) {
            return super.interrupt(this.session, input, lastInput);
        }
        if (typeof transition !== 'string') {
            throw new Error('SingleSessionMachine wants a transition as a first param!');
        }
        super.interrupt(this.session, transition, input);
    }
}