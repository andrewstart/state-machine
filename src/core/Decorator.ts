import {StateMachine} from './StateMachine';
import {State} from './State';
import {Transition} from './types';

/**
 * How a decorator will run.
 */
export enum RunMode {
    /**
     * Decorator will run immediately before the state is entered, and will be
     * given the result from the previous state.
     */
    STATE_START,
    /**
     * Decorator will run after the state completes, and will be given the
     * result of the state.
     */
    STATE_END
}

/**
 * Base class for attaching a hook into states.
 */
export abstract class Decorator<T> {
    /**
     * When the decorator is run in relation to the state it is attached to.
     * @internal
     */
    public runMode: RunMode;
    
    constructor(mode: RunMode) {
        this.runMode = mode;
    }

    /**
     * Automatically called when the decorator is added to an individual state
     * or the state machine as a whole. Must be implemented by the subclass.
     * @param sm The StateMachine that the decorator has been added to.
     * @returns Whatever value the Decorator subclass chooses to return.
     */
    public abstract init(sm: StateMachine): T;

    /**
     * Automatically called before a state is entered or after the state completes.
     * Must be implemented by the subclass.
     * @param sm The StateMachine that the decorator has been added to.
     * @param session The session that is being used.
     * @param state The state that is being entered or just exited.
     * @param result The result from the state that just ended.
     */
    public abstract run(sm: StateMachine, session:any, state:State<any>, result:Transition):void;
}