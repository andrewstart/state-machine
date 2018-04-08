import {CancelTokenSession, CancelHandler} from './CancelTokenSession';
import {ExternalPromise} from './ExternalPromise';
import {State} from './State';

export class Thread {
    /**
     * @internal
     */
    _runPromise: ExternalPromise<[string, any]> = new ExternalPromise();
    /**
     * @internal
     */
    _current: State<any> = null;
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