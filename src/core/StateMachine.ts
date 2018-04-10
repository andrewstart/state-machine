import {Thread} from './Thread';
import {State} from './State';
import {Decorator, RunMode} from './Decorator';
import {ExternalPromise} from './internal/ExternalPromise';
import {CancelTokenSession} from './internal/CancelTokenSession';
import {WILDCARD_TRANSITION, ERROR_PREFIX, ERROR_SPLIT} from './const';
import {Transition} from './types';

/**
 * The type of ids for threads, which are unique per StateMachine instance.
 */
export type ThreadID = number;

/**
 * The ThreadID for the main thread, should you need to reference it.
 */
export const MAIN_THREAD:ThreadID = 0;

/**
 * The StateMachine class is your runtime manager of states.
 * @typeparam S The session type, for the session object that is shared with all states and decorators.
 * @typeparam O The (non-error) output data type for the final state, and thus the state machine as a whole.
 */
export class StateMachine<S extends Object = {}, O = any> {
    /**
     * The state that is used for initial entry.
     */
    private firstState: State<S>;
    /**
     * Error transitions that have been registered as global transitions.
     */
    private globalCatches: Map<string, State<S>>;
    /**
     * ID of the next thread to be registered as createable.
     */
    private nextThreadId: ThreadID;
    /**
     * Decorators to be applied to all states.
     */
    private globalDecorators: Set<Decorator<any>>;
    /**
     * For each session, a map of active threads.
     */
    private threads: WeakMap<S, Map<number, Thread>>;
    
    constructor() {
        this.globalCatches = new Map();
        this.globalDecorators = new Set();
        this.nextThreadId = MAIN_THREAD + 1;
        this.threads = new WeakMap();
    }

    /**
     * Adds the first state.
     * @param name Leave this null, because the first state does not have a named transition into it.
     * @param source Leave this null, because the first state does not come from another state.
     * @param firstState The first state.
     */
    public addTransition(name:null, source:null, firstState:State<S, void, any>):void;
    /**
     * Adds an error transition that is a global catch.
     * @param name The name of the error transition, beginning with {@linkcode ERROR_PREFIX}.
     * @param source Leave this null, because the transition is global.
     * @param catchState The state to enter upon the error transition.
     */
    public addTransition(name:string, source:null, catchState:State<S, any, any>):void;
    /**
     * Adds a transition that will safely end the StateMachine.
     * @param name The name of the transition. If an error transition, must begin with {@linkcode ERROR_PREFIX}.
     * @param finalState The final state before exiting.
     */
    public addTransition(name:string, finalState:State<S, any, O>):void;
    /**
     * Adds a normal transition between states.
     * @typeparam T The data type for the output from the source state and input for the destination state.
     * @param name The name of the transition. If an error transition, must begin with {@linkcode ERROR_PREFIX}.
     * @param source The state that this transition is from
     * @param dest The state that this transition is to.
     */
    public addTransition<T>(name:string, source:State<S, any, T>, dest:State<S, T, any>):void;
    /**
     * @typeparam T The data type for the output from the source state and input for the destination state.
     * @param name The name of the transition. If an error transition, must begin with {@linkcode ERROR_PREFIX}.
     * @param source The state that this transition is from
     * @param dest The state that this transition is to.
     * @hidden
     */
    public addTransition<T>(name:string, source:State<S, any, T>, dest?:State<S, T, any>):void {
        if (!source) {
            //if name exists but doesn't start with the error prefix, we are currently ignoring
            //that we were given it - probably should either force the prefix or log a warning
            if (name && name[0] === ERROR_PREFIX) {
                if (this.globalCatches.has(name)) {
                    throw new Error(`Attempting to overwrite global ${name} catch with ${dest}`);
                }
                this.globalCatches.set(name, dest);
            } else {
                if (this.firstState) {
                    throw new Error(`Attempting to overwrite first state ${this.firstState} with ${dest}`);
                }
                this.firstState = dest;
            }
            return;
        }
        if (source.transitions.has(name)) {
            throw new Error(`State ${source} already has a transition with the name ${name}`);
        }
        source.transitions.set(name, dest);
    }

