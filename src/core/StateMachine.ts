import {Thread} from './Session';
import {State} from './State';
import {Decorator, RunMode} from './Decorator';
import {ExternalPromise} from './ExternalPromise';
import {CancelTokenSession} from './CancelTokenSession';
import {WILDCARD_TRANSITION, ERROR_PREFIX, ERROR_SPLIT} from './const';
import {Transition} from './types';

export type ThreadID = number;

export const MAIN_THREAD:ThreadID = 0;

export class StateMachine<S extends Object = {}, O = any> {
    private firstState: State<S>;
    private globalCatches: Map<string, State<S>>;
    private nextThreadId: ThreadID;
    private globalDecorators: Set<Decorator<any>>;
    private threads: WeakMap<S, Map<number, Thread>>;
    
    constructor() {
        this.globalCatches = new Map();
        this.globalDecorators = new Set();
        this.nextThreadId = MAIN_THREAD + 1;
        this.threads = new WeakMap();
    }
    
    public addTransition<T>(name:null, source:null, firstState:State<S, void, any>):void;
    public addTransition<T>(name:string, source:null, catchState:State<S, any, any>):void;
    public addTransition<T>(name:string, finalState:State<S, any, O>):void;
    public addTransition<T>(name:string, source:State<S, any, T>, dest:State<S, T, any>):void;
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
    
    public addDecorator<T>(decorator:Decorator<T>, targetState?:State<S>):T {
        if (targetState) {
            //if targeting a specific state, add decorator to just that state
            targetState.decorators.add(decorator);
        } else {
            this.globalDecorators.add(decorator);
        }
        return decorator.init(this);
    }
    
    public run(session:S):Promise<[string, O]>;
    public run<I>(session:S, startState:State<S, I, any>, input:I):Promise<[string, O]>;
    public run<I>(session:S, startState?:State<S, I, any>, input?:I):Promise<[string, O]> {
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
     * Stops execution.
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
     */
    public registerThread(): number {
        return this.nextThreadId++;
    }
    
    /**
     * Starts a secondary thread. Used only by the BeginThread decorator.
     * @internal
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
    
    private startThread(session:S, startState:State<S>, input:any): Thread {
        const thread = new Thread();
        thread._runPromise = new ExternalPromise();
        this.beginState(session, thread, startState, input, null);
        return thread;
    }
    
    private beginState(session:S, thread:Thread, state:State<S>, input:any, transition:string) {
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
    
    private findAndRunNextState(session:S, thread:Thread, state:State<S>, result:[string, any]):void {
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