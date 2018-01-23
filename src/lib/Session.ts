import {CancelTokenSession} from './CancelTokenSession';
import {ExtPromiseWrapper} from './ExtPromiseWrapper';
import {State} from './State';

export interface BaseSession {
    /**
     * @internal
     */
    _runPromise: ExtPromiseWrapper<[string, any]>;
    /**
     * @internal
     */
    _current: State<BaseSession>;
    /**
     * Promise session wrapping active state's `onEntry()` promise, as well as being available
     * to wrap internal steps.
     */
    activePromise: CancelTokenSession;
    /**
     * Callback to clean up an internal step if a state is interrupted. If an async step inside
     * an `onEntry()` needs cleaning up, then it should set this property on the Session to a method
     * that will take care of that clean up.
     */
    activeStateCleanup: () => void;
}

export type Session<S> = S & BaseSession;