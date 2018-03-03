import {State} from './State';
import {Session} from './Session';
import {StateMachine} from './StateMachine';

export class SubMachine<S, I = any, O = any> extends State<S, I, O> {
    private machine: StateMachine<S, O>;
    constructor(name:string, machine:StateMachine<S, O>) {
        super(name);
        this.machine = machine;
    }
    
    public onEntry(session:Session<S>, input:I, transition?:string): Promise<[string, O]> {
        return session.activePromise.wrap(
            this.machine.run(session, null, input),
            () => {
                this.machine.stop(session);
            });
    }
    
    public destroy() {
        this.machine = null;
        super.destroy();
    }
}