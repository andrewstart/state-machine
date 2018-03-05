import {StateMachine, ThreadID} from './StateMachine';
import {State} from './State';
import {Decorator} from './Decorator';
import {Session} from './Session';

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