import {State} from '../core/State';
import {Thread} from '../core/Session';
import {StateMachine} from '../core/StateMachine';
import {Transition} from '../core/types';

export class SubMachine<S, I = any, O = any> extends State<S, I, O> {
    private machine: StateMachine<S, O>;
    constructor(name:string, machine:StateMachine<S, O>) {
        super(name);
        this.machine = machine;
    }
    
    public onEntry(session:S, thread:Thread, input:I, transition?:string): Promise<Transition> {
        return thread.wrap(
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