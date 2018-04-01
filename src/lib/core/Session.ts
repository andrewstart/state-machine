import {CancelTokenSession, CancelHandler} from './CancelTokenSession';
import {ExtPromiseWrapper} from './ExtPromiseWrapper';
import {State} from './State';

export class Thread {
    /**
     * @internal
     */
    _runPromise: ExtPromiseWrapper<[string, any]> = new ExtPromiseWrapper();
    /**
     * @internal
     */
    _current: State<BaseSession> = null;
    /**
     * Promise session wrapping active state's `onEntry()` promise, as well as being available
     * to wrap internal steps.
     * @internal
     */
    _activePromise: CancelTokenSession = null;
    
    wrap<T>(promise: Promise<T>, onCancel?: CancelHandler): Promise<T> {
        return this._activePromise.wrap(promise, onCancel);
    }
}

export interface BaseSession {
    /**
     * @internal
     */
    _threads: Map<number, Thread>;
}

export type Session<S> = S & BaseSession;