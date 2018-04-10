import {State} from '../core/State';
import {Thread} from '../core/Thread';
import {Transition} from '../core/types';

/**
 * A State that waits for a given millisecond delay, before outputting the
 * transition and input data that it received.
 * @typeparam S The type of the session that this state is used for.
 * @typeparam I The input data type that this state expects and what it will output.
 */
export class Wait<S, I = any> extends State<S, I, I> {
    /**
     * Milliseconds to wait before resolving.
     */
    private waitMilliseconds:number;
    /**
     * @param name The name of the state.
     * @param waitMilliseconds The number of milliseconds to wait before resolving.
     */
    constructor(name:string, waitMilliseconds:number) {
        super(name);
        this.waitMilliseconds = waitMilliseconds;
    }

    /**
     * Is called when the state is entered. Performs the specified wait.
     */
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