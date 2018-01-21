import {Session} from './Session';
import {State} from './State';
import {ExtPromiseWrapper} from './ExtPromiseWrapper';
import {CancelTokenSession} from './CancelTokenSession';

export class StateMachine<S = {}, O = any> {
    private firstState: State<S>;
    
    public addTransition<T>(name:null, source:null, firstState:State<S, void, any>):void;
    public addTransition<T>(name:string, finalState:State<S, any, O>):void;
    public addTransition<T>(name:string, source:State<S, any, T>, dest:State<S, T, any>):void;
    public addTransition<T>(name:string, source:State<S, any, T>, dest?:State<S, T, any>):void {
        if (!source) {
            if (this.firstState) {
                throw new Error(`Attempting to overwrite first state ${this.firstState} with ${dest}`);
            }
            this.firstState = dest;
            return;
        }
        if (source.transitions.has(name)) {
            throw new Error(`State ${source} already has a transition with the name ${name}`);
        }
        source.transitions.set(name, dest);
    }
    
    public run(session:S):Promise<[string, O]> {
        const realSession = session as (Session<S>);
        realSession._runPromise = new ExtPromiseWrapper();
        this.beginState(realSession, this.firstState, null, null);
        return realSession._runPromise.promise;
    }
    
    public stop(session:S) {
        const realSession = session as (Session<S>);
        if (!realSession._runPromise || !realSession.activePromise) {
            throw new Error('Session is not running');
        }
        //cancel promise session (prevents _runPromise from resolving)
        realSession.activePromise.cancel();
        //do cleanup of active state
        if (realSession.activeStateCleanup) {
            realSession.activeStateCleanup();
        }
        //clear variables
        realSession._runPromise = null;
        realSession.activePromise = null;
        realSession.activeStateCleanup = null;
    }
    
    private beginState(session:Session<S>, state:State<S>, input:any, transition:string) {
        //clear previous cleanup
        session.activeStateCleanup = null;
        session.activePromise = new CancelTokenSession();
        session.activePromise.wrap(state.onEntry(session, input, transition))
        .catch((error) => {
            //turn error into [transition, result] format, if it isn't already
            //casting is to standardize what typescript thinks that the output is
            if (error) {
                if (Array.isArray(error) && typeof error[0] === 'string') {
                    if (error[0][0] !== '~') {
                        //ensure first character is a tilde, for an error transition
                        error[0] = '~' + error[0];
                    }
                    return error as [string, any];
                }
                if (typeof error === 'string') {
                    if (error[0] !== '~') {
                        //ensure first character is a tilde, for an error transition
                        error = '~' + error;
                    }
                    return [error, null] as [string, any];
                }
                if (error instanceof Error) {
                    return [`~${error.name}`, error] as [string, any];
                }
            }
            return ['~UnknownError', error] as [string, any];
        }).then((result) => {
            //find and begin next state, or resolve session._runPromise
        });
    }
}