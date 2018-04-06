import {State} from '../core/State';
import {Thread} from '../core/Session';
import {Transition} from '../core/types';

export type StateMethod<S, I, O> = (session:S, thread:Thread, input:I, transition?:string) => Promise<Transition<O>>;

export class Exec<S, I = any, O = any> extends State<S, I, O> {
    private method: StateMethod<S, I, O>;
    constructor(name:string, method:StateMethod<S, I, O>) {
        super(name);
        this.method = method;
    }
    
    public onEntry(session:S, thread:Thread, input:I, transition?:string): Promise<Transition<O>> {
        return thread.wrap(this.method(session, thread, input, transition));
    }
    
    public destroy() {
        this.method = null;
        super.destroy();
    }
}