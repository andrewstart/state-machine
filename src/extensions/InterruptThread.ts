import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator, RunMode} from '../core/Decorator';
import {Transition} from '../core/types';

/**
 * A Decorator that will interrupt a secondary thread or the main thread.
 * @typeparam S The session type that is in use.
 */
export class InterruptThread<S = any> extends Decorator<void> {
    /**
     * The ID of the thread to interrupt.
     */
    private threadId:ThreadID;
    /**
     * Pre-approved transition data to interrupt with.
     */
    private interrupt:Transition;

    /**
     * @param runMode When the Decorator will be run.
     * @param threadId The ID of the thread to interrupt.
     * @param interrupt Specific data to interrupt with. If omitted, uses the
     * data passed to the decorator.
     */
    constructor(runMode:RunMode, threadId: ThreadID, interrupt?:Transition) {
        super(runMode);
        this.threadId = threadId;
        this.interrupt = interrupt;
    }

    /**
     * Does nothing.
     */
    public init(sm:StateMachine) {
        //nothing needs doing
    }

    /**
     * Interrupts the specialized thread.
     */
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        if (this.interrupt) {
            result = this.interrupt;
        }
        sm.interruptThread(this.threadId, session, result[0], result[1]);
    }
}