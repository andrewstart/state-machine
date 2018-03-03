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
}

export type Session<S> = S & BaseSession;