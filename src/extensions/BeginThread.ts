import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator, RunMode} from '../core/Decorator';
import {Transition} from '../core/types';

export class BeginThread<S = any> extends Decorator<ThreadID> {
    private threadId:ThreadID;
    private startState:State<S>;
    
    constructor(runMode: RunMode, startState: State<S>) {
        super(runMode);
        this.startState = startState;
    }
    
    public init(sm:StateMachine) {
        this.threadId = sm.registerThread();
        return this.threadId;
    }
    
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        sm.startSecondaryThread(this.threadId, session, this.startState, null);
    }
}