import {CancelTokenSession} from './internal/CancelTokenSession';
import {ExternalPromise} from './internal/ExternalPromise';
import {CancelHandler, Transition} from './types';
import {State} from './State';

/**
 * A thread of sequential state execution within the StateMachine. All StateMachines
 * will have at least a main thread, and possibly secondary ones as well.
 */
export class Thread {
    /**
     * The promise for the completion of this thread as a whole.
     * @internal
     */
    _runPromise: ExternalPromise<Transition> = new ExternalPromise();
    /**
     * The actively running state.
     * @internal
     */
    _current: State<any> = null;
    /**
     * Promise session wrapping active state's `onEntry()` promise, as well as being available
     * to wrap internal steps.
     * @internal
     */
    _activePromise: CancelTokenSession = null;

    /**
     * Wraps a promise so that it can be safely cancelled.
     * @typeparam T The promise data type.
     * @param promise The promise to wrap.
     * @param onCancel A callback for when (if) the promise is cancelled, to allow for cleanup.
     * @returns The wrapped promise. This return value should be used with await/then()
     * instead of the original promise.
     */
    wrap<T>(promise: Promise<T>, onCancel?: CancelHandler): Promise<T> {
        return this._activePromise.wrap(promise, onCancel);
    }
}