import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator} from '../core/Decorator';
import {Transition} from '../core/types';

export class BeginThread<S = any> extends Decorator<ThreadID> {
    private threadId:ThreadID;
    
    public init(sm:StateMachine) {
        this.threadId = sm.registerThread();
        return this.threadId;
    }
    
    public run(sm:StateMachine, session:S, state:State<any>, result:Transition) {
        sm.startSecondaryThread(this.threadId, session, state, null);
    }
}