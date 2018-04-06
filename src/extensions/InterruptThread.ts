import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator, RunMode} from '../core/Decorator';
import {Transition} from '../core/types';

export class InterruptThread<S = any> extends Decorator<void> {
    private threadId:ThreadID;
    private interrupt:Transition;
    
    constructor(runMode:RunMode, threadId: ThreadID, interrupt?:Transition) {
        super(runMode);
        this.threadId = threadId;
        this.interrupt = interrupt;
    }
    
    public init(sm:StateMachine) {
        //nothing needs doing
    }
    
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        if (this.interrupt) {
            result = this.interrupt;
        }
        sm.interruptThread(this.threadId, session, result[0], result[1]);
    }
}