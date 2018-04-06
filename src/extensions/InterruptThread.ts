import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator, RunMode} from '../core/Decorator';
import {Transition} from '../core/types';

export class InterruptThread<S = any> extends Decorator<void> {
    private threadId:ThreadID;
    
    constructor(runMode:RunMode, threadId: ThreadID) {
        super(runMode);
        this.threadId = threadId;
    }
    
    public init(sm:StateMachine) {
        //nothing needs doing
    }
    
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        result = result || ['', null];
        sm.interruptThread(this.threadId, session, result[0], result[1]);
    }
}