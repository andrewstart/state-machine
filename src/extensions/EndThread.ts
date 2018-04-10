import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator, RunMode} from '../core/Decorator';
import {Transition} from '../core/types';

/**
 * A Decorator that will stop a secondary thread started by a {@linkcode BeginThread}.
 * @typeparam S The session type that is in use.
 */
export class EndThread<S = any> extends Decorator<void> {
    /**
     * The ID of the thread to stop.
     */
    private threadId:ThreadID;
    /**
     * @param runMode When the Decorator will be run.
     * @param threadId The ID of the thread to stop.
     */
    constructor(runMode:RunMode, threadId: ThreadID) {
        super(runMode);
        this.threadId = threadId;
    }

    /**
     * Does nothing.
     */
    public init(sm:StateMachine) {
        //nothing needs doing
    }

    /**
     * Stops the specified thread.
     */
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        sm.stopSecondaryThread(this.threadId, session);
    }
}