    /**
     * Adds a decorator to one state or all states.
     * @typeparam T The output type from the [Decorator init method]{@link Decorator.init}.
     * @param decorator The decorator instance to be added.
     * @param targetState The state the decorator should be attached to.
     * If omitted, the decorator will be for every state.
     * @returns The output value from the Decorator init method.
     */
    public addDecorator<T>(decorator:Decorator<T>, targetState?:State<S>):T {
        if (targetState) {
            //if targeting a specific state, add decorator to just that state
            targetState.decorators.add(decorator);
        } else {
            this.globalDecorators.add(decorator);
        }
        return decorator.init(this);
    }

    /**
     * Begins the StateMachine on the first state.
     * @param session The session data.
     * @returns A promise that resolves or rejects upon StateMachine completion or failure.
     */
    public run(session:S):Promise<Transition<O>>;
    /**
     * Begins the StateMachine on a specific state
     * @param session The session data.
     * @param startState The state to begin on.
     * @param input Input data that startState is expecting.
     * @returns A promise that resolves or rejects upon StateMachine completion or failure.
     */
    public run<I>(session:S, startState:State<S, I, any>, input:I):Promise<Transition<O>>;
    /**
     * @param session The session data.
     * @param startState The state to begin on.
     * @param input Input data that startState is expecting.
     * @returns A promise that resolves or rejects upon StateMachine completion or failure.
     * @hidden
     */
    public run<I>(session:S, startState?:State<S, I, any>, input?:I):Promise<Transition<O>> {
        if (this.threads.has(session)) {
            throw new Error('StateMachine is already running with session');
        }
        this.threads.set(session, new Map());
        if (!startState) {
            startState = this.firstState;
        }
        const thread = this.startThread(session, startState, input);
        this.threads.get(session).set(MAIN_THREAD, thread);
        
        return thread._runPromise.promise
        .then((output) => {
            //ensure all threads are stopped
            this.stop(session);
            return output;
        }, (error) => {
            //ensure all threads are stopped
            this.stop(session);
            throw error;
        });
    }
    
    /**
     * Stops execution of all threads for the given session.
     * @param session The session to cancel.
     */
    public stop(session:S): void {
        if (!this.threads.has(session)) {
            return;
        }
        this.threads.get(session).forEach((thread) => {
            this.stopThread(thread);
        });
        this.threads.delete(session);
    }
    
    /**
     * Injects an error into the state machine, interrupting the current state and performing
     * standard error transition handling to determine where to go next.
     * @param session The session to interrupt.
     * @param transition The error transition to take. If it does not start with {@linkcode ERROR_PREFIX}
     * it will be prepended with ERROR_PREFIX.
     * @param input Input data for the next state.
     */
    public interrupt(session:S, transition:string, input?:any): void {
        if (!this.threads.has(session)) {
            throw new Error(`Can't interrupt session - not running`);
        }
        this.interruptThread(MAIN_THREAD, session, transition, input);
    }
    
    /**
     * Registers a thread, getting a unique id for the thread. Used only by the BeginThread decorator.
     * @internal
     * @returns The ThreadID to use.
     */
    public registerThread(): ThreadID {
        return this.nextThreadId++;
    }
    
    /**
     * Starts a secondary thread. Used only by the BeginThread decorator.
     * Silently fails if the thread is already running.
     * @internal
     * @param id The id of the thread to start.
     * @param session The session for which a thread is starting.
     * @param startState The first state of the thread.
     * @param input Input data for the initial state.
     */
    public startSecondaryThread(id: ThreadID, session:S, startState:State<S>, input:any): void {
        //can't start a thread if it is already running, for safety reasons
        if (this.threads.get(session).has(id)) {
            return;
        }
        const thread = this.startThread(session, startState, input);
        this.threads.get(session).set(id, thread);
        
        thread._runPromise.promise.catch(() => {
            //if a secondary thread ends in a rejection, we should ideally log something, but
            //we do not want to throw an actual error if it does so
        }).then(() => {
            //now that thread is complete, remove it from the list
            /* istanbul ignore else: just safety check in case of cleanup */
            if (this.threads.has(session)) {
                this.threads.get(session).delete(id);
            }
        });
    }
    
