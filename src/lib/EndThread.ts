import {StateMachine, ThreadID} from './StateMachine';
import {State} from './State';
import {Decorator, RunMode} from './Decorator';
import {Session} from './Session';

export class EndThread extends Decorator<void> {
    private threadId:ThreadID;
    
    constructor(runMode:RunMode, threadId: ThreadID) {
        super(runMode);
        this.threadId = threadId;
    }
    
    public init(sm:StateMachine) {
        //nothing needs doing
    }
    
    public run(sm:StateMachine, session:Session<any>, state:State<any>, result:[string, any]) {
        sm.startSecondaryThread(this.threadId, session, state, null);
    }
}