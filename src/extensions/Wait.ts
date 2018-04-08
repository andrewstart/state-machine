import {State} from '../core/State';
import {Thread} from '../core/Thread';
import {Transition} from '../core/types';

export class Wait<S, I = any> extends State<S, I, I> {
    private waitMilliseconds:number;
    constructor(name:string, waitMilliseconds:number) {
        super(name);
        this.waitMilliseconds = waitMilliseconds;
    }
    
    public onEntry(session:S, thread:Thread, input:I, transition?:string): Promise<Transition<I>> {
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