    /**
     * Stops a secondary thread. Used only by the EndThread decorator.
     * @internal
     * @param id The id of the thread to stop.
     * @param session The session for which a thread is being stopped.
     */
    public stopSecondaryThread(id: ThreadID, session:S): void {
        const thread = this.threads.get(session).get(id);
        if (thread) {
            this.stopThread(thread);
            this.threads.get(session).delete(id);
        }
    }
    
    /**
     * Interrupts the main thread or a secondary thread.
     * Used only by the InterruptThread decorator and StateMachine.interrupt().
     * @internal
     * @param id The id of the thread to start.
     * @param session The session for which a thread is starting.
     * @param transition The transition to interrupt the thread with.
     * @param input Input data for the initial state.
     */
    public interruptThread(id: ThreadID, session:S, transition:string, input?:any): void {
        const thread = this.threads.get(session).get(id);
        if (!thread) {
            throw new Error(`Unable to interrupt thread ${id} because it isn't running`);
        }
        // store variables that would be cleared when the thread would be stopped
        const promise = thread._runPromise;
        const current = thread._current;
        this.stopThread(thread);
        //restore run promise
        thread._runPromise = promise;
        if (typeof transition !== 'string') {
            transition = '';
        }
        //ensure transition starts with error prefix
        if (transition[0] !== ERROR_PREFIX) {
            transition = ERROR_PREFIX + transition;
        }
        //find the appropriate transition and enact it
        this.findAndRunNextState(session, thread, current, [transition, input]);
    }

    /**
     * Starts a thread.
     * @internal
     * @param session The session for which a thread is starting.
     * @param startState The first state of the thread.
     * @param input Input data for the initial state.
     * @returns The started thread.
     */
    private startThread(session:S, startState:State<S>, input:any): Thread {
        const thread = new Thread();
        thread._runPromise = new ExternalPromise();
        this.beginState(session, thread, startState, input, null);
        return thread;
    }

    /**
     * Starts a state, including handling decorators. Handles callbacks to perform post-state tasks.
     * @param session The active session.
     * @param thread The thread that this state is running in.
     * @param state The state to begin.
     * @param input The input, which was output from the previous state.
     * @param transition The name of the transition that led to this state.
     */
    private beginState(session:S, thread:Thread, state:State<S>, input:any, transition:string): void {
        //clear previous state data
        thread._current = state;
        thread._activePromise = new CancelTokenSession();
        //run decorators
        const run = (decorator:Decorator<any>) => {
            this.runDecorator(RunMode.STATE_START, decorator, session, state, [transition, input]);
        };
        try {
            this.globalDecorators.forEach(run);
            state.decorators.forEach(run);
        } catch (err) {
            //something went wrong in the library - report error and bail
            thread._runPromise.reject([`${ERROR_PREFIX}InternalError`, err]);
            return;
        }
        //actually enter the state
        thread._activePromise.wrap(state.onEntry(session, thread, input, transition))
        .catch((error) => {
            //turn error into [transition, result] format, if it isn't already
            //casting is to standardize what typescript thinks that the output is
            if (error) {
                if (Array.isArray(error) && typeof error[0] === 'string') {
                    if (error[0][0] !== ERROR_PREFIX) {
                        //ensure first character is a tilde, for an error transition
                        error[0] = ERROR_PREFIX + error[0];
                    }
                    return error as Transition;
                }
                if (typeof error === 'string') {
                    if (error[0] !== ERROR_PREFIX) {
                        //ensure first character is a tilde, for an error transition
                        error = ERROR_PREFIX + error;
                    }
                    return [error, null] as Transition;
                }
                if (error instanceof Error) {
                    return [`${ERROR_PREFIX}${error.name}`, error] as Transition;
                }
            }
            return [`${ERROR_PREFIX}UnknownError`, error] as Transition;
        }).then((result) => {
            //run decorators
            const run = (decorator:Decorator<any>) => {
                this.runDecorator(RunMode.STATE_END, decorator, session, state, result);
            };
            this.globalDecorators.forEach(run);
            state.decorators.forEach(run);
            this.findAndRunNextState(session, thread, state, result);
        }).catch((err) => {
            //something went wrong in the library - report error and bail
            thread._runPromise.reject([`${ERROR_PREFIX}InternalError`, err]);
        });
    }

