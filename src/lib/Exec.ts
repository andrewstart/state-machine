import {State} from './State';
import {Session, Thread} from './Session';

export type StateMethod<S, I, O> = (session:Session<S>, thread:Thread, input:I, transition?:string) => Promise<[string, O]>;

export class Exec<S, I = any, O = any> extends State<S, I, O> {
    private method: StateMethod<S, I, O>;
    constructor(name:string, method:StateMethod<S, I, O>) {
        super(name);
        this.method = method;
    }
    
    public onEntry(session:Session<S>, thread:Thread, input:I, transition?:string): Promise<[string, O]> {
        return thread.wrap(this.method(session, thread, input, transition));
    }
    
    public destroy() {
        this.method = null;
        super.destroy();
    }
}