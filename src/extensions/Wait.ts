import {State} from '../core/State';
import {Session, Thread} from '../core/Session';

export class Wait<S, I = any> extends State<S, I, I> {
    private waitMilliseconds:number;
    constructor(name:string, waitMilliseconds:number) {
        super(name);
        this.waitMilliseconds = waitMilliseconds;
    }
    
    public onEntry(session:Session<S>, thread:Thread, input:I, transition?:string): Promise<[string, I]> {
        let timeout:number;
        return thread.wrap(new Promise((resolve) => {
            timeout = setTimeout(() => {
                resolve([transition, input]);
            }, this.waitMilliseconds);
        }), () => {
            clearTimeout(timeout);
        });
    }
}