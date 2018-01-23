import {Session, Thread} from './Session';
import {State} from './State';
import {ExtPromiseWrapper} from './ExtPromiseWrapper';
import {CancelTokenSession} from './CancelTokenSession';
import {WILDCARD_TRANSITION, ERROR_PREFIX, ERROR_SPLIT} from './const';

const MAIN_THREAD = 0;

export class StateMachine<S = {}, O = any> {
    private firstState: State<S>;
    private globalCatches: Map<string, State<S>>;
    private nextThreadId:number;
    
    constructor() {
        this.globalCatches = new Map();
        this.nextThreadId = MAIN_THREAD + 1;
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
    
    public run(session:S):Promise<[string, O]>;
    public run<I>(session:S, startState:State<Session<S>, I, any>, input:I):Promise<[string, O]>;
    public run<I>(session:S, startState?:State<Session<S>, I, any>, input?:I):Promise<[string, O]> {
        const realSession = session as (Session<S>);
        realSession._threads = new Map();
        const thread = new Thread();
        realSession._threads.set(MAIN_THREAD, thread);
        thread._runPromise = new ExtPromiseWrapper();
        if (!startState) {
            startState = this.firstState;
        }
        this.beginState(realSession, thread, startState, input, null);
        return thread._runPromise.promise;
    }
    
    /**
     * Stops execution. In addition, clears promise/callback variables from the session so that it * is safe(r) for JSON.stringify() and can be used to restart execution.
     */
    public stop(session:S) {
        const realSession = session as (Session<S>);
        const thread = realSession._threads.get(MAIN_THREAD);
        if (!thread._runPromise || !thread._activePromise) {
            throw new Error('Session is not running');
        }
        //cancel promise session (prevents _runPromise from resolving)
        thread._activePromise.cancel();
        //do cleanup of active state
        if (thread.activeStateCleanup) {
            thread.activeStateCleanup();
        }
        //clear variables
        thread._current = null;
        thread._runPromise = null;
        thread._activePromise = null;
        thread.activeStateCleanup = null;
    }
    
    /**
     * Injects an error into the state machine, interrupting the current state and performing
     * standard error transition handling to determine where to go next.
     */
    public interrupt(session:S, transition:string, input?:any) {
        const realSession = session as (Session<S>);
        if (transition[0] !== ERROR_PREFIX) {
            transition = ERROR_PREFIX + transition;
        }
        const thread = realSession._threads.get(MAIN_THREAD);
        const promise = thread._runPromise;
        const current = thread._current;
        this.stop(session);
        //restore run promise
        thread._runPromise = promise;
        //find the appropriate transition and enact it
        this.findAndRunNextState(realSession, thread, current, [transition, input]);
    }
    
    private beginState(session:Session<S>, thread:Thread, state:State<S>, input:any, transition:string) {
        //clear previous cleanup
        thread.activeStateCleanup = null;
        thread._current = state;
        thread._activePromise = new CancelTokenSession();
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
                    return error as [string, any];
                }
                if (typeof error === 'string') {
                    if (error[0] !== ERROR_PREFIX) {
                        //ensure first character is a tilde, for an error transition
                        error = ERROR_PREFIX + error;
                    }
                    return [error, null] as [string, any];
                }
                if (error instanceof Error) {
                    return [`${ERROR_PREFIX}${error.name}`, error] as [string, any];
                }
            }
            return [`${ERROR_PREFIX}UnknownError`, error] as [string, any];
        }).then((result) => {
            this.findAndRunNextState(session, thread, state, result);
        });
    }
    
    private findAndRunNextState(session:Session<S>, thread:Thread, state:State<S>, result:[string, any]):void {
        const [trans, output] = result;
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
     * Generates an ordered error transition handler list for a given error transition, from
     * most to least specific.
     */
    private generateErrorTransitionList(transition:string):string[] {
        //start with the general error transition
        const out:string[] = [ERROR_PREFIX];
        const split = transition.split(ERROR_SPLIT);
        //if transition contains ERROR_SPLIT (split.length > 1), hit all the intermediate transitions that could be made
        for (let i = 0; i < split.length - 1; ++i) {
            out.unshift(split.slice(0, i).join(ERROR_PREFIX));
        }
        out.unshift(transition);
        return out;
    }
}