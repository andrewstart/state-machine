import {StateMachine, ThreadID} from '../core/StateMachine';
import {State} from '../core/State';
import {Decorator} from '../core/Decorator';
import {Session} from '../core/Session';

export class BeginThread extends Decorator<ThreadID> {
    private threadId:ThreadID;
    
    public init(sm:StateMachine) {
        this.threadId = sm.registerThread();
        return this.threadId;
    }
    
    public run(sm:StateMachine, session:Session<any>, state:State<any>, result:[string, any]) {
        sm.startSecondaryThread(this.threadId, session, state, null);
    }
}