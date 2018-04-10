import {State} from '../core/State';
import {Thread} from '../core/Thread';
import {StateMachine} from '../core/StateMachine';
import {Transition} from '../core/types';

/**
 * A State that runs another StateMachine.
 * @typeparam S The type of the session that this state is used for.
 * @typeparam I The input data type that this state expects, and is passed into the first state.
 * @typeparam O The output data type that the StateMachine outputs.
 */
export class SubMachine<S, I = any, O = any> extends State<S, I, O> {
    /**
     * The StateMachine to use.
     */
    private machine: StateMachine<S, O>;
    /**
     * @param name The name of the state.
     * @param machine The StateMachine to use.
     */
    constructor(name:string, machine:StateMachine<S, O>) {
        super(name);
        this.machine = machine;
    }

    /**
     * Is called when the state is entered. Runs the StateMachine.
     */
    public onEntry(session:S, thread:Thread, input:I, transition?:string): Promise<Transition> {
        return thread.wrap(
            this.machine.run(session, null, input),
            () => {
                this.machine.stop(session);
            });
    }

    /**
     * Final cleanup for the State when it is no longer in use.
     */
    public destroy() {
        this.machine = null;
        super.destroy();
    }
}