    /**
     * Finds the next state that should be run and calls {@linkcode StateMachine.beginState}.
     * If no transition can be found, ends the StateMachine.
     * @param session The active session.
     * @param thread The thread that the state is running in.
     * @param state The state that just finished.
     * @param result The transition data output from the state that just finished, or an interrupt.
     */
    private findAndRunNextState(session:S, thread:Thread, state:State<S>, result:Transition):void {
        let [trans, output] = result;
        if (typeof trans !== 'string') {
            trans = '';
        }
        const transMap = state.transitions;
        //find and begin next state, or resolve session._runPromise
        if (trans[0] === ERROR_PREFIX) {
            //handle as error
            const list = this.generateErrorTransitionList(trans);
            let dest:State<S>;
            //check state for transitions
            for (let i = 0; i < list.length; ++i) {
                if (transMap.has(list[i])) {
                    dest = transMap.get(list[i]);
                    break;
                }
            }
            //if no transition found, check global catches
            if (!dest) {
                for (let i = 0; i < list.length; ++i) {
                    if (this.globalCatches.has(list[i])) {
                        dest = this.globalCatches.get(list[i]);
                        break;
                    }
                }
            }
            //now that we have a destination, start that state
            if (dest) {
                this.beginState(session, thread, dest, output, trans);
            } else {
                //no error handler found, stop the thread
                thread._runPromise.reject(result);
            }
            return;
        }
        if (transMap.has(trans) || transMap.has(WILDCARD_TRANSITION)) {
            //get the destination state
            let dest = transMap.has(trans) ? transMap.get(trans) : transMap.get(WILDCARD_TRANSITION);
            if (dest) {
                //begin the state
                this.beginState(session, thread, dest, output, trans);
            } else {
                //if transition exists but not state, end the state machine
                thread._runPromise.resolve(result);
            }
            return;
        }
        thread._runPromise.reject([`${ERROR_PREFIX}TransitionError`, new Error(`Unable to find transition ${trans} on state ${state.name}`)]);
    }

    /**
     * Runs a Decorator for a given state, if the current runMode matches that of the Decorator.
     * @param runMode The current runmode.
     * @param decorator The decorator to run.
     * @param session The active session.
     * @param state The active state.
     * @param result The transition data output from the state that just finished, or an interrupt.
     */
    private runDecorator(runMode:RunMode, decorator:Decorator<any>, session:S, state:State<any>, result:[string, any]): void {
        //only run the decorator if now is the right time
        if (decorator.runMode !== runMode) {
            return;
        }
        decorator.run(this, session, state, result);
    }
    
    /**
     * Generates an ordered error transition handler list for a given error transition, from
     * most to least specific.
     * @param transition The name of the error transition to generate a list for.
     * @returns The sorted transition list.
     */
    private generateErrorTransitionList(transition:string):string[] {
        //start with the general error transition
        const out:string[] = [ERROR_PREFIX];
        //if transition contains ERROR_SPLIT (split.length > 1), hit all the intermediate transitions that could be made
        for (let index = -1; (index = transition.indexOf(ERROR_SPLIT, index + 1)) > -1;) {
            out.unshift(transition.substring(0, index));
        }
        out.unshift(transition);
        return out;
    }

    /**
     * Stops a thread.
     * @param thread The thread to stop.
     */
    private stopThread(thread: Thread): void {
        //cancel promise session (prevents _runPromise from resolving)
        if (thread._activePromise) {
            thread._activePromise.cancel();
        }
        //clear variables
        thread._current = null;
        thread._runPromise = null;
        thread._activePromise = null;
    }
}