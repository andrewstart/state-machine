import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator, RunMode} from '../core/Decorator';
import {Transition} from '../core/types';

/**
 * A Decorator that will begin a secondary thread when run. BeginThread.init()
 * returns a ThreadID that can be given to {@linkcode EndThread} and
 * {@linkcode InterruptThread} decorators.
 * @typeparam S The session type that is in use.
 */
export class BeginThread<S = any> extends Decorator<ThreadID> {
    /**
     * The ID of the thread to be started.
     */
    private threadId:ThreadID;
    /**
     * The first state.
     */
    private startState:State<S>;

    /**
     * @param runMode When the Decorator will be run.
     * @param startState The first state in the thread that will be started.
     */
    constructor(runMode: RunMode, startState: State<S>) {
        super(runMode);
        this.startState = startState;
    }

    /**
     * Registers a new thread ID for creation.
     * @returns The constant ID for the thread that this decorator will start.
     */
    public init(sm:StateMachine) {
        this.threadId = sm.registerThread();
        return this.threadId;
    }

    /**
     * Starts the secondary thread.
     */
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        sm.startSecondaryThread(this.threadId, session, this.startState, null);
    }
}