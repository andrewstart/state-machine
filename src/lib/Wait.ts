import {State} from './State';
import {Session} from './Session';

export class Wait<S, I = any> extends State<S, I, I> {
    private waitMilliseconds:number;
    constructor(name:string, waitMilliseconds:number) {
        super(name);
        this.waitMilliseconds = waitMilliseconds;
    }
    
    public onEntry(session:Session<S>, input:I, transition?:string): Promise<[string, I]> {
        return session.activePromise.wrap(new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve([transition, input]);
            }, this.waitMilliseconds);
            session.activeStateCleanup = () => {
                clearTimeout(timeout);
            };
        }));
    }
}